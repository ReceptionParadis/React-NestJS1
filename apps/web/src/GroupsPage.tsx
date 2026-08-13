import { useMemo, useState } from 'react';
import { Archive, ArrowLeft, Bus, CalendarDays, CheckCircle2, ChevronDown, Clock3, CreditCard, FileSpreadsheet, Plus, Search, UsersRound, X } from 'lucide-react';

type GroupStatus = 'Préparation' | 'Confirmé' | 'Action requise' | 'Présent' | 'Parti';
type PaymentStatus = 'Soldé' | 'Arrhes reçues' | 'En attente';
type Group = {
  id: number; name: string; agency: string; arrival: string; departure: string; pax: number; rooms: number;
  status: GroupStatus; payment: PaymentStatus; rooming: boolean; arrivalTime: string; dinnerTime: string;
  leader: string; phone: string; language: string; buses: number; parking: boolean; notes: string[];
};

const initialGroups: Group[] = [
  { id: 1, name: 'Joe Walsh Tours', agency: 'JWT', arrival: '12/10/2026', departure: '16/10/2026', pax: 72, rooms: 38, status: 'Action requise', payment: 'En attente', rooming: true, arrivalTime: '16h30', dinnerTime: '19h15', leader: 'Nilo Melo', phone: '+353 87 000 0000', language: 'Anglais', buses: 2, parking: true, notes: ['Solde à relancer', 'Préparer 72 cartes'] },
  { id: 2, name: 'Tangney', agency: 'Tangney Tours', arrival: '13/10/2026', departure: '15/10/2026', pax: 54, rooms: 28, status: 'Confirmé', payment: 'Soldé', rooming: true, arrivalTime: '16h00', dinnerTime: '19h00', leader: 'Anne Murphy', phone: '+44 7700 000000', language: 'Anglais', buses: 1, parking: true, notes: ['Chambres 5e et 6e étages'] },
  { id: 3, name: 'ORP', agency: 'ORP Voyages', arrival: '15/10/2026', departure: '18/10/2026', pax: 96, rooms: 50, status: 'Préparation', payment: 'Arrhes reçues', rooming: false, arrivalTime: '18h30', dinnerTime: '19h30', leader: 'Maria Rossi', phone: '+39 333 000 0000', language: 'Italien', buses: 2, parking: true, notes: ['Rooming list manquante'] },
  { id: 4, name: 'Unitalsi', agency: 'Unitalsi', arrival: '18/10/2026', departure: '22/10/2026', pax: 118, rooms: 61, status: 'Présent', payment: 'Soldé', rooming: true, arrivalTime: '14h45', dinnerTime: '18h45', leader: 'Paolo Bianchi', phone: '+39 334 000 0000', language: 'Italien', buses: 3, parking: true, notes: ['12 chambres PMR'] },
];

function parseFrenchDate(value: string) {
  const [day, month, year] = value.split('/').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999);
}

