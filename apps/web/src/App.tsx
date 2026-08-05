import { useState } from 'react';
import {
  AlertTriangle,
  BedDouble,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  Sparkles,
  UsersRound,
  Wrench,
  X,
} from 'lucide-react';

const nav = [
  { label: 'Tableau de bord', icon: LayoutDashboard, href: '/', active: true },
  { label: 'Main courante', icon: MessageSquareText, href: '/main-courante' },
  { label: 'Tickets', icon: ClipboardList, href: '/tickets' },
  { label: 'Salles de réunion', icon: CalendarDays, href: '/salles-reunion' },
  { label: 'Groupes', icon: UsersRound, href: '/groupes' },
];

const metrics = [
  { label: 'Occupation', value: '84 %', detail: '254 chambres occupées', delta: '+4 pts vs hier', tone: 'wine' },
  { label: 'Arrivées', value: '128', detail: '9 groupes · 61 chambres', delta: 'Pic entre 16h et 19h', tone: 'gold' },
  { label: 'Départs', value: '112', detail: '26 avant 08h00', delta: '74 chambres libérées', tone: 'blue' },
  { label: 'Clients présents', value: '589', detail: '38 nationalités', delta: '75 % clientèle groupes', tone: 'green' },
  { label: 'Salles réservées', value: '7', detail: '3 événements aujourd’hui', delta: '1 option à confirmer', tone: 'orange' },
  { label: 'Tickets ouverts', value: '6', detail: '2 interventions urgentes', delta: '4 services concernés', tone: 'red' },
];

const arrivals = [
  { time: '14h30', name: 'Hermès Tours', meta: '42 pax · 21 chambres', state: 'Prêt', tone: 'success' },
  { time: '16h00', name: 'Marian Pilgrimages', meta: '54 pax · 28 chambres', state: 'Cartes à finir', tone: 'warning' },
  { time: '17h45', name: 'Unitalsi', meta: '82 pax · 43 chambres', state: '2 PMR', tone: 'info' },
  { time: '19h15', name: 'Joe Walsh Tours', meta: '31 pax · 17 chambres', state: 'Paiement', tone: 'danger' },
];

const alerts = [
  { icon: Wrench, title: 'Ascenseur bâtiment B', text: 'Intervention prévue à 14h00', tone: 'critical' },
  { icon: CalendarDays, title: 'Salle Gavarnie en option', text: 'Conférence ORP · confirmation attendue', tone: 'warning' },
  { icon: ClipboardList, title: 'Rooming list incomplète', text: 'ORP · 4 voyageurs sans type de chambre', tone: 'warning' },
  { icon: CheckCircle2, title: 'Parking bus confirmé', text: '3 emplacements réservés cet après-midi', tone: 'success' },
];

