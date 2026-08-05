import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, ChefHat, ClipboardList, Coffee, Hotel, Printer, Sparkles, UsersRound } from 'lucide-react';
import { FunctionSheet, loadFunctionSheets, MealService } from './interservice-data';

type View = 'Tous' | 'Réception' | 'Restaurant' | 'Cuisine' | 'Housekeeping' | 'Commercial';

const views: { label: View; icon: typeof Hotel }[] = [
  { label: 'Tous', icon: CalendarDays },
  { label: 'Réception', icon: Hotel },
  { label: 'Restaurant', icon: Coffee },
  { label: 'Cuisine', icon: ChefHat },
  { label: 'Housekeeping', icon: Sparkles },
  { label: 'Commercial', icon: ClipboardList },
];

const dayLabels = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function startOfWeek(date = new Date()) {
  const current = new Date(date);
  const day = current.getDay() || 7;
  current.setDate(current.getDate() - day + 1);
  current.setHours(0, 0, 0, 0);
  return current;
}

function iso(date: Date) { return date.toISOString().slice(0, 10); }
function shortDate(date: Date) { return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }); }

function serviceSummary(sheet: FunctionSheet, view: View) {
  if (view === 'Réception') return sheet.receptionNotes || `Arrivée prévue à ${sheet.arrivalTime || 'confirmer'}`;
  if (view === 'Housekeeping') return `${sheet.housekeepingStatus} · ${sheet.housekeepingNotes || 'Aucune consigne'}`;
  if (view === 'Cuisine') return sheet.kitchenNotes || 'Aucune consigne cuisine';
  if (view === 'Commercial') return sheet.commercialNotes || `${sheet.agency} · ${sheet.leader}`;
  if (view === 'Restaurant') return sheet.meals.map((meal) => `${meal.service} ${meal.time || 'horaire à confirmer'} · ${meal.pax} pax`).join(' | ');
  return `${sheet.arrivalStatus} · ${sheet.meals.length} service(s) repas · ${sheet.housekeepingStatus}`;
}

export function WeeklyPlanningPage() {
  const [items, setItems] = useState<FunctionSheet[]>(loadFunctionSheets);
  const [view, setView] = useState<View>('Tous');
  const [weekStart, setWeekStart] = useState(startOfWeek);

  useEffect(() => {
    const refresh = () => setItems(loadFunctionSheets());
    window.addEventListener('hospicore:function-sheets', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('hospicore:function-sheets', refresh); window.removeEventListener('storage', refresh); };
  }, []);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  }), [weekStart]);

  const weekItems = useMemo(() => items.filter((item) => item.arrivalDate <= iso(days[6]) && item.departureDate >= iso(days[0])), [items, days]);

  function shiftWeek(offset: number) {
    setWeekStart((current) => { const next = new Date(current); next.setDate(next.getDate() + offset * 7); return next; });
  }

  return <div className="weekly-page">
    <header className="weekly-header">
      <div>
        <button onClick={() => { window.location.href = '/'; }}><ArrowLeft size={18} /> Tableau de bord</button>
        <p>HospiCore · Fiches de fonction</p>
        <h1><CalendarDays size={30} /> Planning hebdomadaire interservice</h1>
        <span>Une vue commune, filtrable par service, alimentée par les fiches commerciales.</span>
      </div>
      <button className="weekly-print" onClick={() => window.print()}><Printer size={18} /> Imprimer la semaine</button>
    </header>

    <section className="weekly-controls">
      <div className="weekly-nav"><button onClick={() => shiftWeek(-1)}>Semaine précédente</button><strong>{shortDate(days[0])} — {shortDate(days[6])}</strong><button onClick={() => shiftWeek(1)}>Semaine suivante</button></div>
      <div className="weekly-tabs">{views.map(({ label, icon: Icon }) => <button key={label} className={view === label ? 'active' : ''} onClick={() => setView(label)}><Icon size={16} /> {label}</button>)}</div>
    </section>

    <section className="weekly-grid">
      {days.map((day, index) => {
        const date = iso(day);
        const active = weekItems.filter((item) => item.arrivalDate <= date && item.departureDate >= date);
        return <article className="weekly-day" key={date}>
          <header><span>{dayLabels[index]}</span><strong>{shortDate(day)}</strong><small>{active.length} groupe(s)</small></header>
          <div className="weekly-day-content">
            {active.length === 0 ? <p className="weekly-empty">Aucun groupe prévu</p> : active.map((sheet) => {
              const mealsToday = sheet.meals as { service: MealService; time: string; pax: number }[];
              return <div className="weekly-card" key={`${date}-${sheet.id}`}>
                <div><span className={`workflow-status ${sheet.arrivalStatus.toLowerCase().replace(' ', '-')}`}>{sheet.arrivalStatus}</span><h2>{sheet.groupName}</h2><small><UsersRound size={13} /> {sheet.pax} pax</small></div>
                <p>{serviceSummary(sheet, view)}</p>
                {(view === 'Tous' || view === 'Restaurant' || view === 'Cuisine') && mealsToday.length > 0 && <div className="weekly-meals">{mealsToday.map((meal) => <span key={meal.service}>{meal.service} · {meal.time || 'à confirmer'}</span>)}</div>}
              </div>;
            })}
          </div>
        </article>;
      })}
    </section>
  </div>;
}
