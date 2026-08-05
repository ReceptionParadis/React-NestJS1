import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, CheckCircle2, Database, RefreshCw, Server, ShieldCheck, TriangleAlert, UserRound, XCircle } from 'lucide-react';

type SessionUser = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  hotelId?: string;
  hotel?: { id?: string; name?: string };
};
type Session = { token?: string; user?: SessionUser };
type Namespace = { namespace: string; version: number; updatedAt: string; updatedById?: string };
type DiagnosticResponse = {
  status: string;
  checkedAt: string;
  responseTimeMs: number;
  database: { connected: boolean; serverTime?: string };
  hotel?: { id: string; name: string; slug: string } | null;
  user?: { id: string; firstName: string; lastName: string; email: string; hotelId: string; role: { name: string } } | null;
  operationalStore: { available: boolean; namespaces: Namespace[] };
};

type CheckState = 'ok' | 'warning' | 'error' | 'loading';

function readSession(): Session {
  try { return JSON.parse(localStorage.getItem('hospicore.session') || '{}'); }
  catch { return {}; }
}

function StatusIcon({ state }: { state: CheckState }) {
  if (state === 'ok') return <CheckCircle2 className="diag-ok" />;
  if (state === 'warning') return <TriangleAlert className="diag-warning" />;
  if (state === 'error') return <XCircle className="diag-error" />;
  return <RefreshCw className="diag-loading" />;
}