function isArchived(group: Group) {
  if (group.status === 'Parti') return true;
  const now = new Date();
  const departure = parseFrenchDate(group.departure);
  return departure.getTime() < new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function groupByArrival(groups: Group[]) {
  const buckets = new Map<string, Group[]>();
  groups.forEach((group) => buckets.set(group.arrival, [...(buckets.get(group.arrival) ?? []), group]));
  return [...buckets.entries()].sort((a, b) => parseFrenchDate(a[0]).getTime() - parseFrenchDate(b[0]).getTime());
}

export function GroupsPage() {
  const [groups, setGroups] = useState(initialGroups);
  const [selectedId, setSelectedId] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'Tous' | GroupStatus>('Tous');
  const [isCreateOpen, setCreateOpen] = useState(false);
  const selected = groups.find((group) => group.id === selectedId) ?? groups[0];

  const filtered = useMemo(() => groups.filter((group) => {
    const query = search.trim().toLowerCase();
    return (status === 'Tous' || group.status === status) && (!query || `${group.name} ${group.agency} ${group.leader}`.toLowerCase().includes(query));
  }), [groups, search, status]);

  const activeGroups = useMemo(() => filtered.filter((group) => !isArchived(group)), [filtered]);
  const archivedGroups = useMemo(() => filtered.filter(isArchived), [filtered]);
  const activeByArrival = useMemo(() => groupByArrival(activeGroups), [activeGroups]);
  const archivedByArrival = useMemo(() => groupByArrival(archivedGroups).reverse(), [archivedGroups]);

  function updateSelected(update: Partial<Group>) {
    setGroups((current) => current.map((group) => group.id === selected.id ? { ...group, ...update } : group));
  }

  const renderRow = (group: Group) => <button type="button" key={group.id} className={`groups-row${selected.id === group.id ? ' selected' : ''}`} onClick={() => setSelectedId(group.id)}>
    <span><strong>{group.name}</strong><small>{group.agency}</small></span>
    <span>{group.arrival}<small>→ {group.departure}</small></span>
    <span><strong>{group.pax}</strong><small>{group.rooms} ch.</small></span>
    <span className={`group-pill ${group.payment === 'Soldé' ? 'success' : group.payment === 'En attente' ? 'danger' : 'warning'}`}>{group.payment}</span>
    <span>{group.rooming ? '✅ Reçue' : '❌ Manquante'}</span>
    <span className={`group-pill ${group.status === 'Confirmé' || group.status === 'Présent' || group.status === 'Parti' ? 'success' : group.status === 'Action requise' ? 'danger' : 'warning'}`}>{group.status}</span>
  </button>;

  const renderArrivalSection = ([arrival, items]: [string, Group[]], archived = false) => <details key={`${archived ? 'archive' : 'active'}-${arrival}`} open={!archived} style={{ borderTop: '1px solid #eee8e0' }}>
    <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '13px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: archived ? '#faf8f5' : '#fff' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontWeight: 800 }}><ChevronDown size={17}/> Arrivée du {arrival}</span>
      <span style={{ color: '#8a7378', fontSize: 12 }}>{items.length} groupe{items.length > 1 ? 's' : ''} · {items.reduce((sum, group) => sum + group.pax, 0)} pax</span>
    </summary>
    {items.map(renderRow)}
  </details>;

  return <div className="groups-page">
    <header className="module-header">
      <a className="back-link" href="/"><ArrowLeft size={18}/> Tableau de bord</a>
      <div><p className="eyebrow">Commercial & opérations</p><h1>Groupes</h1><p>Suivi des séjours, rooming lists, paiements et arrivées.</p></div>
      <button className="primary-button" type="button" onClick={() => setCreateOpen(true)}><Plus size={17}/> Nouveau groupe</button>
    </header>

    <section className="groups-kpis">
      <article><UsersRound/><div><strong>{activeGroups.length}</strong><span>Groupes actifs</span></div></article>
      <article><CalendarDays/><div><strong>{activeGroups.reduce((sum, group) => sum + group.pax, 0)}</strong><span>Personnes à venir / présentes</span></div></article>
      <article><FileSpreadsheet/><div><strong>{activeGroups.filter((group) => !group.rooming).length}</strong><span>Rooming list manquante</span></div></article>
      <article><CreditCard/><div><strong>{activeGroups.filter((group) => group.payment === 'En attente').length}</strong><span>Paiement en attente</span></div></article>
    </section>

    <section className="groups-toolbar">
      <label className="search-box"><Search size={18}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un groupe…"/></label>
      <div className="filter-chips">{(['Tous','Préparation','Confirmé','Action requise','Présent','Parti'] as const).map((item) => <button key={item} className={`filter-chip${status === item ? ' active' : ''}`} onClick={() => setStatus(item)}>{item}</button>)}</div>
    </section>

    <section className="groups-layout">
      <div className="groups-table panel">
        <div className="groups-row groups-head"><span>Groupe</span><span>Séjour</span><span>Pax</span><span>Paiement</span><span>Rooming</span><span>Statut</span></div>
        {activeByArrival.length ? activeByArrival.map((entry) => renderArrivalSection(entry)) : <p className="empty-state">Aucun groupe actif ne correspond à votre recherche.</p>}

        {archivedGroups.length > 0 && <details style={{ marginTop: 10, borderTop: '1px solid #e5ddd2' }}>
          <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '14px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f4f0eb', fontWeight: 800 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9 }}><Archive size={17}/> Archives</span>
            <span style={{ color: '#8a7378', fontSize: 12 }}>{archivedGroups.length} groupe{archivedGroups.length > 1 ? 's' : ''}</span>
          </summary>
          {archivedByArrival.map((entry) => renderArrivalSection(entry, true))}
        </details>}
      </div>

      <aside className="group-detail panel">
        <div className="detail-heading"><div><p className="eyebrow">Fiche groupe</p><h2>{selected.name}</h2><span>{selected.agency}</span></div><span className="group-code">GRP-{String(selected.id).padStart(4,'0')}</span></div>
        <div className="group-summary"><div><UsersRound/><strong>{selected.pax} pax</strong><span>{selected.rooms} chambres</span></div><div><Bus/><strong>{selected.buses} bus</strong><span>{selected.parking ? 'Parking réservé' : 'À réserver'}</span></div></div>
        <div className="group-fields">
          <label>Statut<select value={selected.status} onChange={(event) => updateSelected({ status: event.target.value as GroupStatus })}><option>Préparation</option><option>Confirmé</option><option>Action requise</option><option>Présent</option><option>Parti</option></select></label>
          <label>Paiement<select value={selected.payment} onChange={(event) => updateSelected({ payment: event.target.value as PaymentStatus })}><option>Soldé</option><option>Arrhes reçues</option><option>En attente</option></select></label>
          <label>Heure d’arrivée<input value={selected.arrivalTime} onChange={(event) => updateSelected({ arrivalTime: event.target.value })}/></label>
          <label>Dîner<input value={selected.dinnerTime} onChange={(event) => updateSelected({ dinnerTime: event.target.value })}/></label>
        </div>
        <div className="group-contact"><h3>Tour leader</h3><strong>{selected.leader}</strong><span>{selected.phone}</span><span>{selected.language}</span></div>
        <div className="group-checklist"><h3>Préparation</h3><button onClick={() => updateSelected({ rooming: !selected.rooming })}>{selected.rooming ? <CheckCircle2/> : <Clock3/>}<span>Rooming list</span><strong>{selected.rooming ? 'Reçue' : 'Manquante'}</strong></button><button><CheckCircle2/><span>Parking bus</span><strong>{selected.parking ? 'Réservé' : 'À faire'}</strong></button><button><Clock3/><span>Cartes de chambres</span><strong>À préparer</strong></button></div>
        <div className="group-notes"><h3>Points d’attention</h3>{selected.notes.map((note) => <p key={note}>• {note}</p>)}</div>
      </aside>
    </section>

    {isCreateOpen && <div className="modal-backdrop" onMouseDown={() => setCreateOpen(false)}><section className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">Groupes</p><h2>Nouveau groupe</h2></div><button className="icon-button" onClick={() => setCreateOpen(false)}><X size={19}/></button></div><p className="empty-state">Le formulaire complet sera relié à l’API lors du branchement des données réelles.</p><div className="modal-actions"><button className="secondary-button" onClick={() => setCreateOpen(false)}>Fermer</button></div></section></div>}
  </div>;
}
