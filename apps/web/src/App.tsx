import { useState } from 'react';
import {
  AlertTriangle, BedDouble, Bell, BookOpenCheck, BriefcaseBusiness, CalendarDays, CheckCircle2, ChefHat, ChevronRight,
  ClipboardList, Clock3, ConciergeBell, History, LayoutDashboard, ListTodo, Menu, MessageSquareText, Sparkles,
  UtensilsCrossed, Wrench, X,
} from 'lucide-react';

const nav = [
  { label: 'Tableau de bord', icon: LayoutDashboard, href: '/', active: true },
  { label: 'Tâches', icon: ListTodo, href: '/taches' },
  { label: 'Journal d’exploitation', icon: History, href: '/journal-exploitation' },
  { label: 'Centre des opérations', icon: BookOpenCheck, href: '/centre-operations' },
  { label: 'Consignes générales', icon: ClipboardList, href: '/consignes-generales' },
  { label: 'Réception', icon: ConciergeBell, href: '/reception' },
  { label: 'Restaurant', icon: UtensilsCrossed, href: '/restaurant' },
  { label: 'Housekeeping', icon: BedDouble, href: '/housekeeping' },
  { label: 'Cuisine', icon: ChefHat, href: '/cuisine' },
  { label: 'Commercial', icon: BriefcaseBusiness, href: '/commercial' },
  { label: 'Main courante', icon: MessageSquareText, href: '/main-courante' },
  { label: 'Tickets', icon: Wrench, href: '/tickets' },
  { label: 'Salles de réunion', icon: CalendarDays, href: '/salles-reunion' },
];

const metrics = [
  { label: 'Tâches ouvertes', value: '12', detail: '4 services concernés', delta: '2 priorités critiques', tone: 'wine' },
  { label: 'Couverts groupes', value: '175', detail: '3 services aujourd’hui', delta: 'Prochain service 19h00', tone: 'gold' },
  { label: 'Consignes ouvertes', value: '6', detail: '2 hautes priorités', delta: '1 échéance dépassée', tone: 'orange' },
  { label: 'Salles réservées', value: '7', detail: '3 événements aujourd’hui', delta: '1 option à confirmer', tone: 'green' },
  { label: 'Actions tracées', value: '24', detail: '8 collaborateurs actifs', delta: 'Mise à jour en temps réel', tone: 'blue' },
  { label: 'Prêts en cours', value: '5', detail: '2 retours aujourd’hui', delta: '1 fauteuil à restituer', tone: 'red' },
];

const arrivals = [
  { time: '14h30', name: 'Hermès Tours', meta: '42 pax · déjeuner 12h15', state: 'Arrivé', tone: 'success' },
  { time: '16h00', name: 'Marian Pilgrimages', meta: '54 pax · dîner 19h00', state: 'En route', tone: 'warning' },
  { time: '17h45', name: 'Unitalsi', meta: '82 pax · dîner 19h30', state: 'Prévu', tone: 'info' },
];

const alerts = [
  { icon: ListTodo, title: 'Salle Gavarnie à préparer', text: 'Restaurant · échéance 14h30', tone: 'critical' },
  { icon: ClipboardList, title: 'Taxi VIP à confirmer', text: 'Chambre 518 · départ prévu à 07h15', tone: 'critical' },
  { icon: BookOpenCheck, title: 'Fauteuil roulant à restituer', text: 'Retour prévu aujourd’hui à 10h00', tone: 'warning' },
  { icon: CheckCircle2, title: 'Marian arrivé', text: 'Information diffusée au restaurant et à la cuisine', tone: 'success' },
];

const services = [
  { name: 'Réception', status: 'Opérationnel', detail: '3 arrivées à confirmer', score: 92 },
  { name: 'Restaurant', status: 'À suivre', detail: '3 tâches ouvertes', score: 82 },
  { name: 'Housekeeping', status: 'En cours', detail: '2 tâches à terminer', score: 78 },
  { name: 'Cuisine', status: 'Préparation', detail: '6 régimes particuliers', score: 86 },
  { name: 'Commercial', status: 'Mise à jour', detail: '2 fiches incomplètes', score: 74 },
];

