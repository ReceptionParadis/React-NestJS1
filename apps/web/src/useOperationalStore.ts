import { useCallback, useEffect, useRef, useState } from 'react';
import { loadSharedData, saveSharedData } from './operational-sync';

export type OperationalSyncState = 'loading' | 'synced' | 'saving' | 'error' | 'conflict';

export function useOperationalStore<T>(namespace: string, initialValue: T, refreshMs = 30000) {
  const initialValueRef = useRef(initialValue);
  const [data, setData] = useState<T>(() => initialValueRef.current);
  const dataRef = useRef<T>(initialValueRef.current);
  const [version, setVersion] = useState(0);
  const versionRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const saveQueueRef = useRef<Promise<boolean>>(Promise.resolve(true));
  const mountedRef = useRef(true);
  const [updatedAt, setUpdatedAt] = useState('');
  const [state, setState] = useState<OperationalSyncState>('loading');
  const [message, setMessage] = useState('Connexion à PostgreSQL…');

  const applyResult = useCallback((payload: T, nextVersion: number, nextUpdatedAt: string) => {
    if (!mountedRef.current) return;
    dataRef.current = payload;
    setData(payload);
    versionRef.current = nextVersion;
    setVersion(nextVersion);
    setUpdatedAt(nextUpdatedAt);
    setState('synced');
    setMessage('Données partagées à jour');
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

      applyResult(result.payload, result.version, result.updatedAt);
      return true;
    } catch (error) {
      if (!mountedRef.current) return false;
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Synchronisation PostgreSQL indisponible.');
      return false;
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [applyResult, namespace]);

  const executeSave = useCallback(async (next: T) => {
    if (mountedRef.current) {
      setState('saving');
      setMessage('Enregistrement partagé…');
    }

    try {
      const result = await saveSharedData<T>(namespace, next, versionRef.current);
      if (!mountedRef.current) return false;
      applyResult(result.payload, result.version, result.updatedAt);
      setMessage('Enregistré dans PostgreSQL');
      return true;
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Enregistrement impossible.';
      const conflict = text.toLowerCase().includes('autre personne') || text.toLowerCase().includes('conflit') || text.includes('409');

      if (conflict) {
        if (mountedRef.current) {
          setState('conflict');
          setMessage('Conflit détecté, resynchronisation automatique…');
        }

        try {
          const latest = await loadSharedData<T>(namespace, initialValueRef.current);
          if (!latest.connected) throw new Error(latest.error || 'Resynchronisation impossible.');
          versionRef.current = latest.version;
          const retry = await saveSharedData<T>(namespace, next, latest.version);
          if (!mountedRef.current) return false;
          applyResult(retry.payload, retry.version, retry.updatedAt);
          setMessage('Conflit résolu · données enregistrées');
          return true;
        } catch (retryError) {
          if (!mountedRef.current) return false;
          setState('conflict');
          setMessage(retryError instanceof Error ? retryError.message : 'Conflit non résolu. Rechargez les données.');
          return false;
        }
      }

      if (!mountedRef.current) return false;
      setState('error');
      setMessage(text);
      return false;
    }
  }, [applyResult, namespace]);

  const save = useCallback((next: T) => {
    dataRef.current = next;
    const queued = saveQueueRef.current.then(() => executeSave(next), () => executeSave(next));
    saveQueueRef.current = queued;
    return queued;
  }, [executeSave]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    const timer = window.setInterval(() => {
      if (state !== 'saving') void refresh(true);
    }, refreshMs);
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
    };
  }, [refresh, refreshMs, state]);

  return { data, setData, version, updatedAt, state, message, refresh, save };
}