export function DiagnosticPage() {
  const [data, setData] = useState<DiagnosticResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [httpStatus, setHttpStatus] = useState<number | null>(null);
  const [requestedUrl, setRequestedUrl] = useState('');
  const session = useMemo(readSession, []);
  const user = session.user;
  const hotelId = user?.hotelId || user?.hotel?.id || '';
  const tokenPresent = Boolean(session.token || localStorage.getItem('hospicore.token'));

  async function runDiagnostic() {
    setLoading(true);
    setError('');
    setData(null);
    const params = new URLSearchParams();
    if (hotelId) params.set('hotelId', hotelId);
    if (user?.id) params.set('userId', user.id);
    const url = `/api/operational-sync/diagnostic/status?${params.toString()}`;
    setRequestedUrl(url);
    const startedAt = performance.now();
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        headers: tokenPresent ? { Authorization: `Bearer ${session.token || localStorage.getItem('hospicore.token')}` } : {},
      });
      setHttpStatus(response.status);
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ? JSON.stringify(body.message) : `Erreur HTTP ${response.status}`);
      setData({ ...body, responseTimeMs: Math.round(performance.now() - startedAt) });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void runDiagnostic(); }, []);

  const namespaceMap = new Map((data?.operationalStore.namespaces || []).map((entry) => [entry.namespace, entry]));
  const expectedNamespaces = ['tasks', 'general-instructions', 'operations-center', 'function-sheets', 'meeting-rooms'];

  return <main className="diagnostic-page">
    <header className="diagnostic-header">
      <div>
        <button onClick={() => { window.location.href = '/administration'; }}><ArrowLeft size={18}/> Administration</button>
        <p>HospiCore · Supervision technique</p>
        <h1>Diagnostic système</h1>
        <span>Contrôle en temps réel de la session, de l’API, de PostgreSQL et des espaces partagés.</span>
      </div>
      <button className="diagnostic-refresh" onClick={() => void runDiagnostic()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={18}/> Relancer les tests</button>
    </header>

    <section className="diagnostic-summary">
      <article><StatusIcon state={user?.id ? 'ok' : 'error'}/><div><span>Session utilisateur</span><strong>{user?.id ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Utilisateur absent'}</strong><small>{user?.id || 'Aucun ID utilisateur dans la session'}</small></div></article>
      <article><StatusIcon state={tokenPresent ? 'ok' : 'error'}/><div><span>Jeton de connexion</span><strong>{tokenPresent ? 'Présent' : 'Absent'}</strong><small>{user?.role || 'Rôle non renseigné'}</small></div></article>
      <article><StatusIcon state={hotelId || data?.hotel?.id ? 'ok' : 'warning'}/><div><span>Hôtel détecté</span><strong>{data?.hotel?.name || user?.hotel?.name || (hotelId ? 'Identifiant présent' : 'Non détecté')}</strong><small>{data?.hotel?.id || hotelId || 'Résolution par l’API nécessaire'}</small></div></article>
      <article><StatusIcon state={loading ? 'loading' : data ? 'ok' : 'error'}/><div><span>API HospiCore</span><strong>{loading ? 'Test en cours…' : data ? 'Connectée' : 'Erreur'}</strong><small>{httpStatus ? `HTTP ${httpStatus}` : requestedUrl || 'Aucun appel effectué'}</small></div></article>
      <article><StatusIcon state={loading ? 'loading' : data?.database.connected ? 'ok' : 'error'}/><div><span>PostgreSQL</span><strong>{data?.database.connected ? 'Connecté' : loading ? 'Test en cours…' : 'Non confirmé'}</strong><small>{data?.database.serverTime ? `Heure serveur : ${new Date(data.database.serverTime).toLocaleString('fr-FR')}` : 'Aucune heure serveur reçue'}</small></div></article>
      <article><StatusIcon state={loading ? 'loading' : data?.operationalStore.available ? 'ok' : 'error'}/><div><span>OperationalStore</span><strong>{data?.operationalStore.available ? 'Table disponible' : loading ? 'Test en cours…' : 'Non disponible'}</strong><small>{data ? `${data.operationalStore.namespaces.length} espace(s) enregistré(s)` : 'Aucune donnée'}</small></div></article>
    </section>

    {error && <section className="diagnostic-error"><TriangleAlert/><div><strong>Échec du diagnostic</strong><p>{error}</p><small>URL testée : {requestedUrl || 'non définie'} · Statut HTTP : {httpStatus ?? 'aucun'}</small></div></section>}

    <section className="diagnostic-grid">
      <article className="diagnostic-panel">
        <header><UserRound/><div><h2>Session enregistrée</h2><p>Données réellement présentes dans ce navigateur.</p></div></header>
        <dl>
          <div><dt>ID utilisateur</dt><dd>{user?.id || 'Absent'}</dd></div>
          <div><dt>E-mail</dt><dd>{user?.email || 'Absent'}</dd></div>
          <div><dt>Rôle</dt><dd>{user?.role || 'Absent'}</dd></div>
          <div><dt>hotelId direct</dt><dd>{user?.hotelId || 'Absent'}</dd></div>
          <div><dt>user.hotel.id</dt><dd>{user?.hotel?.id || 'Absent'}</dd></div>
          <div><dt>Jeton</dt><dd>{tokenPresent ? 'Présent' : 'Absent'}</dd></div>
        </dl>
      </article>

      <article className="diagnostic-panel">
        <header><Server/><div><h2>Réponse API</h2><p>Résultat du dernier appel de diagnostic.</p></div></header>
        <dl>
          <div><dt>État</dt><dd>{data?.status || (loading ? 'Test en cours' : 'Échec')}</dd></div>
          <div><dt>Temps de réponse</dt><dd>{data ? `${data.responseTimeMs} ms` : '—'}</dd></div>
          <div><dt>Test effectué</dt><dd>{data?.checkedAt ? new Date(data.checkedAt).toLocaleString('fr-FR') : '—'}</dd></div>
          <div><dt>Hôtel API</dt><dd>{data?.hotel ? `${data.hotel.name} (${data.hotel.id})` : 'Non retourné'}</dd></div>
          <div><dt>Utilisateur API</dt><dd>{data?.user ? `${data.user.firstName} ${data.user.lastName}` : 'Non retourné'}</dd></div>
          <div><dt>URL</dt><dd className="diag-code">{requestedUrl || '—'}</dd></div>
        </dl>
      </article>
    </section>

    <section className="diagnostic-panel diagnostic-namespaces">
      <header><Database/><div><h2>Espaces de synchronisation</h2><p>Présence et version des modules collaboratifs dans PostgreSQL.</p></div></header>
      <div className="diagnostic-table">
        {expectedNamespaces.map((namespace) => {
          const entry = namespaceMap.get(namespace);
          return <div className="diagnostic-row" key={namespace}>
            <StatusIcon state={entry ? 'ok' : data ? 'warning' : 'loading'}/>
            <strong>{namespace}</strong>
            <span>{entry ? `Version ${entry.version}` : 'Pas encore initialisé'}</span>
            <small>{entry ? new Date(entry.updatedAt).toLocaleString('fr-FR') : 'Créé lors du premier enregistrement'}</small>
          </div>;
        })}
      </div>
    </section>

    <section className="diagnostic-footer">
      <Activity/><div><strong>Lecture du résultat</strong><p>Vert : opérationnel. Orange : composant disponible mais espace pas encore initialisé. Rouge : erreur réelle nécessitant une correction.</p></div>
      {data && <ShieldCheck className="diag-ok"/>}
    </section>
  </main>;
}
