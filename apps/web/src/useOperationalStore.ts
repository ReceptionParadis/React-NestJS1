import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSharedData, saveSharedData } from './operational-sync';

export type OperationalSyncState = 'loading' | 'synced' | 'saving' | 'error' | 'conflict';

export function useOperationalStore<T>(namespace: string, initialValue: T, refreshMs = 30000) {
  const initialValueRef = useRef(initialValue);
  const [data, setData] = useState<T>(() => initialValueRef.current);
  const [version, setVersion] = useState(0);
  const versionRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const mountedRef = useRef(true);
  const [updatedAt, setUpdatedAt] = useState('');
  const [lastSuccessAt, setLastSuccessAt] = useState('');
  const [state, setState] = useState<OperationalSyncState>('loading');
  const [message, setMessage] = useState('Connexion à PostgreSQL…');

  const markSuccess = useCallback((payload: T, nextVersion: number, nextUpdatedAt: string, successMessage: string) => {
    if (!mountedRef.current) return;
    setData(payload);
    setVersion(nextVersion);
    versionRef.current = nextVersion;
    setUpdatedAt(nextUpdatedAt || '');
    setLastSuccessAt(new Date().toISOString());
    setState('synced');
    setMessage(successMessage);
  }, []);

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

      markSuccess(result.payload, result.version, result.updatedAt, 'Données partagées à jour');
      return true;
    } catch (error) {
      if (!mountedRef.current) return false;
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Synchronisation PostgreSQL indisponible.');
      return false;
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [markSuccess, namespace]);

  const save = useCallback(async (next: T) => {
    if (mountedRef.current) {
      setState('saving');
      setMessage('Enregistrement partagé…');
    }

    try {
      const result = await saveSharedData<T>(namespace, next, versionRef.current);
      if (!mountedRef.current) return false;
      markSuccess(result.payload, result.version, result.updatedAt, 'Enregistré pour tous les services');
      return true;
    } catch (error) {
      if (!mountedRef.current) return false;
      const text = error instanceof Error ? error.message : 'Enregistrement impossible.';
      setState(text.includes('autre personne') ? 'conflict' : 'error');
      setMessage(text);
      return false;
    }
  }, [markSuccess, namespace]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    const timer = window.setInterval(() => void refresh(true), refreshMs);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [refresh, refreshMs]);

  return { data, setData, version, updatedAt, lastSuccessAt, state, message, refresh, save };
}
