import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChefHat, Clock3, Coffee, Salad, Search, Soup, UsersRound } from 'lucide-react';
import { FunctionSheet, loadFunctionSheets, MealService } from './interservice-data';

const mealIcons = { 'Petit-déjeuner': Coffee, 'Déjeuner': Salad, 'Dîner': Soup };

export function RestaurantPlanningPage() {
  const [service, setService] = useState<'Tous' | MealService>('Tous');
  const [query, setQuery] = useState('');
  const [sheets, setSheets] = useState<FunctionSheet[]>(loadFunctionSheets);

  useEffect(() => {
    const refresh = () => setSheets(loadFunctionSheets());
    window.addEventListener('hospicore:function-sheets', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('hospicore:function-sheets', refresh); window.removeEventListener('storage', refresh); };
  }, []);

  const rows = useMemo(() => sheets.flatMap((sheet) => sheet.meals.map((meal) => ({ sheet, meal }))).filter(({ sheet, meal }) => {
    return (service === 'Tous' || meal.service === service) && `${sheet.groupName} ${meal.room}`.toLowerCase().includes(query.toLowerCase());
  }), [sheets, service, query]);

  const totals = useMemo(() => (['Petit-déjeuner', 'Déjeuner', 'Dîner'] as MealService[]).map((mealService) => ({
    service: mealService,
    pax: sheets.flatMap((sheet) => sheet.meals).filter((meal) => meal.service === mealService).reduce((sum, meal) => sum + meal.pax, 0),
  })), [sheets]);

  return <div className="restaurant-page">
    <header className="restaurant-header"><div><button className="restaurant-back" onClick={() => { window.location.href = '/'; }}><ArrowLeft size={18} /> Tableau de bord</button><p className="restaurant-eyebrow">Réception · Restaurant</p><h1>Planning Restaurant</h1><p>Les groupes marqués arrivés par la réception passent automatiquement en prévu pour leur prochain service.</p></div><div className="restaurant-date"><ChefHat size={22} /><div><strong>Service groupes</strong><span>Mise à jour interservice</span></div></div></header>

    <section className="restaurant-kpis">{totals.map(({ service: mealService, pax }) => { const Icon = mealIcons[mealService]; return <article key={mealService}><Icon size={20} /><span>{mealService}</span><strong>{pax}</strong><small>couverts groupes</small></article>; })}<article><CheckCircle2 size={20} /><span>Groupes arrivés</span><strong>{sheets.filter((sheet) => sheet.arrivalStatus === 'Arrivé').length}/{sheets.length}</strong><small>confirmés par la réception</small></article></section>

    <section className="restaurant-toolbar"><div className="meal-tabs">{(['Tous', 'Petit-déjeuner', 'Déjeuner', 'Dîner'] as const).map((item) => <button className={service === item ? 'active' : ''} onClick={() => setService(item)} key={item}>{item}</button>)}</div><label><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher un groupe…" /></label></section>

    <section className="restaurant-list">{rows.map(({ sheet, meal }) => { const Icon = mealIcons[meal.service]; const restaurantStatus = sheet.arrivalStatus === 'Arrivé' ? 'Prévu' : sheet.arrivalStatus; return <article className="restaurant-group-card" key={`${sheet.id}-${meal.service}`}><div className="meal-icon"><Icon size={22} /></div><div className="group-main"><div className="group-heading"><div><span className="meal-label">{meal.service}</span><h2>{sheet.groupName}</h2></div><span className={`arrival-badge ${restaurantStatus.toLowerCase().replace(' ', '-')}`}>{restaurantStatus}</span></div><div className="group-details"><span><Clock3 size={16} /><strong>{meal.time || (sheet.arrivalStatus === 'Arrivé' ? 'En attente de l’horaire' : 'Horaire à confirmer')}</strong></span><span><UsersRound size={16} /><strong>{meal.pax} pax</strong></span><span><ChefHat size={16} />{meal.room}</span></div>{(meal.diets || meal.notes) && <div className="group-notes">{meal.diets && <span><strong>Régimes :</strong> {meal.diets}</span>}{meal.notes && <span><strong>Consigne :</strong> {meal.notes}</span>}</div>}</div><div className="reception-status"><span>Information réception</span><strong>{sheet.arrivalStatus}</strong><small>{sheet.receptionConfirmedAt ? `Arrivée confirmée à ${sheet.receptionConfirmedAt}` : `Arrivée prévue à ${sheet.arrivalTime || 'confirmer'}`}</small></div></article>; })}</section>
  </div>;
}
