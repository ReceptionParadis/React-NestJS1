import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, Bus, CalendarDays, CreditCard, FileSpreadsheet, LockKeyhole, Plus, RefreshCw, Search, UsersRound, X } from 'lucide-react';
import { can, currentRole } from './permissions';
import { useOperationalStore } from './useOperationalStore';

type GroupStatus = 'Préparation' | 'Confirmé' | 'Arrivé' | 'En séjour' | 'Parti';
type PaymentStatus = 'Payé' | 'Reste à payer';
type StayType = 'Logement' | 'B&B' | '1/2 midi' | '1/2 Soir' | 'Pension complète';
type BreakfastType = 'Standard' | 'PDJ Chaud' | 'Indiv';
type RoomServiceType = 'Standard' | 'Prestation express';
type LuggageRoom = '' | 'Bagagerie 1' | 'Bagagerie 2' | 'Bagagerie 3';
type MealRow = 'breakfast' | 'lunch' | 'packedLunch' | 'dinner' | 'packedDinner' | 'lodging';
type MealCell = { pax: number; time: string; water: boolean; wine: boolean };
type MealDay = Record<MealRow, MealCell> & { date: string };
type Audit = { id: string; action: string; actor: string; role: string; at: string };

type Group = {
  id: string; name: string; agency: string; directAgency: string; dmc: string;
  arrival: string; departure: string; pax: number; rooms: number;
  status: GroupStatus; paymentStatus: PaymentStatus; amountDue: number; debtor: string;
  rooming: boolean; roomingReceivedAt: string; roomingReceivedBy: string;
  arrivalTime: string; departureTime: string; leaderFirstName: string; leaderLastName: string;
  leaderPhone: string; leaderEmail: string; language: string; buses: number; parking: boolean;
  stayType: StayType; breakfastType: BreakfastType; housekeepingType: RoomServiceType; dietary: string;
  luggageArrival: LuggageRoom; luggageDeparture: LuggageRoom; mealDays: MealDay[];
  commercialValidated: boolean; validatedAt: string; validatedBy: string; audit: Audit[];
};

type BookingStatus = 'CONFIRMED' | 'OPTION' | 'BLOCKED';
type Booking = { id: string; groupId?: string; title: string; room: string; date: string; start: string; end: string; attendees: number; organiser: string; service: string; setup: string; notes: string; status: BookingStatus; updatedBy?: string; updatedAt?: string };
type SessionUser = { name: string; role: string };

const initial: Group[] = [];
const emptyBookings: Booking[] = [];
const meetingRooms = ['Salle Bernadette', 'Salle Massabielle', 'Salle Gavarnie', 'Salle Pic du Midi', 'Salle Gave'];
const rows: MealRow[] = ['breakfast', 'lunch', 'packedLunch', 'dinner', 'packedDinner', 'lodging'];
const rowLabels: Record<MealRow, string> = { breakfast: 'PDJ', lunch: 'Déjeuner', packedLunch: 'Panier repas midi', dinner: 'Dîner', packedDinner: 'Panier repas soir', lodging: 'Logement' };
const defaultTimes: Record<MealRow, string> = { breakfast: '07:30', lunch: '12:00', packedLunch: '07:00', dinner: '19:00', packedDinner: '18:00', lodging: '' };

