import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BedDouble, Bell, BookOpenCheck, BriefcaseBusiness, CalendarDays, ChefHat, ChevronRight,
  ClipboardList, ConciergeBell, History, LayoutDashboard, ListTodo, Menu, Package, RefreshCw, Settings,
  Sparkles, UsersRound, UtensilsCrossed, Wrench, X,
} from 'lucide-react';
import { loadSharedData } from './operational-sync';

type Session = { user?: { firstName?: string; lastName?: string; role?: string; hotel?: { name?: string } } };
type Task = { id?: string; title?: string; service?: string; status?: string; priority?: string; dueAt?: string; linkedTo?: string };
type Instruction = { id?: string; title?: string; category?: string; priority?: string; status?: string; dueAt?: string; room?: string };
type OperationsPayload = { loans?: Array<{ status?: string; expectedEndAt?: string }>; equipment?: Array<{ status?: string }> };
type Group = { id?: string; name?: string; pax?: number; arrivalDate?: string; departureDate?: string; arrivalTime?: string; status?: string; dinnerTime?: string };

const nav = [
  { label: 'HospiCore Live', icon: LayoutDashboard, href: '/', active: true },
  { label: 'Groupes 360°', icon: UsersRound, href: '/groupes' },
  { label: 'Tâches', icon: ListTodo, href: '/taches' },
  { label: 'Journal d’exploitation', icon: History, href: '/journal-exploitation' },
  { label: 'Centre des opérations', icon: BookOpenCheck, href: '/centre-operations' },
  { label: 'Consignes générales', icon: ClipboardList, href: '/consignes-generales' },
  { label: 'Réception', icon: ConciergeBell, href: '/reception' },
  { label: 'Restaurant', icon: UtensilsCrossed, href: '/restaurant' },
  { label: 'Housekeeping', icon: BedDouble, href: '/housekeeping' },
  { label: 'Cuisine', icon: ChefHat, href: '/cuisine' },
  { label: 'Commercial', icon: BriefcaseBusiness, href: '/commercial' },
  { label: 'Tickets', icon: Wrench, href: '/tickets' },
  { label: 'Salles de réunion', icon: CalendarDays, href: '/salles-reunion' },
  { label: 'Diagnostic', icon: RefreshCw, href: '/diagnostic' },
  { label: 'Administration', icon: Settings, href: '/administration' },
];

function readSession(): Session {
  try { return JSON.parse(localStorage.getItem('hospicore.session') || '{}'); }
  catch { return {}; }
}

