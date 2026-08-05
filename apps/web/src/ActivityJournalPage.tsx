import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BedDouble, BookOpenCheck, ChefHat, Clock3, Filter, Hotel, Package, Search, UtensilsCrossed, UsersRound, Wrench } from 'lucide-react';

type Activity = {
  id: string;
  at: string;
  timestamp: number;
  action: string;
  actor: string;
  role: string;
  service: string;
  source: string;
  reference?: string;
  priority?: string;
};

const demoActivities: Activity[] = [
  { id:'demo-1', at:'05/08/2026 21:51:18', timestamp:new Date('2026-08-05T21:51:18').getTime(), action:'Dîner marqué prêt à servir pour Marian Pilgrimages', actor:'Paola MARTIN', role:'Cuisine', service:'Cuisine', source:'Repas groupe', reference:'Marian Pilgrimages' },
  { id:'demo-2', at:'05/08/2026 21:46:09', timestamp:new Date('2026-08-05T21:46:09').getTime(), action:'OK propre transmis pour le groupe Unitalsi', actor:'Noémie DUPONT', role:'Housekeeping', service:'Housekeeping', source:'Groupe', reference:'Unitalsi' },
  { id:'demo-3', at:'05/08/2026 21:42:31', timestamp:new Date('2026-08-05T21:42:31').getTime(), action:'Groupe ORP marqué arrivé', actor:'Thomas PETRISSANS', role:'Directeur Hébergement', service:'Réception', source:'Groupe', reference:'ORP' },
];

function parseFrenchDate(value: string) {
  const match = value.match(/(\d{2})\/(\d{2})\/(\d{4})[ ,à]*(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return Date.now();
  return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5]), Number(match[6] || 0)).getTime();
}

function readJson(key: string): any[] {
  try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
  catch { return []; }
}

function collectActivities(): Activity[] {
  const result: Activity[] = [];
  readJson('hospicore.operations.loans.v1').forEach((loan) => (loan.history || []).forEach((entry: any) => result.push({
    id:`loan-${loan.id}-${entry.id}`, at:entry.at, timestamp:parseFrenchDate(entry.at), action:entry.action,
    actor:entry.actor, role:entry.role, service:'Réception', source:'Prêt de matériel', reference:loan.reference,
  })));
  readJson('hospicore.operations.instructions.v1').forEach((instruction) => (instruction.history || []).forEach((entry: any) => result.push({
    id:`instruction-${instruction.id}-${entry.id}`, at:entry.at, timestamp:parseFrenchDate(entry.at), action:entry.action,
    actor:entry.actor, role:entry.role, service:instruction.service || 'Réception', source:instruction.category || 'Consigne',
    reference:instruction.reference, priority:instruction.priority,
  })));
  readJson('hospicore.function-sheets.v1').forEach((sheet) => (sheet.auditTrail || []).forEach((entry: any) => result.push({
    id:`group-${sheet.id}-${entry.id}`, at:entry.at, timestamp:parseFrenchDate(entry.at), action:entry.action,
    actor:entry.actor, role:entry.role, service:entry.department || entry.role || 'Interservice', source:'Fiche groupe', reference:sheet.groupName,
  })));
  return result.length ? result.sort((a,b) => b.timestamp-a.timestamp) : demoActivities;
}

const serviceIcons: Record<string, typeof Hotel> = {
  Réception: Hotel, Housekeeping: BedDouble, Cuisine: ChefHat, Restaurant: UtensilsCrossed,
  Maintenance: Wrench, Commercial: UsersRound, Direction: BookOpenCheck,
};

export function ActivityJournalPage() {
  const [items, setItems] = useState<Activity[]>(collectActivities);
  const [service, setService] = useState('Tous');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const refresh = () => setItems(collectActivities());
    window.addEventListener('storage', refresh);
    window.addEventListener('hospicore:function-sheets', refresh);
    const timer = window.setInterval(refresh, 15000);
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('hospicore:function-sheets', refresh); window.clearInterval(timer); };
  }, []);

  const services = useMemo(() => ['Tous', ...Array.from(new Set(items.map((item) => item.service)))], [items]);
  const filtered = useMemo(() => items.filter((item) => {
    const matchesService = service === 'Tous' || item.service === service;
    const text = `${item.action} ${item.actor} ${item.role} ${item.source} ${item.reference || ''}`.toLowerCase();
    return matchesService && text.includes(query.toLowerCase());
  }), [items, service, query]);

  const todayCount = items.filter((item) => new Date(item.timestamp).toDateString() === new Date().toDateString()).length;
  const uniqueUsers = new Set(items.map((item) => item.actor)).size;
  const criticalCount = items.filter((item) => item.priority === 'Critique').length;

  return <div className="activity-page">
    <header className="activity-header"><div><button onClick={() => location.href='/'}><ArrowLeft size={18}/>Tableau de bord</button><p>HospiCore · Traçabilité</p><h1>Journal d’exploitation</h1><span>Toutes les actions signées et horodatées de l’hôtel, regroupées dans un flux unique.</span></div><button className="activity-refresh" onClick={() => setItems(collectActivities())}><Clock3 size={17}/>Actualiser</button></header>

    <section className="activity-kpis"><article><Clock3/><span>Actions aujourd’hui</span><strong>{todayCount}</strong></article><article><UsersRound/><span>Collaborateurs actifs</span><strong>{uniqueUsers}</strong></article><article><BookOpenCheck/><span>Événements enregistrés</span><strong>{items.length}</strong></article><article><Wrench/><span>Alertes critiques</span><strong>{criticalCount}</strong></article></section>

    <section className="activity-toolbar"><label><Search size={17}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Rechercher une action, un utilisateur ou une référence…"/></label><div><Filter size={17}/><select value={service} onChange={(event)=>setService(event.target.value)}>{services.map((item)=><option key={item}>{item}</option>)}</select></div></section>

    <section className="activity-feed">{filtered.map((item) => { const Icon = serviceIcons[item.service] || Package; return <article key={item.id} className="activity-entry"><div className="activity-time"><strong>{item.at.split(' ').slice(-1)[0]}</strong><span>{item.at.split(' ').slice(0,-1).join(' ')}</span></div><div className="activity-line"><i/></div><div className="activity-icon"><Icon size={19}/></div><div className="activity-content"><div><span>{item.service}</span>{item.priority && <em className={item.priority.toLowerCase()}>{item.priority}</em>}</div><h2>{item.action}</h2><p>{item.source}{item.reference ? ` · ${item.reference}` : ''}</p><small>Signé par <strong>{item.actor}</strong> · {item.role}</small></div></article>; })}{filtered.length===0 && <div className="activity-empty">Aucune action ne correspond aux filtres sélectionnés.</div>}</section>
  </div>;
}