export function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = (href: string) => { window.location.href = href; };

  return <div className="app-shell executive-shell">
    <aside className={`sidebar${sidebarOpen ? ' open' : ''}`}><div className="brand"><div className="brand-mark">H</div><div><strong>HospiCore</strong><span>Hôtel Paradis · Lourdes</span></div><button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Fermer"><X size={20}/></button></div><nav className="nav-list">{nav.map(({ label, icon: Icon, href, active }) => <button key={label} className={`nav-item${active ? ' active' : ''}`} onClick={() => navigate(href)}><Icon size={19}/>{label}</button>)}</nav><div className="demo-version"><Sparkles size={16}/><div><strong>Executive Demo</strong><span>HospiCore v0.6</span></div></div></aside>
    <main className="main-content executive-main">
      <header className="topbar executive-topbar"><div className="heading-wrap"><button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Menu"><Menu size={22}/></button><div><p className="eyebrow">Mercredi 5 août 2026 · 23h06</p><h1>Centre opérationnel interservice</h1></div></div><div className="topbar-actions"><span className="live-badge"><span/> Données de démonstration</span><button className="icon-button" aria-label="Notifications"><Bell size={20}/><span className="notification-dot">4</span></button><div className="avatar">TP</div></div></header>
      <section className="executive-hero"><div><p className="eyebrow light">Briefing HospiCore</p><h2>Les actions sont attribuées, suivies et signées.</h2><p>Le nouveau tableau des tâches permet à chaque service de voir ce qu’il doit faire, les échéances et les priorités opérationnelles.</p></div><div className="hero-actions"><button onClick={() => navigate('/taches')}><ListTodo size={18}/>Ouvrir les tâches</button><button onClick={() => navigate('/journal-exploitation')}><History size={18}/>Journal d’exploitation</button></div></section>
      <section className="executive-metrics">{metrics.map((metric) => <article className={`executive-metric ${metric.tone}`} key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small><em>{metric.delta}</em></article>)}</section>
      <section className="executive-grid">
        <article className="panel arrivals-panel"><div className="panel-header compact"><div><p className="eyebrow">Réception</p><h2>Prochaines arrivées groupes</h2></div><button className="text-button" onClick={() => navigate('/reception')}>Gérer les arrivées</button></div><div className="arrival-list">{arrivals.map((arrival) => <button className="arrival-row" key={arrival.name} onClick={() => navigate('/reception')}><time>{arrival.time}</time><div><strong>{arrival.name}</strong><small>{arrival.meta}</small></div><span className={`pill ${arrival.tone}`}>{arrival.state}</span><ChevronRight size={17}/></button>)}</div></article>
        <article className="panel alerts-panel"><div className="panel-header compact"><div><p className="eyebrow">À traiter</p><h2>Alertes interservices</h2></div><span className="count-badge">4</span></div><div className="executive-alerts">{alerts.map(({icon:Icon,title,text,tone}) => <div className={`executive-alert ${tone}`} key={title}><span><Icon size={18}/></span><div><strong>{title}</strong><small>{text}</small></div></div>)}</div></article>
        <article className="panel services-panel"><div className="panel-header compact"><div><p className="eyebrow">Pilotage</p><h2>État des services</h2></div><Clock3 size={19}/></div><div className="service-list">{services.map((service) => <div className="service-row" key={service.name}><div className="service-title"><strong>{service.name}</strong><span>{service.status}</span></div><small>{service.detail}</small><div className="service-progress"><i style={{width:`${service.score}%`}}/></div></div>)}</div></article>
        <article className="panel quick-panel"><div className="panel-header compact"><div><p className="eyebrow">Accès rapide</p><h2>Modules opérationnels</h2></div></div><div className="quick-grid">{nav.slice(1,10).map(({label,icon:Icon,href}) => <button key={label} onClick={() => navigate(href)}><Icon size={22}/><span>{label}</span><ChevronRight size={16}/></button>)}</div></article>
      </section>
      <footer className="demo-footer"><AlertTriangle size={16}/>Version pilote : les données sont enregistrées localement dans le navigateur jusqu’à la synchronisation PostgreSQL multi-utilisateur.</footer>
    </main>
  </div>;
}
