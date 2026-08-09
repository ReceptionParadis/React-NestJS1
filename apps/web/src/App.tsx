import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  UsersRound,
  Wrench,
  X,
} from 'lucide-react';

type Metric = {
  label: string;
  value: string;
  detail: string;
  trend: string;
};

type Transmission = {
  time: string;
  author: string;
  text: string;
  priority: 'normal' | 'high';
};

const metrics: Metric[] = [
  { label: 'Occupation', value: '91 %', detail: '586 clients présents', trend: '+6 % vs hier' },
  { label: 'Arrivées', value: '154', detail: '11 groupes attendus', trend: '42 chambres prêtes' },
  { label: 'Départs', value: '137', detail: '26 départs avant 08h00', trend: '12 late check-out' },
  { label: 'Tickets ouverts', value: '19', detail: '2 urgences', trend: '7 résolus aujourd’hui' },
];

const initialTransmissions: Transmission[] = [
  { time: '08:12', author: 'Gabriel', text: 'Le groupe ORP arrivera finalement à 18h30.', priority: 'normal' },
  { time: '09:04', author: 'Paola', text: 'La chambre 214 est prête et contrôlée.', priority: 'normal' },
  { time: '09:46', author: 'Thomas', text: 'Paiement Joe Walsh toujours en attente.', priority: 'high' },
];

const alerts = [
  { level: 'critical', title: 'Climatisation chambre 412', owner: 'Maintenance', due: 'Depuis 45 min' },
  { level: 'warning', title: 'Rooming list ORP manquante', owner: 'Réception', due: 'Avant 14h00' },
  { level: 'info', title: 'Contrôle incendie demain à 10h00', owner: 'Direction', due: 'Demain' },
];

const groups = [
  { name: 'Tangney', arrival: '16h00', pax: 48, status: 'Prêt', tone: 'success' },
  { name: 'ORP', arrival: '18h30', pax: 62, status: 'À vérifier', tone: 'warning' },
  { name: 'Joe Walsh', arrival: '20h15', pax: 31, status: 'Paiement', tone: 'danger' },
];

const dayEvents = [
  { time: '11h00', label: 'Appeler les chefs de groupe', done: true },
  { time: '14h00', label: 'Comptage caisse Réception + Bar', done: false },
  { time: '16h00', label: 'Ouverture du dispositif arrivées', done: false },
  { time: '19h00', label: 'Début du service dîner', done: false },
];

const nav = [
  { label: 'Tableau de bord', icon: LayoutDashboard, active: true },
  { label: 'Main courante', icon: MessageSquareText },
  { label: 'Tickets', icon: ClipboardList },
  { label: 'Chambres', icon: BedDouble },
  { label: 'Groupes', icon: UsersRound },
  { label: 'Maintenance', icon: Wrench },
  { label: 'Planning', icon: CalendarDays },
];