function sessionUser(): SessionUser {
  try {
    const session = JSON.parse(localStorage.getItem('hospicore.session') || '{}');
    const value = session.user || {};
    return { name: `${value.firstName || 'Utilisateur'} ${value.lastName || 'HospiCore'}`.trim(), role: String(value.role?.name || value.role || 'Collaborateur') };
  } catch { return { name: 'Utilisateur HospiCore', role: 'Collaborateur' }; }
}
function stamp() { return new Date().toLocaleString('fr-FR'); }
function isoDate(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function parseDate(value: string) { const [year, month, day] = value.split('-').map(Number); return new Date(year, month - 1, day); }
function dateRange(start: string, end: string) {
  if (!start || !end) return [];
  const cursor = parseDate(start), last = parseDate(end), result: string[] = [];
  while (cursor <= last) { result.push(isoDate(cursor)); cursor.setDate(cursor.getDate() + 1); }
  return result;
}
function cell(row: MealRow, pax = 0): MealCell { return { pax, time: defaultTimes[row], water: false, wine: false }; }
function buildMealDays(arrival: string, departure: string, pax: number, stayType: StayType, previous: MealDay[] = []): MealDay[] {
  const old = new Map(previous.map(day => [day.date, day]));
  return dateRange(arrival, departure).map((date, index, dates) => {
    const first = index === 0, last = index === dates.length - 1;
    const day = { date, breakfast: cell('breakfast'), lunch: cell('lunch'), packedLunch: cell('packedLunch'), dinner: cell('dinner'), packedDinner: cell('packedDinner'), lodging: cell('lodging') } as MealDay;
    if (first && !last) { day.dinner.pax = pax; day.lodging.pax = pax; }
    if (last) day.breakfast.pax = pax;
    if (!first && !last) {
      day.lodging.pax = pax;
      if (stayType !== 'Logement') day.breakfast.pax = pax;
      if (stayType === '1/2 midi' || stayType === 'Pension complète') day.lunch.pax = pax;
      if (stayType === '1/2 Soir' || stayType === 'Pension complète') day.dinner.pax = pax;
    }
    const prior = old.get(date);
    if (prior) rows.forEach(row => { day[row] = { ...day[row], time: prior[row]?.time || day[row].time, water: Boolean(prior[row]?.water), wine: Boolean(prior[row]?.wine) }; });
    return day;
  });
}
function normalize(value: Partial<Group> & { id: string }): Group {
  const legacy = value as Partial<Group> & { leader?: string; phone?: string };
  const legacyName = String(legacy.leader || '').trim().split(/\s+/);
  const stayType = value.stayType || 'B&B';
  const directAgency = String(value.directAgency || value.agency || '');
  return {
    id: value.id, name: value.name || '', agency: directAgency, directAgency, dmc: value.dmc || '',
    arrival: value.arrival || '', departure: value.departure || '', pax: Number(value.pax || 0), rooms: Number(value.rooms || 0),
    status: value.status || 'Préparation', paymentStatus: value.paymentStatus || 'Reste à payer', amountDue: Number(value.amountDue || 0), debtor: value.debtor || '',
    rooming: Boolean(value.rooming), roomingReceivedAt: value.roomingReceivedAt || '', roomingReceivedBy: value.roomingReceivedBy || '',
    arrivalTime: value.arrivalTime || '', departureTime: value.departureTime || '', leaderFirstName: value.leaderFirstName || legacyName.shift() || '', leaderLastName: value.leaderLastName || legacyName.join(' '), leaderPhone: value.leaderPhone || legacy.phone || '', leaderEmail: value.leaderEmail || '', language: value.language || '', buses: Number(value.buses || 0), parking: Boolean(value.parking),
    stayType, breakfastType: value.breakfastType || 'Standard', housekeepingType: value.housekeepingType || 'Standard', dietary: value.dietary || '', luggageArrival: value.luggageArrival || '', luggageDeparture: value.luggageDeparture || '',
    mealDays: Array.isArray(value.mealDays) && value.mealDays.length ? value.mealDays : buildMealDays(value.arrival || '', value.departure || '', Number(value.pax || 0), stayType),
    commercialValidated: Boolean(value.commercialValidated), validatedAt: value.validatedAt || '', validatedBy: value.validatedBy || '', audit: Array.isArray(value.audit) ? value.audit : [],
  };
}

export function GroupsPage() {
  const store = useOperationalStore<Group[]>('group-360', initial);
  const meetingStore = useOperationalStore<Booking[]>('meeting-rooms', emptyBookings);
  const groups = useMemo(() => store.data.map(normalize), [store.data]);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'Tous' | GroupStatus>('Tous');
  const [createOpen, setCreateOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const selected = groups.find(group => group.id === selectedId) || groups[0];
  const user = sessionUser();
  const role = currentRole();
  const canEditAll = can('commercial.edit', role);
  const canOperateReception = can('reception.operate', role);
  const canEditOperational = canEditAll || canOperateReception;
  const canEditTimes = canEditOperational;
  const leaderName = (group: Group) => `${group.leaderFirstName} ${group.leaderLastName}`.trim();
  const filtered = useMemo(() => groups.filter(group => (status === 'Tous' || group.status === status) && `${group.name} ${group.directAgency} ${group.dmc} ${leaderName(group)}`.toLowerCase().includes(search.toLowerCase())), [groups, search, status]);
  const groupBookings = selected ? meetingStore.data.filter(booking => booking.groupId === selected.id || booking.title === selected.name) : [];

  async function saveGroup(updated: Group, action: string, invalidateCommercial = false) {
    const compatible = { ...updated, agency: updated.directAgency || updated.agency };
    const shouldInvalidate = invalidateCommercial && compatible.commercialValidated;
    const finalGroup: Group = shouldInvalidate ? { ...compatible, commercialValidated: false, validatedAt: '', validatedBy: '' } : compatible;
    const auditAction = shouldInvalidate ? `${action} · Validation commerciale annulée — nouvelle validation requise` : action;
    await store.save(groups.map(group => group.id === finalGroup.id ? { ...finalGroup, audit: [...finalGroup.audit, { id: crypto.randomUUID(), action: auditAction, actor: user.name, role: user.role, at: stamp() }] } : group));
  }
  async function patch(update: Partial<Group>, action: string, invalidate = canEditAll) {
    if (selected) await saveGroup({ ...selected, ...update }, action, invalidate);
  }
  async function updateRooming(received: boolean) {
    if (!selected || !canEditAll) return;
    const receivedAt = received ? stamp() : '';
    const receivedBy = received ? user.name : '';
    await saveGroup(
      { ...selected, rooming: received, roomingReceivedAt: receivedAt, roomingReceivedBy: receivedBy },
      received ? `Rooming List reçue · ${receivedAt}` : 'Rooming List repassée en statut Manquante',
      false,
    );
  }
  async function regenerate(update: Partial<Pick<Group, 'arrival' | 'departure' | 'pax' | 'stayType'>> = {}) {
    if (!selected || !canEditAll) return;
    const merged = { ...selected, ...update };
    await saveGroup({ ...merged, mealDays: buildMealDays(merged.arrival, merged.departure, merged.pax, merged.stayType, selected.mealDays) }, 'Planning repas recalculé', true);
  }
  async function updateMeal(date: string, row: MealRow, update: Partial<MealCell>, action: string) {
    if (!selected) return;
    const receptionTimeOnly = canOperateReception && !canEditAll && Object.keys(update).every(key => key === 'time');
    if (!canEditAll && !receptionTimeOnly) return;
    await saveGroup({ ...selected, mealDays: selected.mealDays.map(day => day.date === date ? { ...day, [row]: { ...day[row], ...update } } : day) }, action, canEditAll);
  }
  async function validateCommercial() {
    if (selected && can('commercial.edit', role)) await saveGroup({ ...selected, commercialValidated: true, validatedAt: stamp(), validatedBy: user.name }, 'Fiche verrouillée et validée par le Commercial', false);
  }
  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEditAll) return;
    const form = new FormData(event.currentTarget);
    const pax = Number(form.get('pax') || 0), stayType = String(form.get('stayType') || 'B&B') as StayType;
    const arrival = String(form.get('arrival') || ''), departure = String(form.get('departure') || '');
    const paymentStatus = String(form.get('paymentStatus') || 'Reste à payer') as PaymentStatus;
    const directAgency = String(form.get('directAgency') || '');
    const group = normalize({ id: crypto.randomUUID(), name: String(form.get('name') || ''), agency: directAgency, directAgency, dmc: String(form.get('dmc') || ''), arrival, departure, pax, rooms: Number(form.get('rooms') || 0), status: paymentStatus === 'Payé' ? 'Confirmé' : 'Préparation', paymentStatus, amountDue: Number(form.get('amountDue') || 0), debtor: String(form.get('debtor') || ''), arrivalTime: String(form.get('arrivalTime') || ''), departureTime: String(form.get('departureTime') || ''), leaderFirstName: String(form.get('leaderFirstName') || ''), leaderLastName: String(form.get('leaderLastName') || ''), leaderPhone: String(form.get('leaderPhone') || ''), leaderEmail: String(form.get('leaderEmail') || ''), language: String(form.get('language') || ''), buses: Number(form.get('buses') || 0), stayType, breakfastType: String(form.get('breakfastType') || 'Standard') as BreakfastType, housekeepingType: String(form.get('housekeepingType') || 'Standard') as RoomServiceType, dietary: String(form.get('dietary') || ''), luggageArrival: String(form.get('luggageArrival') || '') as LuggageRoom, luggageDeparture: String(form.get('luggageDeparture') || '') as LuggageRoom, mealDays: buildMealDays(arrival, departure, pax, stayType), audit: [{ id: crypto.randomUUID(), action: 'Fiche Groupe 360° créée', actor: user.name, role: user.role, at: stamp() }] });
    if (await store.save([group, ...groups])) { setSelectedId(group.id); setCreateOpen(false); }
  }
  async function createMeeting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !canEditAll) return;
    const form = new FormData(event.currentTarget);
    const booking: Booking = { id: crypto.randomUUID(), groupId: selected.id, title: selected.name, room: String(form.get('room') || meetingRooms[0]), date: String(form.get('date') || selected.arrival), start: String(form.get('start') || '09:00'), end: String(form.get('end') || '10:00'), attendees: Number(form.get('attendees') || selected.pax), organiser: user.name, service: 'Commercial', setup: String(form.get('setup') || 'Théâtre'), notes: String(form.get('notes') || ''), status: String(form.get('status') || 'CONFIRMED') as BookingStatus, updatedBy: user.name, updatedAt: new Date().toISOString() };
    if (await meetingStore.save([...meetingStore.data, booking])) { await saveGroup(selected, `Salle ${booking.room} réservée le ${booking.date} de ${booking.start} à ${booking.end}`, true); setMeetingOpen(false); }
  }

  if (store.state === 'loading' && !groups.length) return <div className="groups-page"><p>Chargement des groupes partagés…</p></div>;
  return <div className="groups-page">
    <header className="module-header"><a className="back-link" href="/commercial"><ArrowLeft size={18}/>Commercial</a><div><p className="eyebrow">Commercial & opérations</p><h1>Fiches Groupe 360°</h1><p>Repas, bagagerie, salles, hébergement, paiement et suivi opérationnel.</p></div>{canEditAll && <button className="primary-button" onClick={() => setCreateOpen(true)}><Plus size={17}/>Nouveau groupe</button>}</header>
    {!canEditAll && canOperateReception && <div className="sync-banner synced"><span>Mode Réception · données commerciales en lecture seule. Horaires, bagagerie, téléphone du tour leader et horaires repas restent modifiables.</span></div>}
    <div className={`sync-banner ${store.state}`}><span>{store.message}</span><button onClick={() => void store.refresh()}><RefreshCw size={15}/>Actualiser</button></div>
    <section className="groups-kpis"><article><UsersRound/><div><strong>{groups.length}</strong><span>Groupes suivis</span></div></article><article><CalendarDays/><div><strong>{groups.reduce((sum, group) => sum + group.pax, 0)}</strong><span>Personnes</span></div></article><article><FileSpreadsheet/><div><strong>{groups.filter(group => !group.rooming).length}</strong><span>Rooming lists manquantes</span></div></article><article><CreditCard/><div><strong>{groups.filter(group => group.paymentStatus === 'Reste à payer').length}</strong><span>Restes à payer</span></div></article></section>
    <section className="groups-toolbar"><label className="search-box"><Search size={18}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher groupe, agence ou DMC…"/></label><div className="filter-chips">{(['Tous','Préparation','Confirmé','Arrivé','En séjour','Parti'] as const).map(value => <button key={value} className={`filter-chip${status === value ? ' active' : ''}`} onClick={() => setStatus(value)}>{value}</button>)}</div></section>
    <section className="groups-layout"><div className="groups-table panel"><div className="groups-row groups-head"><span>Groupe</span><span>Séjour</span><span>Pax</span><span>Paiement</span><span>Rooming</span><span>Statut</span></div>{filtered.map(group => <button key={group.id} className={`groups-row${selected?.id === group.id ? ' selected' : ''}`} onClick={() => setSelectedId(group.id)}><span><strong>{group.name}</strong><small>{group.directAgency || 'Agence non renseignée'}{group.dmc ? ` · DMC ${group.dmc}` : ''}</small></span><span>{group.arrival}<small>→ {group.departure}</small></span><span><strong>{group.pax}</strong><small>{group.rooms} ch.</small></span><span className={`group-pill ${group.paymentStatus === 'Payé' ? 'success' : 'danger'}`}>{group.paymentStatus}</span><span>{group.rooming ? <><strong>✅ Reçue</strong><small>{group.roomingReceivedAt || 'Horodatage non disponible'}</small></> : '❌ Manquante'}</span><span className="group-pill success">{group.status}</span></button>)}</div>
    {selected ? <aside className="group-detail panel group-detail-wide">
      <div className="detail-heading"><div><p className="eyebrow">Fiche Groupe 360°</p><h2>{selected.name}</h2><span>{selected.directAgency || 'Agence non renseignée'}{selected.dmc ? ` · DMC ${selected.dmc}` : ''}</span></div><span className="group-code">{selected.id.slice(0,8).toUpperCase()}</span></div>
      <div className={`commercial-lock ${selected.commercialValidated ? 'validated' : 'draft'}`}><LockKeyhole size={18}/><div><strong>{selected.commercialValidated ? 'Fiche validée et verrouillée' : 'Brouillon Commercial — non importable'}</strong><small>{selected.commercialValidated ? `Validée par ${selected.validatedBy} · ${selected.validatedAt}` : 'Toute modification commerciale impose une nouvelle validation avant import dans la fiche de fonction.'}</small></div>{canEditAll && !selected.commercialValidated && <button onClick={() => void validateCommercial()}>Valider et verrouiller</button>}</div>
      <div className="group-summary"><div><UsersRound/><strong>{selected.pax} pax</strong><span>{selected.rooms} chambres</span></div><div><Bus/><strong>{selected.buses} bus</strong><span>{selected.parking ? 'Parking réservé' : 'À réserver'}</span></div></div>
      <div className="group-fields">
        <label>Agence directe<input disabled={!canEditAll} value={selected.directAgency} onChange={event => void patch({ directAgency: event.target.value, agency: event.target.value }, 'Agence directe modifiée')}/></label>
        <label>DMC<input disabled={!canEditAll} value={selected.dmc} onChange={event => void patch({ dmc: event.target.value }, 'DMC modifié')}/></label>
        <label>Rooming List<select disabled={!canEditAll} value={selected.rooming ? 'Reçue' : 'Manquante'} onChange={event => void updateRooming(event.target.value === 'Reçue')}><option>Manquante</option><option>Reçue</option></select>{selected.rooming && <small>Reçue le {selected.roomingReceivedAt || '—'}{selected.roomingReceivedBy ? ` · ${selected.roomingReceivedBy}` : ''}</small>}</label>
        <label>Statut<select disabled={!canEditAll} value={selected.status} onChange={event => void patch({ status: event.target.value as GroupStatus }, `Statut : ${event.target.value}`)}><option>Préparation</option><option>Confirmé</option><option>Arrivé</option><option>En séjour</option><option>Parti</option></select></label>
        <label>Type de séjour<select disabled={!canEditAll} value={selected.stayType} onChange={event => void regenerate({ stayType: event.target.value as StayType })}><option>Logement</option><option>B&B</option><option>1/2 midi</option><option>1/2 Soir</option><option>Pension complète</option></select></label>
        <label>Type de PDJ<select disabled={!canEditAll} value={selected.breakfastType} onChange={event => void patch({ breakfastType: event.target.value as BreakfastType }, 'Type PDJ modifié')}><option>Standard</option><option>PDJ Chaud</option><option>Indiv</option></select></label>
        <label>Prestation chambres<select disabled={!canEditAll} value={selected.housekeepingType} onChange={event => void patch({ housekeepingType: event.target.value as RoomServiceType }, 'Prestation chambres modifiée')}><option>Standard</option><option>Prestation express</option></select></label>
        <label>Heure arrivée<input disabled={!canEditTimes} type="time" value={selected.arrivalTime} onChange={event => void patch({ arrivalTime: event.target.value }, 'Heure arrivée modifiée', false)}/></label>
        <label>Heure départ<input disabled={!canEditTimes} type="time" value={selected.departureTime} onChange={event => void patch({ departureTime: event.target.value }, 'Heure départ modifiée', false)}/></label>
        <label>Bagagerie arrivée<select disabled={!canEditOperational} value={selected.luggageArrival} onChange={event => void patch({ luggageArrival: event.target.value as LuggageRoom }, 'Bagagerie arrivée modifiée', false)}><option value="">Aucune</option><option>Bagagerie 1</option><option>Bagagerie 2</option><option>Bagagerie 3</option></select></label>
        <label>Bagagerie départ<select disabled={!canEditOperational} value={selected.luggageDeparture} onChange={event => void patch({ luggageDeparture: event.target.value as LuggageRoom }, 'Bagagerie départ modifiée', false)}><option value="">Aucune</option><option>Bagagerie 1</option><option>Bagagerie 2</option><option>Bagagerie 3</option></select></label>
        <label>Paiement<select disabled={!canEditAll} value={selected.paymentStatus} onChange={event => void patch({ paymentStatus: event.target.value as PaymentStatus, status: event.target.value === 'Payé' ? 'Confirmé' : selected.status }, 'Paiement modifié')}><option>Payé</option><option>Reste à payer</option></select></label>
        <label>Montant restant<input disabled={!canEditAll} type="number" value={selected.amountDue} onChange={event => void patch({ amountDue: Number(event.target.value) }, 'Montant modifié')}/></label>
        <label>Débiteur<input disabled={!canEditAll} value={selected.debtor} onChange={event => void patch({ debtor: event.target.value }, 'Débiteur modifié')}/></label>
        <label className="wide">Régimes alimentaires et allergies<textarea disabled={!canEditAll} value={selected.dietary} onChange={event => void patch({ dietary: event.target.value }, 'Régimes et allergies modifiés')} placeholder="Sans gluten, végétarien, allergie aux fruits à coque…"/></label>
      </div>
      <section className="group-contact"><h3>Tour leader</h3><div className="group-fields"><label>Prénom<input disabled={!canEditAll} value={selected.leaderFirstName} onChange={event => void patch({ leaderFirstName: event.target.value }, 'Prénom du tour leader modifié')}/></label><label>Nom<input disabled={!canEditAll} value={selected.leaderLastName} onChange={event => void patch({ leaderLastName: event.target.value }, 'Nom du tour leader modifié')}/></label><label>Téléphone<input disabled={!canEditOperational} type="tel" value={selected.leaderPhone} onChange={event => void patch({ leaderPhone: event.target.value }, 'Téléphone du tour leader modifié', false)}/></label><label>Adresse e-mail<input disabled={!canEditAll} type="email" value={selected.leaderEmail} onChange={event => void patch({ leaderEmail: event.target.value }, 'E-mail du tour leader modifié')}/></label></div></section>
      <section className="meeting-group-block"><div className="meal-planning-head"><div><h3>Salles de réunion</h3><p>{groupBookings.length} réservation(s) liée(s) au groupe.</p></div>{canEditAll && <button onClick={() => setMeetingOpen(true)}><Plus size={15}/>Réserver une salle</button>}</div>{groupBookings.length ? <div className="group-meeting-list">{[...groupBookings].sort((a,b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)).map(booking => <article key={booking.id}><strong>{booking.room}</strong><span>{booking.date} · {booking.start}–{booking.end} · {booking.attendees} pers.</span><small>{booking.setup} · {booking.status === 'CONFIRMED' ? 'Confirmée' : booking.status === 'OPTION' ? 'Option' : 'Bloquée'}</small></article>)}</div> : <p>Aucune salle réservée.</p>}<a href="/salles-reunion">Ouvrir l’agenda complet →</a></section>
      <div className="meal-planning"><div className="meal-planning-head"><div><h3>Planning repas & logement</h3><p>Calcul automatique selon le séjour.</p></div>{canEditAll && <button onClick={() => void regenerate()}>Recalculer</button>}</div><div className="meal-table-wrap"><table className="meal-table"><thead><tr><th>Prestation</th>{selected.mealDays.map(day => <th key={day.date}>{parseDate(day.date).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'})}</th>)}</tr></thead><tbody>{rows.map(row => <tr key={row}><th>{rowLabels[row]}</th>{selected.mealDays.map(day => { const value = day[row]; return <td key={`${day.date}-${row}`} className={value.pax > 0 ? 'meal-active' : ''}><input key={`${selected.id}-${day.date}-${row}-${value.pax}`} disabled={!canEditAll} type="number" min="0" inputMode="numeric" defaultValue={value.pax} onBlur={event => { const next = Math.max(0, Number(event.currentTarget.value || 0)); if (next !== value.pax) void updateMeal(day.date, row, { pax: next }, `Effectif ${rowLabels[row]} modifié`); }} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }}/>{row !== 'lodging' && <><input className="meal-time" disabled={!canEditTimes} type="time" value={value.time} onChange={event => void updateMeal(day.date, row, { time: event.target.value }, `Horaire ${rowLabels[row]} modifié`)}/><div className="meal-supplements"><label><input disabled={!canEditAll || !value.pax} type="checkbox" checked={value.water} onChange={event => void updateMeal(day.date, row, { water: event.target.checked }, 'Supplément eau modifié')}/> Eau</label><label><input disabled={!canEditAll || !value.pax} type="checkbox" checked={value.wine} onChange={event => void updateMeal(day.date, row, { wine: event.target.checked }, 'Supplément vin modifié')}/> Vin</label></div></>}</td>; })}</tr>)}</tbody></table></div></div>
      <details><summary>Historique signé</summary>{selected.audit.slice().reverse().map(item => <p key={item.id}><strong>{item.action}</strong><br/><small>{item.actor} · {item.role} · {item.at}</small></p>)}</details>
    </aside> : <aside className="group-detail panel"><p>Aucun groupe enregistré.</p></aside>}</section>
    {createOpen && <div className="modal-backdrop" onMouseDown={() => setCreateOpen(false)}><form className="modal group-create-modal" onSubmit={event => void create(event)} onMouseDown={event => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">Groupe 360°</p><h2>Nouveau groupe</h2></div><button type="button" className="icon-button" onClick={() => setCreateOpen(false)}><X size={19}/></button></div><label>Nom du groupe<input name="name" required/></label><label>Agence directe<input name="directAgency" required/></label><label>DMC<input name="dmc" placeholder="Optionnel"/></label><label>Arrivée<input name="arrival" type="date" required/></label><label>Départ<input name="departure" type="date" required/></label><label>Pax<input name="pax" type="number" min="1" required/></label><label>Chambres<input name="rooms" type="number" min="1" required/></label><label>Heure d’arrivée<input name="arrivalTime" type="time"/></label><label>Heure de départ<input name="departureTime" type="time"/></label><label>Prénom du tour leader<input name="leaderFirstName"/></label><label>Nom du tour leader<input name="leaderLastName"/></label><label>Téléphone du tour leader<input name="leaderPhone" type="tel"/></label><label>E-mail du tour leader<input name="leaderEmail" type="email"/></label><label>Langue / Nationalité<input name="language"/></label><label>Bus<input name="buses" type="number" min="0" defaultValue="1"/></label><label>Type de séjour<select name="stayType"><option>Logement</option><option>B&B</option><option>1/2 midi</option><option>1/2 Soir</option><option>Pension complète</option></select></label><label>Type de PDJ<select name="breakfastType"><option>Standard</option><option>PDJ Chaud</option><option>Indiv</option></select></label><label>Prestation chambres<select name="housekeepingType"><option>Standard</option><option>Prestation express</option></select></label><label>Bagagerie arrivée<select name="luggageArrival"><option value="">Aucune</option><option>Bagagerie 1</option><option>Bagagerie 2</option><option>Bagagerie 3</option></select></label><label>Bagagerie départ<select name="luggageDeparture"><option value="">Aucune</option><option>Bagagerie 1</option><option>Bagagerie 2</option><option>Bagagerie 3</option></select></label><label>Paiement<select name="paymentStatus"><option>Reste à payer</option><option>Payé</option></select></label><label>Montant restant<input name="amountDue" type="number" min="0" step="0.01"/></label><label>Débiteur<input name="debtor"/></label><label className="wide">Régimes alimentaires et allergies<textarea name="dietary"/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setCreateOpen(false)}>Annuler</button><button className="primary-button" type="submit">Créer et calculer le planning</button></div></form></div>}
    {meetingOpen && selected && <div className="modal-backdrop" onMouseDown={() => setMeetingOpen(false)}><form className="modal group-create-modal" onSubmit={event => void createMeeting(event)} onMouseDown={event => event.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">Salles de réunion</p><h2>Réserver une salle pour {selected.name}</h2></div><button type="button" className="icon-button" onClick={() => setMeetingOpen(false)}><X size={19}/></button></div><label>Salle<select name="room">{meetingRooms.map(room => <option key={room}>{room}</option>)}</select></label><label>Date<input name="date" type="date" defaultValue={selected.arrival} required/></label><label>Début<input name="start" type="time" defaultValue="09:00" required/></label><label>Fin<input name="end" type="time" defaultValue="10:00" required/></label><label>Participants<input name="attendees" type="number" min="1" defaultValue={selected.pax} required/></label><label>Disposition<select name="setup"><option>Théâtre</option><option>Classe</option><option>U</option><option>Conseil</option><option>Cocktail</option></select></label><label>Statut<select name="status"><option value="CONFIRMED">Confirmée</option><option value="OPTION">Option</option><option value="BLOCKED">Bloquée</option></select></label><label className="wide">Consignes opérationnelles<textarea name="notes" placeholder="Matériel, pauses, horaires, installation…"/></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setMeetingOpen(false)}>Annuler</button><button className="primary-button" type="submit">Enregistrer dans l’agenda</button></div></form></div>}
  </div>;
}
