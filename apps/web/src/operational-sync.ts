import { cleanOperationalPayload } from './operational-data-cleanup';

type SessionUser = { id?: string; hotelId?: string; hotel?: { id?: string } };
type Session = { token?: string; accessToken?: string; user?: SessionUser };

type StoreEnvelope<T> = {
  payload: T;
  version: number;
  updatedAt: string;
  connected?: boolean;
  error?: string;
};

type ReadCacheEntry = { at: number; value: StoreEnvelope<unknown> };
const READ_DEDUPE_MS = 1_200;
const readInflight = new Map<string, Promise<StoreEnvelope<unknown>>>();
const readCache = new Map<string, ReadCacheEntry>();

function session(): Session {
  try { return JSON.parse(localStorage.getItem('hospicore.session') || '{}'); }
  catch { return {}; }
}

function hotelIdFromSession(current: Session) {
  return current.user?.hotelId || current.user?.hotel?.id || '';
}

function authToken() {
  const current = session();
  return current.token || current.accessToken || localStorage.getItem('hospicore.token') || localStorage.getItem('hospicore.accessToken') || '';
}

function headers() {
  const token = authToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

function readKey(namespace: string, current: Session) {
  const hotelId = hotelIdFromSession(current);
  const userId = current.user?.id || '';
  return `${hotelId || 'no-hotel'}:${userId || 'no-user'}:${namespace}`;
}

function invalidateNamespace(namespace: string, current: Session) {
  const key = readKey(namespace, current);
  readCache.delete(key);
  readInflight.delete(key);
}

async function fetchSharedData<T>(namespace: string, fallback: T, current: Session): Promise<StoreEnvelope<T>> {
  const hotelId = hotelIdFromSession(current);
  const userId = current.user?.id || '';
  if (!hotelId && !userId) return { payload: cleanOperationalPayload(namespace, fallback), version: 0, updatedAt: '', connected: false, error: 'Session sans hôtel ni utilisateur.' };

  try {
    const params = new URLSearchParams();
    if (hotelId) params.set('hotelId', hotelId);
    if (userId) params.set('userId', userId);
    const response = await fetch(`/api/operational-sync/${encodeURIComponent(namespace)}?${params.toString()}`, { headers: headers(), cache: 'no-store' });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Erreur API ${response.status}`);
    }
    const data = await response.json();
    if (!data) {
      const created = await saveSharedData(namespace, fallback, 0);
      return { ...created, connected: true };
    }
    return { payload: cleanOperationalPayload(namespace, data.payload as T), version: Number(data.version || 0), updatedAt: data.updatedAt || '', connected: true };
  } catch (error) {
    return { payload: cleanOperationalPayload(namespace, fallback), version: 0, updatedAt: '', connected: false, error: error instanceof Error ? error.message : 'Synchronisation indisponible' };
  }
}

export async function loadSharedData<T>(namespace: string, fallback: T): Promise<StoreEnvelope<T>> {
  const current = session();
  const hotelId = hotelIdFromSession(current);
  const userId = current.user?.id || '';
  if (!hotelId && !userId) return { payload: cleanOperationalPayload(namespace, fallback), version: 0, updatedAt: '', connected: false, error: 'Session sans hôtel ni utilisateur.' };

  const key = readKey(namespace, current);
  const cached = readCache.get(key);
  if (cached && Date.now() - cached.at < READ_DEDUPE_MS) return cached.value as StoreEnvelope<T>;

  const existing = readInflight.get(key);
  if (existing) return existing as Promise<StoreEnvelope<T>>;

  const request = fetchSharedData(namespace, fallback, current)
    .then(result => {
      if (result.connected) readCache.set(key, { at: Date.now(), value: result as StoreEnvelope<unknown> });
      return result as StoreEnvelope<unknown>;
    })
    .finally(() => { readInflight.delete(key); });

  readInflight.set(key, request);
  return request as Promise<StoreEnvelope<T>>;
}

export async function saveSharedData<T>(namespace: string, payload: T, expectedVersion?: number): Promise<StoreEnvelope<T>> {
  const current = session();
  const hotelId = hotelIdFromSession(current);
  const userId = current.user?.id || '';
  if (!hotelId && !userId) throw new Error('Hôtel et utilisateur introuvables dans la session.');

  invalidateNamespace(namespace, current);
  const cleanedPayload = cleanOperationalPayload(namespace, payload);
  const response = await fetch(`/api/operational-sync/${encodeURIComponent(namespace)}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ hotelId: hotelId || undefined, payload: cleanedPayload, updatedById: userId || undefined, expectedVersion }),
  });

  const data = await response.json().catch(() => ({}));
  if (response.status === 409) throw new Error('Une autre personne a modifié ces données. Rechargez la page avant de recommencer.');
  if (!response.ok) throw new Error(data.message || `Enregistrement impossible (${response.status}).`);
  const result = { payload: cleanOperationalPayload(namespace, data.payload as T), version: Number(data.version || 0), updatedAt: data.updatedAt || '', connected: true };
  readCache.set(readKey(namespace, current), { at: Date.now(), value: result as StoreEnvelope<unknown> });
  return result;
}
