import { useMemo, useState } from 'react';
import {
  Bell,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  MessageSquareText,
  Plus,
  Search,
  Settings,
  Sparkles,
  UsersRound,
  Wrench,
  X,
} from 'lucide-react';

type Priority = 'critical' | 'warning' | 'info';
type ShiftFilter = 'all' | 'reception' | 'maintenance';

type AlertItem = {
  id: number;
  level: Priority;
  title: string;
  owner: string;
  resolved: boolean;
};

const metrics = [
  { label: 'Occupation', value: '91 %', detail: '586 clients présents', trend: '+4 % vs hier' },
  { label: 'Arrivées', value: '154', detail: '11 groupes attendus', trend: 'Pic prévu à 16h30' },
  { label: 'Départs', value: '137', detail: '26 avant 08h00', trend: '8 late check-out' },
  { label: 'Chambres prêtes', value: '287', detail: '15 restent à contrôler', trend: '95 % terminées' },
];

const transmissions = [
  { id: 1, time: '08:12', author: 'Gabriel', service: 'reception', text: 'Le groupe ORP arrivera finalement à 18h30.' },
  { id: 2, time: '09:04', author: 'Paola', service: 'reception', text: 'La chambre 214 est prête et contrôlée.' },
  { id: 3, time: '09:46', author: 'Thomas', service: 'reception', text: 'Paiement Joe Walsh toujours en attente.' },
  { id: 4, time: '10:15', author: 'José', service: 'maintenance', text: 'Contrôle de l’ascenseur B terminé sans anomalie.' },
];

const groups = [
  { name: 'Tangney', arrival: '16h00', pax: 48, status: 'Prêt', tone: 'success' },
  { name: 'ORP', arrival: '18h30', pax: 62, status: 'À vérifier', tone: 'warning' },
  { name: 'Joe Walsh', arrival: '20h15', pax: 31, status: 'Paiement', tone: 'danger' },
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
  const [filter, setFilter] = useState<ShiftFilter>('all');
  const [search, setSearch] = useState('');
  const [showComposer, setShowComposer] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>([
    { id: 1, level: 'critical', title: 'Climatisation chambre 412', owner: 'Maintenance', resolved: false },
    { id: 2, level: 'warning', title: 'Rooming list ORP manquante', owner: 'Réception', resolved: false },
    { id: 3, level: 'info', title: 'Contrôle incendie demain à 10h00', owner: 'Direction', resolved: false },
  ]);

  const filteredTransmissions = useMemo(() => {
    return transmissions.filter((item) => {
      const matchesService = filter === 'all' || item.service === filter;
      const matchesSearch = item.text.toLowerCase().includes(search.toLowerCase()) || item.author.toLowerCase().includes(search.toLowerCase());
      return matchesService && matchesSearch;
    });
  }, [filter, search]);

  const openAlerts = alerts.filter((alert) => !alert.resolved);

  function resolveAlert(id: number) {
    setAlerts((current) => current.map((alert) => (alert.id === id ? { ...alert, resolved: true } : alert)));
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div>
            <strong>HospiCore</strong>
            <span>Hôtel Paradis</span>
          </div>
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
          <div>
            <p className="eyebrow">Mardi 4 août 2026</p>
            <h1>Bonjour Thomas 👋</h1>
            <p className="subtitle">Voici les priorités opérationnelles de l’Hôtel Paradis.</p>
          </div>
          <div className="topbar-actions">
            <label className="search-box">
              <Search size={18} />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher…" />
            </label>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={20} />
              <span className="notification-dot">{openAlerts.length}</span>
            </button>
            <div className="avatar">TP</div>
          </div>
        </header>

        <section className="briefing-card">
          <div className="briefing-icon"><Sparkles size={22} /></div>
          <div>
            <p className="eyebrow">Briefing intelligent</p>
            <strong>Risque de saturation entre 16h00 et 18h30.</strong>
            <p>Trois groupes arrivent sur une courte plage horaire. Prévoir un second poste de check-in et vérifier le paiement Joe Walsh.</p>
          </div>
          <button className="text-button" type="button">Voir le briefing <ChevronRight size={17} /></button>
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
              <button className="primary-button" type="button" onClick={() => setShowComposer(true)}>
                <Plus size={17} /> Nouvelle note
              </button>
            </div>

            <div className="filter-row" aria-label="Filtrer la main courante">
              {(['all', 'reception', 'maintenance'] as ShiftFilter[]).map((value) => (
                <button key={value} className={filter === value ? 'filter-chip active' : 'filter-chip'} onClick={() => setFilter(value)} type="button">
                  {value === 'all' ? 'Toutes' : value === 'reception' ? 'Réception' : 'Maintenance'}
                </button>
              ))}
            </div>

            <div className="timeline">
              {filteredTransmissions.map((item) => (
                <div className="timeline-item" key={item.id}>
                  <div className="timeline-time">{item.time}</div>
                  <div className="timeline-dot" />
                  <div>
                    <div className="timeline-author"><strong>{item.author}</strong><span>{item.service}</span></div>
                    <p>{item.text}</p>
                  </div>
                </div>
              ))}
              {filteredTransmissions.length === 0 && <p className="empty-state">Aucune transmission ne correspond à votre recherche.</p>}
            </div>
          </article>

          <article className="panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Priorités</p>
                <h2>Alertes à traiter</h2>
              </div>
              <span className="count-badge">{openAlerts.length}</span>
            </div>

            <div className="alert-list">
              {openAlerts.map((alert) => (
                <div className="alert-row" key={alert.id}>
                  <span className={`status-dot ${alert.level}`} />
                  <div>
                    <strong>{alert.title}</strong>
                    <small>{alert.owner}</small>
                  </div>
                  <button className="resolve-button" onClick={() => resolveAlert(alert.id)} title="Marquer comme traité" type="button">
                    <CheckCircle2 size={18} />
                  </button>
                </div>
              ))}
              {openAlerts.length === 0 && <p className="empty-state">Toutes les alertes ont été traitées.</p>}
            </div>
          </article>

          <article className="panel wide-panel">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Aujourd’hui</p>
                <h2>Groupes attendus</h2>
              </div>
              <button className="text-button" type="button">Voir tous <ChevronRight size={17} /></button>
            </div>
            <div className="group-table" role="table" aria-label="Groupes attendus">
              <div className="table-row table-head" role="row">
                <span>Groupe</span><span>Arrivée</span><span>Pax</span><span>Statut</span>
              </div>
              {groups.map((group) => (
                <div className="table-row" role="row" key={group.name}>
                  <strong>{group.name}</strong><span>{group.arrival}</span><span>{group.pax}</span><span className={`pill ${group.tone}`}>{group.status}</span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>

      {showComposer && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowComposer(false)}>
          <section className="modal" role="dialog" aria-modal="true" aria-label="Nouvelle note" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div><p className="eyebrow">Main courante</p><h2>Nouvelle transmission</h2></div>
              <button className="icon-button" type="button" onClick={() => setShowComposer(false)}><X size={18} /></button>
            </div>
            <label>Objet<input placeholder="Ex. Arrivée tardive du groupe ORP" /></label>
            <label>Message<textarea rows={5} placeholder="Décrivez l’information utile à l’équipe suivante…" /></label>
            <div className="modal-actions">
              <button className="secondary-button" type="button" onClick={() => setShowComposer(false)}>Annuler</button>
              <button className="primary-button" type="button" onClick={() => setShowComposer(false)}>Publier</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
