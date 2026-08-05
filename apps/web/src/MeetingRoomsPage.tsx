import { FormEvent, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Cloud, LoaderCircle, MapPin, Plus, RefreshCw, UsersRound, X } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type BookingStatus = 'CONFIRMED' | 'OPTION' | 'BLOCKED';
type Booking = {
  id: string;
  title: string;
  room: string;
  date: string;
  start: string;
  end: string;
  attendees: number;
  organiser: string;
  service: string;
  setup: string;
  notes: string;
  status: BookingStatus;
  updatedBy?: string;
  updatedAt?: string;
};

const rooms = ['Salle Bernadette', 'Salle Massabielle', 'Salle Gavarnie', 'Salle Pic du Midi', 'Salle Gave'];
const EMPTY_BOOKINGS: Booking[] = [];

function localDate(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfWeek(value: Date) {
  const date = new Date(value);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function actorName() {
  try {
    const session = JSON.parse(localStorage.getItem('hospicore.session') || '{}');
    const user = session.user || {};
    return `${user.firstName || 'Utilisateur'} ${user.lastName || 'HospiCore'}`.trim();
  } catch {
    return 'Utilisateur HospiCore';
  }
}

export function MeetingRoomsPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const { data: bookings, state, message, updatedAt, refresh, save } = useOperationalStore<Booking[]>('meeting-rooms', EMPTY_BOOKINGS);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);

  const busy = state === 'loading' || state === 'saving';
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  }), [weekStart]);

  function openCreate(date?: string, room?: string) {
    setSelected({
      id: '', title: '', room: room || rooms[0], date: date || localDate(days[0]), start: '09:00', end: '10:00', attendees: 10,
      organiser: '', service: 'Réception', setup: 'Théâtre', notes: '', status: 'CONFIRMED',
    });
    setModalOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    const booking: Booking = {
      ...selected,
      id: selected.id || crypto.randomUUID(),
      title: String(form.get('title') || ''),
      room: String(form.get('room') || rooms[0]),
      date: String(form.get('date') || ''),
      start: String(form.get('start') || ''),
      end: String(form.get('end') || ''),
      attendees: Number(form.get('attendees') || 0),
      organiser: String(form.get('organiser') || ''),
      service: String(form.get('service') || ''),
      setup: String(form.get('setup') || ''),
      notes: String(form.get('notes') || ''),
      status: String(form.get('status') || 'CONFIRMED') as BookingStatus,
      updatedBy: actorName(),
      updatedAt: new Date().toISOString(),
    };
    const next = selected.id ? bookings.map((item) => item.id === selected.id ? booking : item) : [...bookings, booking];
    if (await save(next)) setModalOpen(false);
  }

  async function removeSelected() {
    if (!selected?.id) return;
    if (await save(bookings.filter((item) => item.id !== selected.id))) setModalOpen(false);
  }

  function changeWeek(offset: number) {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + offset * 7);
    setWeekStart(next);
  }

  const SyncIcon = state === 'synced' ? Cloud : state === 'loading' || state === 'saving' ? LoaderCircle : RefreshCw;

  return <div className="meeting-page">
    <header className="meeting-header">
      <div><p className="eyebrow">Communication interservice</p><h1>Agenda des salles de réunion</h1><p>Centralisez les réservations, besoins techniques et consignes de mise en place.</p></div>
      <button className="meeting-primary" disabled={busy} onClick={() => openCreate()}><Plus size={18} />Nouvelle réservation</button>
    </header>

    <section className={`sync-banner ${state === 'synced' ? 'shared' : state}`}>
      <span><SyncIcon size={17} className={busy ? 'spin' : ''}/><strong>{message}</strong>{updatedAt && <small> · {new Date(updatedAt).toLocaleString('fr-FR')}</small>}</span>
      <button onClick={() => void refresh()} disabled={busy}><RefreshCw size={15}/>Actualiser</button>
    </section>

    <section className="meeting-toolbar">
      <div className="week-navigation">
        <button onClick={() => changeWeek(-1)} aria-label="Semaine précédente"><ChevronLeft size={19} /></button>
        <strong>{days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} — {days[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
        <button onClick={() => changeWeek(1)} aria-label="Semaine suivante"><ChevronRight size={19} /></button>
      </div>
      <button className="meeting-secondary" onClick={() => setWeekStart(startOfWeek(new Date()))}>Aujourd’hui</button>
    </section>

    <section className="meeting-summary">
      <article><CalendarDays size={20} /><div><strong>{bookings.filter((item) => days.some((day) => localDate(day) === item.date)).length}</strong><span>réservations cette semaine</span></div></article>
      <article><UsersRound size={20} /><div><strong>{bookings.filter((item) => days.some((day) => localDate(day) === item.date)).reduce((sum, item) => sum + item.attendees, 0)}</strong><span>participants cette semaine</span></div></article>
      <article><Clock3 size={20} /><div><strong>{bookings.filter((item) => item.status === 'OPTION').length}</strong><span>options à confirmer</span></div></article>
    </section>

    <section className="agenda-wrap">
      <div className="agenda-grid agenda-head"><div className="room-column">Salles</div>{days.map((day) => <div key={day.toISOString()}><strong>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</strong><span>{day.getDate()}</span></div>)}</div>
      {rooms.map((room) => <div className="agenda-grid agenda-row" key={room}>
        <div className="room-column"><MapPin size={16} /><strong>{room}</strong></div>
        {days.map((day) => {
          const date = localDate(day);
          const items = bookings.filter((item) => item.room === room && item.date === date).sort((a, b) => a.start.localeCompare(b.start));
          return <button className="agenda-cell" key={date} onClick={() => openCreate(date, room)}>
            {items.map((item) => <span key={item.id} className={`meeting-event ${item.status.toLowerCase()}`} onClick={(event) => { event.stopPropagation(); setSelected(item); setModalOpen(true); }}>
              <time>{item.start}–{item.end}</time><strong>{item.title}</strong><small>{item.attendees} pers. · {item.setup}</small>
            </span>)}
            {items.length === 0 && <em>+ Réserver</em>}
          </button>;
        })}
      </div>)}
    </section>

    {modalOpen && selected && <div className="meeting-modal-backdrop" onMouseDown={() => setModalOpen(false)}>
      <form className="meeting-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="meeting-modal-header"><div><p className="eyebrow">Salle de réunion</p><h2>{selected.id ? 'Modifier la réservation' : 'Nouvelle réservation'}</h2></div><button type="button" onClick={() => setModalOpen(false)}><X size={19} /></button></div>
        <label className="meeting-wide">Intitulé<input name="title" defaultValue={selected.title} required /></label>
        <label>Salle<select name="room" defaultValue={selected.room}>{rooms.map((room) => <option key={room}>{room}</option>)}</select></label>
        <label>Date<input name="date" type="date" defaultValue={selected.date} required /></label>
        <label>Début<input name="start" type="time" defaultValue={selected.start} required /></label>
        <label>Fin<input name="end" type="time" defaultValue={selected.end} required /></label>
        <label>Participants<input name="attendees" type="number" min="1" defaultValue={selected.attendees} required /></label>
        <label>Organisateur<input name="organiser" defaultValue={selected.organiser} required /></label>
        <label>Service<select name="service" defaultValue={selected.service}><option>Réception</option><option>Groupes</option><option>Commercial</option><option>Direction</option><option>Restaurant</option><option>Maintenance</option></select></label>
        <label>Disposition<select name="setup" defaultValue={selected.setup}><option>Théâtre</option><option>Classe</option><option>U</option><option>Conseil</option><option>Cocktail</option></select></label>
        <label>Statut<select name="status" defaultValue={selected.status}><option value="CONFIRMED">Confirmée</option><option value="OPTION">Option</option><option value="BLOCKED">Bloquée</option></select></label>
        <label className="meeting-wide">Consignes interservices<textarea name="notes" defaultValue={selected.notes} placeholder="Mise en place, matériel, restauration, nettoyage…" /></label>
        <div className="meeting-modal-actions">
          {selected.id && <button type="button" className="meeting-delete" disabled={busy} onClick={() => void removeSelected()}>Supprimer</button>}
          <button type="button" className="meeting-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
          <button className="meeting-primary" disabled={busy} type="submit">Enregistrer et partager</button>
        </div>
      </form>
    </div>}
  </div>;
}
