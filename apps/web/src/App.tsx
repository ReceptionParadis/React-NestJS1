import {
  Bell,
  BedDouble,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  UsersRound,
  Wrench,
} from 'lucide-react';

type Metric = {
  label: string;
  value: string;
  detail: string;
};

const metrics: Metric[] = [
  { label: 'Occupation', value: '91 %', detail: '586 clients présents' },
  { label: 'Arrivées', value: '154', detail: '11 groupes attendus' },
  { label: 'Départs', value: '137', detail: '26 départs avant 08h00' },
  { label: 'Tickets ouverts', value: '19', detail: '2 urgences' },
];

const transmissions = [
  { time: '08:12', author: 'Gabriel', text: 'Le groupe ORP arrivera finalement à 18h30.' },
  { time: '09:04', author: 'Paola', text: 'La chambre 214 est prête et contrôlée.' },
  { time: '09:46', author: 'Thomas', text: 'Paiement Joe Walsh toujours en attente.' },
];

const alerts = [
  { level: 'critical', title: 'Climatisation chambre 412', owner: 'Maintenance' },
  { level: 'warning', title: 'Rooming list ORP manquante', owner: 'Réception' },
  { level: 'info', title: 'Contrôle incendie demain à 10h00', owner: 'Direction' },
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
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Notifications">
              <Bell size={20} />
              <span className="notification-dot">3</span>
            </button>
            <div className="avatar">TP</div>
          </div>
        </header>

        <section className="metrics-grid" aria-label="Indicateurs du jour">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
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
              <button className="primary-button" type="button">Nouvelle note</button>
            </div>

            <div className="timeline">
              {transmissions.map((item) => (
                <div className="timeline-item" key={`${item.time}-${item.author}`}>
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
                <div className="alert-row" key={alert.title}>
                  <span className={`status-dot ${alert.level}`} />
                  <div>
                    <strong>{alert.title}</strong>
                    <small>{alert.owner}</small>
                  </div>
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
              <div className="table-row" role="row">
                <strong>Tangney</strong><span>16h00</span><span>48</span><span className="pill success">Prêt</span>
              </div>
              <div className="table-row" role="row">
                <strong>ORP</strong><span>18h30</span><span>62</span><span className="pill warning">À vérifier</span>
              </div>
              <div className="table-row" role="row">
                <strong>Joe Walsh</strong><span>20h15</span><span>31</span><span className="pill danger">Paiement</span>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
