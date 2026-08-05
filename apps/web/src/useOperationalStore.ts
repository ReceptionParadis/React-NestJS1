import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSharedData, saveSharedData } from './operational-sync';

export type OperationalSyncState = 'loading' | 'synced' | 'saving' | 'error' | 'conflict';

export function useOperationalStore<T>(namespace: string, initialValue: T, refreshMs = 30000) {
  const [data, setData] = useState<T>(initialValue);
  const [version, setVersion] = useState(0);
  const versionRef = useRef(0);
  const [updatedAt, setUpdatedAt] = useState('');
  const [state, setState] = useState<OperationalSyncState>('loading');
  const [message, setMessage] = useState('Connexion à PostgreSQL…');

  const refresh = useCallback(async (silent = false) => {
    if (!silent) {
      setState('loading');
      setMessage('Synchronisation en cours…');
    }
    const result = await loadSharedData<T>(namespace, initialValue);
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
  }, [initialValue, namespace]);

  const save = useCallback(async (next: T) => {
    setState('saving');
    setMessage('Enregistrement partagé…');
    try {
      const result = await saveSharedData<T>(namespace, next, versionRef.current);
      setData(result.payload);
      setVersion(result.version);
      versionRef.current = result.version;
      setUpdatedAt(result.updatedAt);
      setState('synced');
      setMessage('Enregistré pour tous les services');
      return true;
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Enregistrement impossible.';
      setState(text.includes('autre personne') ? 'conflict' : 'error');
      setMessage(text);
      return false;
    }
  }, [namespace]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), refreshMs);
    return () => window.clearInterval(timer);
  }, [refresh, refreshMs]);

  return { data, setData, version, updatedAt, state, message, refresh, save };
}