const services = [
  { name: 'Réception', status: 'Opérationnel', detail: '3 postes ouverts', score: 92 },
  { name: 'Communication', status: 'À suivre', detail: '4 transmissions prioritaires', score: 78 },
  { name: 'Maintenance', status: '2 urgences', detail: '6 tickets ouverts', score: 71 },
  { name: 'Restaurant', status: 'Prêt', detail: '287 couverts au dîner', score: 88 },
];

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function navigate(href: string) {
    window.location.href = href;
  }

  return (
    <div className="app-shell executive-shell">
      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">H</div>
          <div><strong>HospiCore</strong><span>Hôtel Paradis · Lourdes</span></div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Fermer"><X size={20} /></button>
        </div>
        <nav className="nav-list">
          {nav.map(({ label, icon: Icon, href, active }) => (
            <button key={label} className={`nav-item${active ? ' active' : ''}`} onClick={() => navigate(href)}>
              <Icon size={19} />{label}
            </button>
          ))}
        </nav>
        <div className="demo-version"><Sparkles size={16} /><div><strong>Executive Demo</strong><span>HospiCore v0.2</span></div></div>
      </aside>

      <main className="main-content executive-main">
        <header className="topbar executive-topbar">
          <div className="heading-wrap">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Menu"><Menu size={22} /></button>
            <div><p className="eyebrow">Mercredi 5 août 2026 · 16h18</p><h1>Centre opérationnel</h1></div>
          </div>
          <div className="topbar-actions">
            <span className="live-badge"><span /> Données de démonstration</span>
            <button className="icon-button" aria-label="Notifications"><Bell size={20} /><span className="notification-dot">4</span></button>
            <div className="avatar">TP</div>
          </div>
        </header>

        <section className="executive-hero">
          <div>
            <p className="eyebrow light">Briefing HospiCore AI</p>
            <h2>Une journée dense, mais maîtrisable.</h2>
            <p>Priorité à la coordination des arrivées, aux transmissions interservices et à la confirmation de la salle Gavarnie.</p>
          </div>
          <div className="hero-actions">
            <button onClick={() => navigate('/groupes')}><UsersRound size={18} />Voir les groupes</button>
            <button onClick={() => navigate('/salles-reunion')}><CalendarDays size={18} />Agenda des salles</button>
          </div>
        </section>

        <section className="executive-metrics">
          {metrics.map((metric) => (
            <article className={`executive-metric ${metric.tone}`} key={metric.label}>
              <span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small><em>{metric.delta}</em>
            </article>
          ))}
        </section>

        <section className="executive-grid">
          <article className="panel arrivals-panel">
            <div className="panel-header compact"><div><p className="eyebrow">Flux du jour</p><h2>Prochaines arrivées groupes</h2></div><button className="text-button" onClick={() => navigate('/groupes')}>Tout afficher</button></div>
            <div className="arrival-list">
              {arrivals.map((arrival) => (
                <button className="arrival-row" key={arrival.name} onClick={() => navigate('/groupes')}>
                  <time>{arrival.time}</time><div><strong>{arrival.name}</strong><small>{arrival.meta}</small></div><span className={`pill ${arrival.tone}`}>{arrival.state}</span><ChevronRight size={17} />
                </button>
              ))}
            </div>
          </article>

          <article className="panel alerts-panel">
            <div className="panel-header compact"><div><p className="eyebrow">À traiter</p><h2>Alertes prioritaires</h2></div><span className="count-badge">4</span></div>
            <div className="executive-alerts">
              {alerts.map(({ icon: Icon, title, text, tone }) => (
                <div className={`executive-alert ${tone}`} key={title}><span><Icon size={18} /></span><div><strong>{title}</strong><small>{text}</small></div></div>
              ))}
            </div>
          </article>

          <article className="panel services-panel">
            <div className="panel-header compact"><div><p className="eyebrow">Pilotage</p><h2>État des services</h2></div><Clock3 size={19} /></div>
            <div className="service-list">
              {services.map((service) => (
                <div className="service-row" key={service.name}><div className="service-title"><strong>{service.name}</strong><span>{service.status}</span></div><small>{service.detail}</small><div className="service-progress"><i style={{ width: `${service.score}%` }} /></div></div>
              ))}
            </div>
          </article>

          <article className="panel quick-panel">
            <div className="panel-header compact"><div><p className="eyebrow">Accès rapide</p><h2>Modules de la démo</h2></div></div>
            <div className="quick-grid">
              {nav.slice(1).map(({ label, icon: Icon, href }) => <button key={label} onClick={() => navigate(href)}><Icon size={22} /><span>{label}</span><ChevronRight size={16} /></button>)}
              <button><BedDouble size={22} /><span>Housekeeping</span><em>Bientôt</em></button>
            </div>
          </article>
        </section>

        <footer className="demo-footer"><AlertTriangle size={16} />Version pilote destinée à la présentation et à la validation fonctionnelle. Les chiffres affichés sont des données de démonstration.</footer>
      </main>
    </div>
  );
}
