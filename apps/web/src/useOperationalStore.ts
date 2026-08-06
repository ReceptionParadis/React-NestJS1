import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSharedData, saveSharedData } from './operational-sync';

export type OperationalSyncState = 'loading' | 'synced' | 'saving' | 'error' | 'conflict';

export function useOperationalStore<T>(namespace: string, initialValue: T, refreshMs = 30000) {
  // Keep the fallback stable. Callers commonly pass [] or {} inline, which creates a
  // new reference on every render and previously restarted the synchronization effect.
  const initialValueRef = useRef(initialValue);
  const [data, setData] = useState<T>(() => initialValueRef.current);
  const [version, setVersion] = useState(0);
  const versionRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const [updatedAt, setUpdatedAt] = useState('');
  const [state, setState] = useState<OperationalSyncState>('loading');
  const [message, setMessage] = useState('Connexion à PostgreSQL…');

  const refresh = useCallback(async (silent = false) => {
    if (refreshInFlightRef.current) return false;
    refreshInFlightRef.current = true;

    if (!silent && mountedRef.current) {
      setState('loading');
      setMessage('Synchronisation en cours…');
    }

    try {
      const result = await loadSharedData<T>(namespace, initialValueRef.current);
      if (!mountedRef.current) return false;

      if (!result.connected) {
        setState('error');
        setMessage(result.error || 'Synchronisation PostgreSQL indisponible.');
        return false;
      }

      setData(result.payload);
      setVersion(result.version);
      versionRef.current = result.version;
      setUpdatedAt(result.updatedAt);
      setState('synced');
      setMessage('Données partagées à jour');
      return true;
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [namespace]);

  const save = useCallback(async (next: T) => {
    setState('saving');
    setMessage('Enregistrement partagé…');
    try {
      const result = await saveSharedData<T>(namespace, next, versionRef.current);
      if (!mountedRef.current) return false;
      setData(result.payload);
      setVersion(result.version);
      versionRef.current = result.version;
      setUpdatedAt(result.updatedAt);
      setState('synced');
      setMessage('Enregistré pour tous les services');
      return true;
    } catch (error) {
      if (!mountedRef.current) return false;
      const text = error instanceof Error ? error.message : 'Enregistrement impossible.';
      setState(text.includes('autre personne') ? 'conflict' : 'error');
      setMessage(text);
      return false;
    }
  }, [namespace]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    const timer = window.setInterval(() => void refresh(true), refreshMs);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [refresh, refreshMs]);

  return { data, setData, version, updatedAt, state, message, refresh, save };
}