export function App() {
  const [search, setSearch] = useState('');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isNoteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [transmissions, setTransmissions] = useState(initialTransmissions);

  const filteredTransmissions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return transmissions;
    return transmissions.filter((item) => `${item.author} ${item.text}`.toLowerCase().includes(query));
  }, [search, transmissions]);

  function addNote() {
    const text = noteText.trim();
    if (!text) return;

    setTransmissions((current) => [
      { time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), author: 'Thomas', text, priority: 'normal' },
      ...current,
    ]);
    setNoteText('');
    setNoteOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar${isSidebarOpen ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">H</div>
          <div>
            <strong>HospiCore</strong>
            <span>Hôtel Paradis</span>
          </div>
          <button className="sidebar-close" type="button" aria-label="Fermer le menu" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="nav-list" aria-label="Navigation principale">
          {nav.map(({ label, icon: Icon, active }) => (
            <button className={`nav-item${active ? ' active' : ''}`} key={label} type="button">
              <Icon size={19} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </nav>

        <button className="nav-item settings" type="button">
          <Settings size={19} strokeWidth={1.8} />
          Paramètres
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="heading-wrap">
            <button className="mobile-menu" type="button" aria-label="Ouvrir le menu" onClick={() => setSidebarOpen(true)}>
              <Menu size={22} />
            </button>
            <div>
              <p className="eyebrow">Mardi 4 août 2026</p>
              <h1>Bonjour Thomas 👋</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={18} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une note…" />
            </label>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={20} />
              <span className="notification-dot" style={{ top: '-8px', right: '-8px' }}>3</span>
            </button>
            <div className="avatar">TP</div>
          </div>
        </header>

        <section className="briefing-card">
          <div>
            <p className="eyebrow light">Briefing opérationnel</p>
            <h2>La journée sera dense entre 16h00 et 19h00.</h2>
            <p>Trois groupes arrivent sur une période courte. Priorité au contrôle des chambres ORP et au suivi du paiement Joe Walsh.</p>
          </div>
          <div className="briefing-meta">
            <span><AlertTriangle size={17} /> 2 actions critiques</span>
            <span><Clock3 size={17} /> Pic prévu à 17h45</span>
          </div>
        </section>

        <section className="metrics-grid" aria-label="Indicateurs du jour">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
              <em>{metric.trend}</em>
            </article>
          ))}
        </section>

        <section className="content-grid">
          <article className="panel transmissions-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Communication</p>
                <h2>Main courante</h2>
              </div>
              <button className="primary-button" type="button" onClick={() => setNoteOpen(true)}>
                <Plus size={17} /> Nouvelle note
              </button>
            </div>

            <div className="timeline">
              {filteredTransmissions.length === 0 ? (
                <p className="empty-state">Aucune transmission ne correspond à votre recherche.</p>
              ) : filteredTransmissions.map((item) => (
                <div className={`timeline-item${item.priority === 'high' ? ' high' : ''}`} key={`${item.time}-${item.author}-${item.text}`}>
                  <div className="timeline-time">{item.time}</div>
                  <div className="timeline-dot" />
                  <div>
                    <strong>{item.author}</strong>
                    <p>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Priorités</p>
                <h2>Alertes</h2>
              </div>
              <span className="count-badge">3</span>
            </div>

            <div className="alert-list">
              {alerts.map((alert) => (
                <button className="alert-row" key={alert.title} type="button">
                  <span className={`status-dot ${alert.level}`} />
                  <div>
                    <strong>{alert.title}</strong>
                    <small>{alert.owner} · {alert.due}</small>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="panel schedule-panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Organisation</p>
                <h2>Déroulé de la journée</h2>
              </div>
            </div>
            <div className="schedule-list">
              {dayEvents.map((event) => (
                <div className="schedule-row" key={event.time}>
                  {event.done ? <CheckCircle2 className="done-icon" size={19} /> : <span className="schedule-circle" />}
                  <strong>{event.time}</strong>
                  <span>{event.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="panel wide-panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Aujourd’hui</p>
                <h2>Groupes attendus</h2>
              </div>
              <button className="text-button" type="button">Voir tous</button>
            </div>
            <div className="group-table" role="table" aria-label="Groupes attendus">
              <div className="table-row table-head" role="row">
                <span>Groupe</span><span>Arrivée</span><span>Pax</span><span>Statut</span>
              </div>
              {groups.map((group) => (
                <button className="table-row group-row" role="row" type="button" key={group.name}>
                  <strong>{group.name}</strong><span>{group.arrival}</span><span>{group.pax}</span><span className={`pill ${group.tone}`}>{group.status}</span>
                </button>
              ))}
            </div>
          </article>
        </section>
      </main>

      {isNoteOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setNoteOpen(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="new-note-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Main courante</p>
                <h2 id="new-note-title">Nouvelle transmission</h2>
              </div>
              <button className="icon-button" type="button" aria-label="Fermer" onClick={() => setNoteOpen(false)}><X size={19} /></button>
            </div>
            <label className="field-label" htmlFor="note">Information à transmettre</label>
            <textarea id="note" autoFocus value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Ex. Le groupe ORP arrivera à 18h30…" />
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setNoteOpen(false)}>Annuler</button>
              <button className="primary-button" type="button" onClick={addNote}>Publier la note</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
