import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChefHat, Clock3, Coffee, Filter, Salad, Search, Soup, UsersRound } from 'lucide-react';
import { FunctionSheet, loadFunctionSheets, markMealRestaurantStatus, MealService, RestaurantStatus } from './interservice-data';

const mealIcons = { 'Petit-déjeuner': Coffee, 'Déjeuner': Salad, 'Dîner': Soup };

export function RestaurantPlanningPage() {
  const [meal, setMeal] = useState<'Tous' | MealService>('Tous');
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState<FunctionSheet[]>(loadFunctionSheets);

  useEffect(() => {
    const refresh = () => setGroups(loadFunctionSheets());
    window.addEventListener('hospicore:function-sheets', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('hospicore:function-sheets', refresh); window.removeEventListener('storage', refresh); };
  }, []);

  const rows = useMemo(() => groups.flatMap((group) => group.meals.map((mealPlan) => ({ group, mealPlan }))).filter(({ group, mealPlan }) => {
    const matchesMeal = meal === 'Tous' || mealPlan.service === meal;
    const matchesQuery = `${group.groupName} ${mealPlan.room}`.toLowerCase().includes(query.toLowerCase());
    return matchesMeal && matchesQuery;
  }), [groups, meal, query]);

  const totals = useMemo(() => ({
    breakfast: groups.flatMap((g) => g.meals).filter((m) => m.service === 'Petit-déjeuner').reduce((sum, m) => sum + m.pax, 0),
    lunch: groups.flatMap((g) => g.meals).filter((m) => m.service === 'Déjeuner').reduce((sum, m) => sum + m.pax, 0),
    dinner: groups.flatMap((g) => g.meals).filter((m) => m.service === 'Dîner').reduce((sum, m) => sum + m.pax, 0),
    arrived: groups.filter((g) => g.arrivalStatus === 'Arrivé').length,
  }), [groups]);

  function updateService(groupId: string, service: MealService, status: RestaurantStatus) {
    setGroups(markMealRestaurantStatus(groupId, service, status));
  }

  return <div className="restaurant-page">
    <header className="restaurant-header">
      <div><button className="restaurant-back" onClick={() => { window.location.href = '/'; }}><ArrowLeft size={18}/> Tableau de bord</button><p className="restaurant-eyebrow">Communication Réception · Cuisine · Restaurant</p><h1>Planning Restaurant</h1><p>Suivez les groupes arrivés, les horaires de repas et l’état de préparation transmis par la cuisine.</p></div>
      <div className="restaurant-date"><ChefHat size={22}/><div><strong>Mercredi 5 août</strong><span>Service du jour</span></div></div>
    </header>

    <section className="restaurant-kpis">
      <article><Coffee size={20}/><span>Petit-déjeuner</span><strong>{totals.breakfast}</strong><small>couverts groupes</small></article>
      <article><Salad size={20}/><span>Déjeuner</span><strong>{totals.lunch}</strong><small>couverts groupes</small></article>
      <article><Soup size={20}/><span>Dîner</span><strong>{totals.dinner}</strong><small>couverts groupes</small></article>
      <article><CheckCircle2 size={20}/><span>Groupes arrivés</span><strong>{totals.arrived}/{groups.length}</strong><small>confirmés par la réception</small></article>
    </section>

    <section className="restaurant-toolbar"><div className="meal-tabs">{(['Tous', 'Petit-déjeuner', 'Déjeuner', 'Dîner'] as const).map((item) => <button className={meal === item ? 'active' : ''} onClick={() => setMeal(item)} key={item}>{item}</button>)}</div><label><Search size={17}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un groupe…"/></label><button className="filter-button"><Filter size={17}/> Filtres</button></section>

    <section className="restaurant-list">{rows.map(({ group, mealPlan }) => {
      const Icon = mealIcons[mealPlan.service];
      const arrivalLabel = group.arrivalStatus === 'Arrivé' ? (mealPlan.time ? 'Prévu' : 'En attente de l’horaire') : group.arrivalStatus;
      return <article className="restaurant-group-card" key={`${group.id}-${mealPlan.service}`}>
        <div className="meal-icon"><Icon size={22}/></div>
        <div className="group-main"><div className="group-heading"><div><span className="meal-label">{mealPlan.service}</span><h2>{group.groupName}</h2></div><span className={`arrival-badge ${group.arrivalStatus.toLowerCase().replace(' ', '-')}`}>{arrivalLabel}</span></div><div className="group-details"><span><Clock3 size={16}/><strong>{mealPlan.time || 'Horaire à confirmer'}</strong></span><span><UsersRound size={16}/><strong>{mealPlan.pax} pax</strong></span><span><ChefHat size={16}/>{mealPlan.room}</span></div>{(mealPlan.diets || mealPlan.notes) && <div className="group-notes">{mealPlan.diets && <span><strong>Régimes :</strong> {mealPlan.diets}</span>}{mealPlan.notes && <span><strong>Consigne :</strong> {mealPlan.notes}</span>}</div>}</div>
        <div className="reception-status"><span>Cuisine</span><strong>{mealPlan.kitchenStatus}</strong><small>{mealPlan.kitchenConfirmedAt ? `Validé à ${mealPlan.kitchenConfirmedAt}` : 'En cours de préparation'}</small><span>Restaurant</span><strong>{mealPlan.restaurantStatus}</strong>{group.arrivalStatus === 'Arrivé' && mealPlan.kitchenStatus === 'Prêt à servir' && mealPlan.restaurantStatus === 'Prévu' && <button onClick={() => updateService(group.id, mealPlan.service, 'En salle')}>Groupe en salle</button>}{mealPlan.restaurantStatus === 'En salle' && <button onClick={() => updateService(group.id, mealPlan.service, 'Terminé')}>Service terminé</button>}{mealPlan.restaurantStatus === 'Terminé' && <small>Terminé à {mealPlan.restaurantConfirmedAt}</small>}</div>
      </article>;
    })}</section>
  </div>;
}
