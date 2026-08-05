import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChefHat, Clock3, Coffee, Filter, Salad, Search, Soup, UsersRound } from 'lucide-react';

type Meal = 'Petit-déjeuner' | 'Déjeuner' | 'Dîner';
type ArrivalStatus = 'Arrivé' | 'En route' | 'Non arrivé';

type RestaurantGroup = {
  id: string;
  name: string;
  pax: number;
  meal: Meal;
  time: string;
  room: string;
  arrivalStatus: ArrivalStatus;
  receptionTime?: string;
  allergies?: string;
  notes?: string;
};

const demoGroups: RestaurantGroup[] = [
  { id: '1', name: 'Marian Pilgrimages', pax: 54, meal: 'Petit-déjeuner', time: '07:00', room: 'Restaurant principal', arrivalStatus: 'Arrivé', receptionTime: 'Hier 18:42', allergies: '2 sans gluten', notes: 'Départ bus à 08:15' },
  { id: '2', name: 'Hermès Tours', pax: 42, meal: 'Déjeuner', time: '12:15', room: 'Restaurant principal', arrivalStatus: 'Arrivé', receptionTime: '10:08', allergies: '1 végétarien' },
  { id: '3', name: 'Unitalsi', pax: 82, meal: 'Dîner', time: '19:00', room: 'Salle Gavarnie', arrivalStatus: 'En route', notes: 'Arrivée estimée réception 17:45' },
  { id: '4', name: 'Joe Walsh Tours', pax: 31, meal: 'Dîner', time: '19:30', room: 'Restaurant principal', arrivalStatus: 'Non arrivé', allergies: '3 végétariens', notes: 'Paiement en attente à la réception' },
  { id: '5', name: 'ORP', pax: 62, meal: 'Dîner', time: '20:00', room: 'Salle Bernadette', arrivalStatus: 'En route', allergies: '1 sans lactose' },
];

const mealIcons = { 'Petit-déjeuner': Coffee, 'Déjeuner': Salad, 'Dîner': Soup };

export function RestaurantPlanningPage() {
  const [meal, setMeal] = useState<'Tous' | Meal>('Tous');
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState(demoGroups);

  const filtered = useMemo(() => groups.filter((group) => {
    const matchesMeal = meal === 'Tous' || group.meal === meal;
    const matchesQuery = `${group.name} ${group.room}`.toLowerCase().includes(query.toLowerCase());
    return matchesMeal && matchesQuery;
  }), [groups, meal, query]);

  const totals = useMemo(() => ({
    breakfast: groups.filter((g) => g.meal === 'Petit-déjeuner').reduce((sum, g) => sum + g.pax, 0),
    lunch: groups.filter((g) => g.meal === 'Déjeuner').reduce((sum, g) => sum + g.pax, 0),
    dinner: groups.filter((g) => g.meal === 'Dîner').reduce((sum, g) => sum + g.pax, 0),
    arrived: groups.filter((g) => g.arrivalStatus === 'Arrivé').length,
  }), [groups]);

  function markArrived(id: string) {
    setGroups((current) => current.map((group) => group.id === id
      ? { ...group, arrivalStatus: 'Arrivé', receptionTime: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }
      : group));
  }

  return <div className="restaurant-page">
    <header className="restaurant-header">
      <div>
        <button className="restaurant-back" onClick={() => { window.location.href = '/'; }}><ArrowLeft size={18} /> Tableau de bord</button>
        <p className="restaurant-eyebrow">Communication Réception · Restaurant</p>
        <h1>Planning Restaurant</h1>
        <p>Suivez les groupes attendus, les horaires de repas et leur arrivée à la réception.</p>
      </div>
      <div className="restaurant-date"><ChefHat size={22} /><div><strong>Mercredi 5 août</strong><span>Service du jour</span></div></div>
    </header>

    <section className="restaurant-kpis">
      <article><Coffee size={20} /><span>Petit-déjeuner</span><strong>{totals.breakfast}</strong><small>couverts groupes</small></article>
      <article><Salad size={20} /><span>Déjeuner</span><strong>{totals.lunch}</strong><small>couverts groupes</small></article>
      <article><Soup size={20} /><span>Dîner</span><strong>{totals.dinner}</strong><small>couverts groupes</small></article>
      <article><CheckCircle2 size={20} /><span>Groupes arrivés</span><strong>{totals.arrived}/{groups.length}</strong><small>confirmés par la réception</small></article>
    </section>

    <section className="restaurant-toolbar">
      <div className="meal-tabs">
        {(['Tous', 'Petit-déjeuner', 'Déjeuner', 'Dîner'] as const).map((item) => <button className={meal === item ? 'active' : ''} onClick={() => setMeal(item)} key={item}>{item}</button>)}
      </div>
      <label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un groupe…" /></label>
      <button className="filter-button"><Filter size={17} /> Filtres</button>
    </section>

    <section className="restaurant-list">
      {filtered.map((group) => {
        const Icon = mealIcons[group.meal];
        return <article className="restaurant-group-card" key={group.id}>
          <div className="meal-icon"><Icon size={22} /></div>
          <div className="group-main">
            <div className="group-heading"><div><span className="meal-label">{group.meal}</span><h2>{group.name}</h2></div><span className={`arrival-badge ${group.arrivalStatus.toLowerCase().replace(' ', '-')}`}>{group.arrivalStatus}</span></div>
            <div className="group-details">
              <span><Clock3 size={16} /><strong>{group.time}</strong></span>
              <span><UsersRound size={16} /><strong>{group.pax} pax</strong></span>
              <span><ChefHat size={16} />{group.room}</span>
            </div>
            {(group.allergies || group.notes) && <div className="group-notes">{group.allergies && <span><strong>Régimes :</strong> {group.allergies}</span>}{group.notes && <span><strong>Consigne :</strong> {group.notes}</span>}</div>}
          </div>
          <div className="reception-status">
            <span>Statut réception</span>
            <strong>{group.arrivalStatus}</strong>
            <small>{group.receptionTime ? `Confirmé à ${group.receptionTime}` : 'En attente de confirmation'}</small>
            {group.arrivalStatus !== 'Arrivé' && <button onClick={() => markArrived(group.id)}>Marquer arrivé</button>}
          </div>
        </article>;
      })}
    </section>
  </div>;
}
