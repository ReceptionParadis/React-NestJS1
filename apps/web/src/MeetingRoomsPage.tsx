import { FormEvent, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, Plus, UsersRound, X } from 'lucide-react';

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
};

const rooms = ['Salle Bernadette', 'Salle Massabielle', 'Salle Gavarnie', 'Salle Pic du Midi', 'Salle Gave'];
const demoBookings: Booking[] = [
  { id: '1', title: 'Briefing guides Unitalsi', room: 'Salle Bernadette', date: '2026-08-05', start: '09:00', end: '10:30', attendees: 38, organiser: 'Maria Rossi', service: 'Groupes', setup: 'Théâtre', notes: 'Vidéoprojecteur et eau minérale.', status: 'CONFIRMED' },
  { id: '2', title: 'Réunion équipe réception', room: 'Salle Massabielle', date: '2026-08-05', start: '14:00', end: '15:00', attendees: 10, organiser: 'Thomas', service: 'Réception', setup: 'U', notes: 'Point arrivées groupes.', status: 'CONFIRMED' },
  { id: '3', title: 'Conférence pèlerinage', room: 'Salle Gavarnie', date: '2026-08-06', start: '10:00', end: '12:30', attendees: 95, organiser: 'ORP', service: 'Commercial', setup: 'Théâtre', notes: 'Micro, pupitre et écran.', status: 'OPTION' },
  { id: '4', title: 'Formation sécurité', room: 'Salle Pic du Midi', date: '2026-08-07', start: '08:30', end: '11:30', attendees: 24, organiser: 'Direction', service: 'Direction', setup: 'Classe', notes: 'Salle bloquée pour le personnel.', status: 'BLOCKED' },
];

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

export function MeetingRoomsPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date('2026-08-05T12:00:00')));
  const [bookings, setBookings] = useState<Booking[]>(() => {
    const stored = localStorage.getItem('hospicore.meeting-bookings');
    return stored ? JSON.parse(stored) : demoBookings;
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  }), [weekStart]);

  function save(next: Booking[]) {
    setBookings(next);
    localStorage.setItem('hospicore.meeting-bookings', JSON.stringify(next));
  }

  function openCreate(date?: string, room?: string) {
    setSelected({
      id: '', title: '', room: room || rooms[0], date: date || localDate(days[0]), start: '09:00', end: '10:00', attendees: 10,
      organiser: '', service: 'Réception', setup: 'Théâtre', notes: '', status: 'CONFIRMED',
    });
    setModalOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
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
    };
    save(selected.id ? bookings.map((item) => item.id === selected.id ? booking : item) : [...bookings, booking]);
    setModalOpen(false);
  }

  function changeWeek(offset: number) {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + offset * 7);
    setWeekStart(next);
  }

  return <div className="meeting-page">
    <header className="meeting-header">
      <div><p className="eyebrow">Communication interservice</p><h1>Agenda des salles de réunion</h1><p>Centralisez les réservations, besoins techniques et consignes de mise en place.</p></div>
      <button className="meeting-primary" onClick={() => openCreate()}><Plus size={18} />Nouvelle réservation</button>
    </header>

    <section className="meeting-toolbar">
      <div className="week-navigation">
        <button onClick={() => changeWeek(-1)} aria-label="Semaine précédente"><ChevronLeft size={19} /></button>
        <strong>{days[0].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} — {days[6].toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
        <button onClick={() => changeWeek(1)} aria-label="Semaine suivante"><ChevronRight size={19} /></button>
      </div>
      <button className="meeting-secondary" onClick={() => setWeekStart(startOfWeek(new Date('2026-08-05T12:00:00')))}>Aujourd’hui</button>
    </section>

    <section className="meeting-summary">
      <article><CalendarDays size={20} /><div><strong>{bookings.filter((item) => days.some((day) => localDate(day) === item.date)).length}</strong><span>réservations cette semaine</span></div></article>
      <article><UsersRound size={20} /><div><strong>{bookings.reduce((sum, item) => sum + item.attendees, 0)}</strong><span>participants prévus</span></div></article>
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
          {selected.id && <button type="button" className="meeting-delete" onClick={() => { save(bookings.filter((item) => item.id !== selected.id)); setModalOpen(false); }}>Supprimer</button>}
          <button type="button" className="meeting-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
          <button className="meeting-primary" type="submit">Enregistrer</button>
        </div>
      </form>
    </div>}
  </div>;
}
