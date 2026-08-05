import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, BedDouble, CheckCircle2, ChefHat, Clock3, Hotel, UsersRound } from 'lucide-react';
import { FunctionSheet, loadFunctionSheets } from './interservice-data';

const services = [
  { key: 'reception', label: 'Réception', icon: Hotel },
  { key: 'restaurant', label: 'Restaurant', icon: UsersRound },
  { key: 'housekeeping', label: 'Housekeeping', icon: BedDouble },
  { key: 'cuisine', label: 'Cuisine', icon: ChefHat },
] as const;

export function InterserviceControlPage() {
  const [items, setItems] = useState<FunctionSheet[]>(loadFunctionSheets);

  useEffect(() => {
    const refresh = () => setItems(loadFunctionSheets());
    window.addEventListener('hospicore:function-sheets', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('hospicore:function-sheets', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const stats = useMemo(() => {
    const meals = items.flatMap((item) => item.meals);
    return {
      groups: items.length,
      arrived: items.filter((item) => item.arrivalStatus === 'Arrivé').length,
      housekeepingPending: items.filter((item) => item.housekeepingStatus === 'À faire').length,
      kitchenPending: meals.filter((meal) => meal.kitchenStatus !== 'Prêt à servir').length,
      acknowledgementsMissing: items.reduce((sum, item) => sum + services.filter((service) => !item.acknowledgements?.[service.key]).length, 0),
    };
  }, [items]);

  function blockers(item: FunctionSheet) {
    const result: string[] = [];
    if (item.arrivalStatus !== 'Arrivé') result.push('Arrivée non confirmée');
    if (item.housekeepingStatus === 'À faire') result.push('Housekeeping à valider');
    if (item.meals.some((meal) => meal.kitchenStatus !== 'Prêt à servir')) result.push('Préparation cuisine en cours');
    const missing = services.filter((service) => !item.acknowledgements?.[service.key]).map((service) => service.label);
    if (missing.length) result.push(`Lecture manquante : ${missing.join(', ')}`);
    return result;
  }

  return <div className="control-page">
    <header className="control-header">
      <div>
        <button onClick={() => { window.location.href = '/'; }}><ArrowLeft size={18}/> Tableau de bord</button>
        <p>HospiCore · Supervision</p>
        <h1>Centre de suivi interservice</h1>
        <span>Visualisez les validations, les opérations en attente et les blocages de chaque groupe.</span>
      </div>
      <button className="control-week" onClick={() => { window.location.href = '/planning-hebdomadaire'; }}>Voir le planning hebdomadaire</button>
    </header>

    <section className="control-kpis">
      <article><UsersRound size={20}/><span>Groupes suivis</span><strong>{stats.groups}</strong></article>
      <article><CheckCircle2 size={20}/><span>Arrivés</span><strong>{stats.arrived}</strong></article>
      <article><BedDouble size={20}/><span>Housekeeping en attente</span><strong>{stats.housekeepingPending}</strong></article>
      <article><ChefHat size={20}/><span>Repas à préparer</span><strong>{stats.kitchenPending}</strong></article>
      <article><AlertTriangle size={20}/><span>Lectures manquantes</span><strong>{stats.acknowledgementsMissing}</strong></article>
    </section>

    <section className="control-list">
      {items.map((item) => {
        const issues = blockers(item);
        return <article className="control-card" key={item.id}>
          <div className="control-title">
            <div><span className={`workflow-status ${item.arrivalStatus.toLowerCase().replace(' ', '-')}`}>{item.arrivalStatus}</span><h2>{item.groupName}</h2><small>{item.pax} pax · {item.arrivalDate} au {item.departureDate}</small></div>
            <strong className={issues.length ? 'control-risk' : 'control-ok'}>{issues.length ? `${issues.length} point${issues.length > 1 ? 's' : ''} à traiter` : 'Tout est prêt'}</strong>
          </div>

          <div className="control-progress">
            {services.map(({ key, label, icon: Icon }) => {
              const ack = item.acknowledgements?.[key];
              return <div className={ack ? 'done' : ''} key={key}><Icon size={18}/><span>{label}</span><strong>{ack ? 'Lu' : 'À lire'}</strong>{ack && <small>{ack.at}</small>}</div>;
            })}
          </div>

          <div className="control-status-grid">
            <div><span>Arrivée</span><strong>{item.arrivalStatus}</strong><small>{item.receptionConfirmedAt || item.arrivalTime || 'Horaire non renseigné'}</small></div>
            <div><span>Housekeeping</span><strong>{item.housekeepingStatus}</strong><small>{item.housekeepingConfirmedAt || 'En attente'}</small></div>
            <div><span>Repas</span><strong>{item.meals.length}</strong><small>{item.meals.filter((meal) => meal.kitchenStatus === 'Prêt à servir').length} prêts à servir</small></div>
          </div>

          {issues.length > 0 && <div className="control-blockers">{issues.map((issue) => <span key={issue}><Clock3 size={15}/>{issue}</span>)}</div>}
        </article>;
      })}
    </section>
  </div>;
}
