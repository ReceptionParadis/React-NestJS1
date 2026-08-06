type SessionUser = { id?: string; hotelId?: string; hotel?: { id?: string } };
type Session = { token?: string; accessToken?: string; user?: SessionUser };

type StoreEnvelope<T> = {
  payload: T;
  version: number;
  updatedAt: string;
  connected?: boolean;
  error?: string;
};

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

export async function loadSharedData<T>(namespace: string, fallback: T): Promise<StoreEnvelope<T>> {
  const current = session();
  const hotelId = hotelIdFromSession(current);
  const userId = current.user?.id || '';
  if (!hotelId && !userId) return { payload: fallback, version: 0, updatedAt: '', connected: false, error: 'Session sans hôtel ni utilisateur.' };

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
    return { payload: data.payload as T, version: Number(data.version || 0), updatedAt: data.updatedAt || '', connected: true };
  } catch (error) {
    return { payload: fallback, version: 0, updatedAt: '', connected: false, error: error instanceof Error ? error.message : 'Synchronisation indisponible' };
  }
}

export async function saveSharedData<T>(namespace: string, payload: T, expectedVersion?: number): Promise<StoreEnvelope<T>> {
  const current = session();
  const hotelId = hotelIdFromSession(current);
  const userId = current.user?.id || '';
  if (!hotelId && !userId) throw new Error('Hôtel et utilisateur introuvables dans la session.');

  const response = await fetch(`/api/operational-sync/${encodeURIComponent(namespace)}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify({ hotelId: hotelId || undefined, payload, updatedById: userId || undefined, expectedVersion }),
  });

  const data = await response.json().catch(() => ({}));
  if (response.status === 409) throw new Error('Une autre personne a modifié ces données. Rechargez la page avant de recommencer.');
  if (!response.ok) throw new Error(data.message || `Enregistrement impossible (${response.status}).`);
  return { payload: data.payload as T, version: Number(data.version || 0), updatedAt: data.updatedAt || '', connected: true };
}