function isToday(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function timeLabel(value?: string) {
  if (!value) return 'À confirmer';
  if (/^\d{1,2}:\d{2}/.test(value)) return value.slice(0, 5).replace(':', 'h');
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
}

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastSync, setLastSync] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [instructions, setInstructions] = useState<Instruction[]>([]);
  const [operations, setOperations] = useState<OperationsPayload>({});
  const [meetingRooms, setMeetingRooms] = useState<unknown[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const session = readSession();
  const userName = `${session.user?.firstName || 'Utilisateur'} ${session.user?.lastName || ''}`.trim();
  const initials = `${session.user?.firstName?.[0] || 'H'}${session.user?.lastName?.[0] || 'C'}`.toUpperCase();
  const navigate = (href: string) => { window.location.href = href; };

  async function refresh() {
    setLoading(true); setError('');
    try {
      const [taskData, instructionData, operationData, roomData, groupResponse] = await Promise.all([
        loadSharedData<Task[]>('tasks', []),
        loadSharedData<Instruction[]>('general-instructions', []),
        loadSharedData<OperationsPayload>('operations-center', { loans: [], equipment: [] }),
        loadSharedData<unknown[]>('meeting-rooms', []),
        fetch('/api/groups', { cache: 'no-store' }).then(async response => response.ok ? response.json() : []),
      ]);
      setTasks(Array.isArray(taskData.payload) ? taskData.payload : []);
      setInstructions(Array.isArray(instructionData.payload) ? instructionData.payload : []);
      setOperations(operationData.payload && typeof operationData.payload === 'object' ? operationData.payload : {});
      setMeetingRooms(Array.isArray(roomData.payload) ? roomData.payload : []);
      setGroups(Array.isArray(groupResponse) ? groupResponse : Array.isArray(groupResponse?.items) ? groupResponse.items : []);
      const timestamps = [taskData.updatedAt, instructionData.updatedAt, operationData.updatedAt, roomData.updatedAt].filter(Boolean).sort();
      setLastSync(timestamps.at(-1) || new Date().toISOString());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Impossible de charger les données opérationnelles.');
    } finally { setLoading(false); }
  }

  useEffect(() => {
    void refresh();
    const clock = window.setInterval(() => setNow(new Date()), 1000);
    const sync = window.setInterval(() => void refresh(), 30000);
    return () => { window.clearInterval(clock); window.clearInterval(sync); };
  }, []);

  const openTasks = tasks.filter(task => task.status !== 'Terminée');
  const criticalTasks = openTasks.filter(task => task.priority === 'Critique' || task.priority === 'Haute');
  const openInstructions = instructions.filter(item => item.status !== 'Terminée' && item.status !== 'Clôturée');
  const activeLoans = (operations.loans || []).filter(loan => loan.status !== 'Restitué');
  const overdueLoans = activeLoans.filter(loan => loan.expectedEndAt && new Date(loan.expectedEndAt) < now);
  const todayArrivals = groups.filter(group => isToday(group.arrivalDate));
  const todayDepartures = groups.filter(group => isToday(group.departureDate));
  const inHouse = groups.filter(group => ['IN_HOUSE', 'En séjour', 'Arrivé'].includes(group.status || ''));

  const alerts = useMemo(() => {
    const rows: Array<{ title: string; detail: string; tone: string; href: string }> = [];
    criticalTasks.slice(0, 3).forEach(task => rows.push({ title: task.title || 'Tâche prioritaire', detail: `${task.service || 'Service'}${task.dueAt ? ` · ${timeLabel(task.dueAt)}` : ''}`, tone: 'critical', href: '/taches' }));
    overdueLoans.slice(0, 2).forEach(() => rows.push({ title: 'Matériel non restitué', detail: 'Retour prévu dépassé', tone: 'critical', href: '/centre-operations' }));
    openInstructions.filter(item => item.priority === 'Critique' || item.priority === 'Haute').slice(0, 2).forEach(item => rows.push({ title: item.title || item.category || 'Consigne prioritaire', detail: item.room ? `Chambre ${item.room}` : 'Consigne générale', tone: 'warning', href: '/consignes-generales' }));
    if (!rows.length) rows.push({ title: 'Aucun point critique', detail: 'Les flux opérationnels sont sous contrôle.', tone: 'success', href: '/diagnostic' });
    return rows.slice(0, 5);
  }, [criticalTasks, overdueLoans, openInstructions]);

  const serviceCards = [
    { name: 'Réception', detail: `${todayArrivals.length} arrivée(s) · ${todayDepartures.length} départ(s)`, href: '/reception', icon: ConciergeBell },
    { name: 'Restaurant', detail: `${todayArrivals.reduce((sum, group) => sum + (group.pax || 0), 0)} couverts groupes attendus`, href: '/restaurant', icon: UtensilsCrossed },
    { name: 'Housekeeping', detail: `${inHouse.length} groupe(s) en séjour`, href: '/housekeeping', icon: BedDouble },
    { name: 'Cuisine', detail: `${todayArrivals.filter(group => group.dinnerTime).length} dîner(s) renseigné(s)`, href: '/cuisine', icon: ChefHat },
    { name: 'Commercial', detail: `${groups.length} dossier(s) groupe`, href: '/commercial', icon: BriefcaseBusiness },
  ];

  return <div className="app-shell executive-shell">
    <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
      <div className="brand"><div className="brand-mark">H</div><div><strong>HospiCore</strong><span>Hôtel Paradis · Lourdes</span></div><button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Fermer"><X size={20}/></button></div>
      <nav className="nav-list">{nav.map(({ label, icon: Icon, href, active }) => <button key={label} className={`nav-item${active ? ' active' : ''}`} onClick={() => navigate(href)}><Icon size={19}/>{label}</button>)}</nav>
      <div className="demo-version"><Sparkles size={16}/><div><strong>HospiCore V2</strong><span>Cockpit opérationnel</span></div></div>
    </aside>

    <main className="live-v2-main">
      <header className="live-v2-topbar">
        <div className="live-v2-title"><button className="live-v2-menu" onClick={() => setSidebarOpen(true)}><Menu size={22}/></button><div><h1>HospiCore Live</h1><p>{session.user?.hotel?.name || 'Hôtel Paradis'} · centre opérationnel</p></div></div>
        <div className="live-v2-user"><div className={`live-v2-sync${loading ? ' loading' : ''}`}><RefreshCw size={15}/>{loading ? 'Synchronisation…' : 'PostgreSQL à jour'}</div><button className="icon-button" onClick={() => navigate('/taches')}><Bell size={19}/>{alerts.length > 0 && <span className="notification-dot">{alerts.length}</span>}</button><div className="live-v2-avatar" title={userName}>{initials}</div></div>
      </header>

      <div className="live-v2-content">
        <section className="live-v2-hero"><div><p>Bonjour {session.user?.firstName || ''}</p><h2>Voici ce qui se passe à l’hôtel.</h2><p>Une vue unique des groupes, tâches, consignes, prêts et activités interservices.</p></div><div className="live-v2-clock"><strong>{now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</strong><span>{now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></div></section>

        {error && <div className="live-v2-error"><AlertTriangle size={17}/> {error}</div>}

        <section className="live-v2-kpis">
          <button className="live-v2-kpi" onClick={() => navigate('/groupes')}><span className="icon"><UsersRound/></span><span>Groupes 360°</span><strong>{groups.length}</strong><small>{todayArrivals.length} arrivée(s) aujourd’hui</small></button>
          <button className="live-v2-kpi" onClick={() => navigate('/taches')}><span className="icon"><ListTodo/></span><span>Tâches ouvertes</span><strong>{openTasks.length}</strong><small>{criticalTasks.length} prioritaire(s)</small></button>
          <button className="live-v2-kpi" onClick={() => navigate('/consignes-generales')}><span className="icon"><ClipboardList/></span><span>Consignes ouvertes</span><strong>{openInstructions.length}</strong><small>Partagées entre les services</small></button>
          <button className="live-v2-kpi" onClick={() => navigate('/centre-operations')}><span className="icon"><Package/></span><span>Prêts en cours</span><strong>{activeLoans.length}</strong><small>{overdueLoans.length} retour(s) dépassé(s)</small></button>
        </section>

        <section className="live-v2-grid">
          <article className="live-v2-panel"><div className="live-v2-panel-head"><div><p>Réception</p><h3>Groupes du jour</h3></div><button className="live-v2-link" onClick={() => navigate('/groupes')}>Tous les groupes</button></div><div className="live-v2-list">{todayArrivals.length ? todayArrivals.slice(0, 5).map((group, index) => <button className="live-v2-row" key={group.id || index} onClick={() => navigate('/groupes')}><time>{timeLabel(group.arrivalTime)}</time><div><strong>{group.name || 'Groupe sans nom'}</strong><small>{group.pax || 0} pax{group.dinnerTime ? ` · dîner ${timeLabel(group.dinnerTime)}` : ''}</small></div><span className={`live-v2-status ${group.status === 'IN_HOUSE' ? 'success' : 'info'}`}>{group.status || 'Prévu'}</span></button>) : <div className="live-v2-alert"><div><strong>Aucune arrivée enregistrée aujourd’hui</strong><small>Ajoutez ou mettez à jour les dossiers groupes.</small></div></div>}</div></article>

          <article className="live-v2-panel"><div className="live-v2-panel-head"><div><p>Priorités</p><h3>Alertes interservices</h3></div><button className="live-v2-link" onClick={() => navigate('/taches')}>Traiter</button></div><div className="live-v2-list">{alerts.map((alert, index) => <button className={`live-v2-alert ${alert.tone}`} key={`${alert.title}-${index}`} onClick={() => navigate(alert.href)}><span className="alert-icon"><AlertTriangle size={18}/></span><div><strong>{alert.title}</strong><small>{alert.detail}</small></div><ChevronRight size={17}/></button>)}</div></article>

          <article className="live-v2-panel wide"><div className="live-v2-panel-head"><div><p>Pilotage</p><h3>État des services</h3></div><button className="live-v2-link" onClick={() => void refresh()}><RefreshCw size={15}/> Actualiser</button></div><div className="live-v2-services">{serviceCards.map(({ name, detail, href, icon: Icon }) => <button className="live-v2-service" key={name} onClick={() => navigate(href)}><Icon size={24}/><strong>{name}</strong><span>{detail}</span><small>Ouvrir le service →</small></button>)}</div></article>

          <article className="live-v2-panel"><div className="live-v2-panel-head"><div><p>Réunions</p><h3>Salles réservées</h3></div><button className="live-v2-link" onClick={() => navigate('/salles-reunion')}>Agenda</button></div><div className="live-v2-kpi" onClick={() => navigate('/salles-reunion')}><span className="icon"><CalendarDays/></span><span>Réservations enregistrées</span><strong>{meetingRooms.length}</strong><small>Agenda partagé PostgreSQL</small></div></article>

          <article className="live-v2-panel"><div className="live-v2-panel-head"><div><p>Système</p><h3>Stabilité HospiCore</h3></div><button className="live-v2-link" onClick={() => navigate('/diagnostic')}>Diagnostic</button></div><div className="live-v2-alert success"><span className="alert-icon"><RefreshCw size={18}/></span><div><strong>Synchronisation opérationnelle</strong><small>Dernière mise à jour : {lastSync ? new Date(lastSync).toLocaleString('fr-FR') : 'en cours'}</small></div></div></article>
        </section>

        <footer className="live-v2-footer"><span>Connecté en tant que <strong>{userName}</strong> · {session.user?.role || 'Collaborateur'}</span><span>Actualisation automatique toutes les 30 secondes</span></footer>
      </div>
    </main>
  </div>;
}
