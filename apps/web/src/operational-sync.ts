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
const REQUEST_TIMEOUT_MS = 8_000;
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
  const userId = current.user?.id || '';
  return `shared-hotel:${userId || 'no-user'}:${namespace}`;
}

function invalidateNamespace(namespace: string, current: Session) {
  const key = readKey(namespace, current);
  readCache.delete(key);
  readInflight.delete(key);
}

function signature(value: unknown) {
  try { return JSON.stringify(value); }
  catch { return String(value); }
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchSharedData<T>(namespace: string, fallback: T, current: Session): Promise<StoreEnvelope<T>> {
  const userId = current.user?.id || '';
  const fallbackHotelId = hotelIdFromSession(current);
  if (!userId && !fallbackHotelId) return { payload: cleanOperationalPayload(namespace, fallback), version: 0, updatedAt: '', connected: false, error: 'Session sans hôtel ni utilisateur.' };

  try {
    const params = new URLSearchParams();
    if (userId) params.set('userId', userId);
    else if (fallbackHotelId) params.set('hotelId', fallbackHotelId);
    // Le timestamp interdit aussi tout cache intermédiaire hors de React.
    params.set('_fresh', String(Date.now()));
    const response = await fetchWithTimeout(`/api/operational-sync/${encodeURIComponent(namespace)}?${params.toString()}`, {
      headers: { ...headers(), 'Cache-Control': 'no-cache' },
      cache: 'no-store',
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Erreur API ${response.status}`);
    }
    const data = await response.json();
    if (!data) {
      return { payload: cleanOperationalPayload(namespace, fallback), version: 0, updatedAt: '', connected: false, error: `Store ${namespace} introuvable côté serveur.` };
    }
    return { payload: cleanOperationalPayload(namespace, data.payload as T), version: Number(data.version || 0), updatedAt: data.updatedAt || '', connected: true };
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === 'AbortError';
    return { payload: cleanOperationalPayload(namespace, fallback), version: 0, updatedAt: '', connected: false, error: timedOut ? 'PostgreSQL répond trop lentement. Les écrans restent utilisables.' : error instanceof Error ? error.message : 'Synchronisation indisponible' };
  }
}

export async function loadSharedDataFresh<T>(namespace: string, fallback: T): Promise<StoreEnvelope<T>> {
  const current = session();
  invalidateNamespace(namespace, current);
  const result = await fetchSharedData(namespace, fallback, current);
  if (result.connected) readCache.set(readKey(namespace, current), { at: Date.now(), value: result as StoreEnvelope<unknown> });
  return result;
}

export async function loadSharedData<T>(namespace: string, fallback: T): Promise<StoreEnvelope<T>> {
  const current = session();
  const userId = current.user?.id || '';
  const fallbackHotelId = hotelIdFromSession(current);
  if (!userId && !fallbackHotelId) return { payload: cleanOperationalPayload(namespace, fallback), version: 0, updatedAt: '', connected: false, error: 'Session sans hôtel ni utilisateur.' };

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
  const userId = current.user?.id || '';
  const fallbackHotelId = hotelIdFromSession(current);
  if (!userId && !fallbackHotelId) throw new Error('Hôtel et utilisateur introuvables dans la session.');

  invalidateNamespace(namespace, current);
  const cleanedPayload = cleanOperationalPayload(namespace, payload);
  let response: Response;
  try {
    response = await fetchWithTimeout(`/api/operational-sync/${encodeURIComponent(namespace)}`, {
      method: 'POST',
      headers: { ...headers(), 'Cache-Control': 'no-cache' },
      cache: 'no-store',
      body: JSON.stringify({
        ...(userId ? { updatedById: userId } : { hotelId: fallbackHotelId || undefined }),
        payload: cleanedPayload,
        expectedVersion,
      }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('Enregistrement trop lent. Réessayez sans recharger la page.');
    throw error;
  }

  const data = await response.json().catch(() => ({}));
  if (response.status === 409) throw new Error('Une autre personne a modifié ces données. Rechargez la page avant de recommencer.');
  if (!response.ok) throw new Error(data.message || `Enregistrement impossible (${response.status}).`);

  const returnedPayload = cleanOperationalPayload(namespace, data.payload as T);
  const returnedVersion = Number(data.version || 0);
  if (signature(returnedPayload) !== signature(cleanedPayload)) {
    throw new Error('Le serveur n’a pas confirmé exactement les données envoyées. La sauvegarde est refusée pour éviter une perte.');
  }

  // Vérification durable : un second GET réseau doit retrouver exactement ce qui
  // vient d'être écrit. Aucun cache React ou HTTP n'est accepté pour cette étape.
  const verified = await loadSharedDataFresh<T>(namespace, cleanedPayload);
  if (!verified.connected) throw new Error(verified.error || 'Impossible de vérifier la sauvegarde dans PostgreSQL.');
  if (signature(verified.payload) !== signature(cleanedPayload)) {
    throw new Error('Échec de vérification PostgreSQL : les données relues diffèrent de la saisie. Ne rechargez pas la page et réessayez.');
  }
  if (returnedVersion > 0 && verified.version < returnedVersion) {
    throw new Error('Échec de vérification PostgreSQL : version serveur incohérente.');
  }

  const result = { payload: verified.payload, version: verified.version, updatedAt: verified.updatedAt || data.updatedAt || '', connected: true };
  readCache.set(readKey(namespace, current), { at: Date.now(), value: result as StoreEnvelope<unknown> });
  return result;
}
