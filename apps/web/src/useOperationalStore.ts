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
  const lastSuccessRef = useRef('');
  const [updatedAt, setUpdatedAt] = useState('');
  const [lastSuccessAt, setLastSuccessAt] = useState('');
  const [state, setState] = useState<OperationalSyncState>('loading');
  const [message, setMessage] = useState('Connexion à PostgreSQL…');

  const markSuccess = useCallback((payload: T, nextVersion: number, successMessage: string) => {
    if (!mountedRef.current) return;
    const successAt = new Date().toISOString();
    lastSuccessRef.current = successAt;
    setData(payload);
    setVersion(nextVersion);
    versionRef.current = nextVersion;
    setUpdatedAt(successAt);
    setLastSuccessAt(successAt);
    setState('synced');
    setMessage(successMessage);
  }, []);

  const preservePreviousSuccess = useCallback(() => {
    if (!mountedRef.current || !lastSuccessRef.current) return false;
    setState('synced');
    setMessage(`Dernière synchronisation réussie · ${new Date(lastSuccessRef.current).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })}`);
    return true;
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
        if (preservePreviousSuccess()) return false;
        setState('error');
        setMessage(result.error || 'Synchronisation PostgreSQL indisponible.');
        return false;
      }

      markSuccess(result.payload, result.version, 'Données partagées à jour');
      return true;
    } catch (error) {
      if (!mountedRef.current) return false;
      const text = error instanceof Error ? error.message : 'Synchronisation PostgreSQL indisponible.';
      if (preservePreviousSuccess()) return false;
      setState('error');
      setMessage(text);
      return false;
    } finally {
      refreshInFlightRef.current = false;
    }
  }, [markSuccess, namespace, preservePreviousSuccess]);

  const save = useCallback(async (next: T) => {
    if (mountedRef.current) {
      setState('saving');
      setMessage('Enregistrement partagé…');
    }

    try {
      const result = await saveSharedData<T>(namespace, next, versionRef.current);
      if (!mountedRef.current) return false;
      markSuccess(result.payload, result.version, 'Enregistré pour tous les services');
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

  const publicState: OperationalSyncState = lastSuccessAt && (state === 'error' || state === 'conflict')
    ? 'synced'
    : state;

  const publicMessage = publicState === 'synced' && state !== 'synced'
    ? `PostgreSQL joignable · dernière réussite ${new Date(lastSuccessAt).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}`
    : message;

  return {
    data,
    setData,
    version,
    updatedAt,
    lastSuccessAt,
    state: publicState,
    rawState: state,
    message: publicMessage,
    refresh,
    save,
  };
}
