type SessionUser = { id?: string; hotelId?: string; hotel?: { id?: string } };
type Session = { token?: string; user?: SessionUser };

type StoreEnvelope<T> = {
  payload: T;
  version: number;
  updatedAt: string;
};

function session(): Session {
  try { return JSON.parse(localStorage.getItem('hospicore.session') || '{}'); }
  catch { return {}; }
}

function hotelIdFromSession(current: Session) {
  return current.user?.hotelId || current.user?.hotel?.id || '';
}

function requestHeaders() {
  const token = session().token || localStorage.getItem('hospicore.token') || '';
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function writeSharedData<T>(namespace: string, payload: T, expectedVersion?: number): Promise<StoreEnvelope<T>> {
  const current = session();
  const hotelId = hotelIdFromSession(current);
  if (!hotelId) throw new Error('Hôtel introuvable dans la session.');

  const response = await fetch(`/api/operational-sync/${encodeURIComponent(namespace)}`, {
    method: 'PUT',
    headers: requestHeaders(),
    body: JSON.stringify({ hotelId, payload, updatedById: current.user?.id, expectedVersion }),
  });

  const data = await response.json();
  if (response.status === 409) throw new Error('Une autre personne a modifié ces données. Rechargez la page avant de recommencer.');
  if (!response.ok) throw new Error(data.message || 'Enregistrement impossible.');
  return { payload: data.payload as T, version: data.version, updatedAt: data.updatedAt };
}

export async function loadSharedData<T>(namespace: string, fallback: T): Promise<StoreEnvelope<T>> {
  const current = session();
  const hotelId = hotelIdFromSession(current);
  if (!hotelId) return { payload: fallback, version: 0, updatedAt: '' };

  try {
    const response = await fetch(`/api/operational-sync/${encodeURIComponent(namespace)}?hotelId=${encodeURIComponent(hotelId)}`, {
      headers: requestHeaders(),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Synchronisation indisponible');

    const data = await response.json();
    if (data) return { payload: data.payload as T, version: data.version, updatedAt: data.updatedAt };

    // Première ouverture du module : crée automatiquement son espace PostgreSQL partagé.
    return await writeSharedData(namespace, fallback, 0);
  } catch {
    return { payload: fallback, version: 0, updatedAt: '' };
  }
}

export async function saveSharedData<T>(namespace: string, payload: T, expectedVersion?: number): Promise<StoreEnvelope<T>> {
  return writeSharedData(namespace, payload, expectedVersion);
}
