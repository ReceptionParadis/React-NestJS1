import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BedDouble, CheckCircle2, ChefHat, ClipboardEdit, Clock3, Hotel, Plus, Printer, Save, UsersRound } from 'lucide-react';
import { FunctionSheet, loadFunctionSheets, markGroupArrived, MealService, saveFunctionSheets } from './interservice-data';

type Department = 'reception' | 'housekeeping' | 'cuisine' | 'commercial';

const departmentConfig = {
  reception: { title: 'Interface Réception', subtitle: 'Confirmez les arrivées et diffusez l’information aux services.', icon: Hotel },
  housekeeping: { title: 'Interface Housekeeping', subtitle: 'Consultez les groupes, priorités et consignes d’étages.', icon: BedDouble },
  cuisine: { title: 'Interface Cuisine', subtitle: 'Anticipez les volumes, régimes et horaires de service.', icon: ChefHat },
  commercial: { title: 'Interface Commercial', subtitle: 'Éditez les fiches de fonction hebdomadaires des groupes.', icon: ClipboardEdit },
};

function emptyFunctionSheet(): FunctionSheet {
  return {
    id: crypto.randomUUID(),
    groupName: '',
    arrivalDate: '',
    departureDate: '',
    arrivalTime: '',
    pax: 0,
    agency: '',
    leader: '',
    arrivalStatus: 'Prévu',
    meals: [],
    receptionNotes: '',
    housekeepingNotes: '',
    kitchenNotes: '',
    commercialNotes: '',
  };
}

export function InterservicePage({ department }: { department: Department }) {
  const config = departmentConfig[department];
  const Icon = config.icon;
  const [items, setItems] = useState<FunctionSheet[]>(loadFunctionSheets);
  const [editing, setEditing] = useState<FunctionSheet | null>(null);

  useEffect(() => {
    const refresh = () => setItems(loadFunctionSheets());
    window.addEventListener('hospicore:function-sheets', refresh);
    return () => window.removeEventListener('hospicore:function-sheets', refresh);
  }, []);

  const mealTotals = useMemo(() => items.flatMap((item) => item.meals).reduce((acc, meal) => {
    acc[meal.service] = (acc[meal.service] || 0) + meal.pax;
    return acc;
  }, {} as Record<MealService, number>), [items]);

  function confirmArrival(id: string) {
    setItems(markGroupArrived(id));
  }

  function saveSheet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const base: FunctionSheet = editing ?? emptyFunctionSheet();
    const meals: FunctionSheet['meals'] = (['Petit-déjeuner', 'Déjeuner', 'Dîner'] as MealService[]).flatMap((service) => {
      const enabled = form.get(`${service}-enabled`) === 'on';
      return enabled ? [{
        service,
        time: String(form.get(`${service}-time`) || ''),
        pax: Number(form.get(`${service}-pax`) || form.get('pax') || 0),
        room: String(form.get(`${service}-room`) || 'Restaurant principal'),
        diets: String(form.get(`${service}-diets`) || ''),
        notes: String(form.get(`${service}-notes`) || ''),
      }] : [];
    });
    const value: FunctionSheet = {
      ...base,
      groupName: String(form.get('groupName') || ''), agency: String(form.get('agency') || ''), leader: String(form.get('leader') || ''),
      arrivalDate: String(form.get('arrivalDate') || ''), departureDate: String(form.get('departureDate') || ''), arrivalTime: String(form.get('arrivalTime') || ''),
      pax: Number(form.get('pax') || 0), meals,
      receptionNotes: String(form.get('receptionNotes') || ''), housekeepingNotes: String(form.get('housekeepingNotes') || ''),
      kitchenNotes: String(form.get('kitchenNotes') || ''), commercialNotes: String(form.get('commercialNotes') || ''),
    };
    const next = items.some((item) => item.id === value.id) ? items.map((item) => item.id === value.id ? value : item) : [...items, value];
    saveFunctionSheets(next); setItems(next); setEditing(null);
  }

  return <div className="interservice-page">
    <header className="interservice-header">
      <div><button onClick={() => { window.location.href = '/'; }}><ArrowLeft size={18} /> Tableau de bord</button><p>HospiCore · Communication interservice</p><h1><Icon size={30} /> {config.title}</h1><span>{config.subtitle}</span></div>
      {department === 'commercial' && <button className="interservice-primary" onClick={() => setEditing(emptyFunctionSheet())}><Plus size={18} /> Nouvelle fiche de fonction</button>}
    </header>

    {department === 'cuisine' && <section className="interservice-kpis">
      {(['Petit-déjeuner', 'Déjeuner', 'Dîner'] as MealService[]).map((service) => <article key={service}><span>{service}</span><strong>{mealTotals[service] || 0}</strong><small>couverts groupes</small></article>)}
    </section>}

    <section className="function-sheet-list">
      {items.map((item) => <article className="function-sheet-card" key={item.id}>
        <div className="function-sheet-title"><div><span className={`workflow-status ${item.arrivalStatus.toLowerCase().replace(' ', '-')}`}>{item.arrivalStatus}</span><h2>{item.groupName}</h2><small>{item.agency} · {item.pax} pax · {item.arrivalDate} au {item.departureDate}</small></div><UsersRound size={24} /></div>

        {department === 'reception' && <div className="department-block"><strong>Arrivée prévue à {item.arrivalTime || 'confirmer'}</strong><p>{item.receptionNotes || 'Aucune consigne réception.'}</p>{item.arrivalStatus !== 'Arrivé' ? <button className="interservice-primary" onClick={() => confirmArrival(item.id)}><CheckCircle2 size={17} /> Marquer le groupe arrivé</button> : <small>Arrivée confirmée à {item.receptionConfirmedAt}</small>}</div>}

        {department === 'housekeeping' && <div className="department-block"><strong>Consignes Housekeeping</strong><p>{item.housekeepingNotes || 'Aucune consigne particulière.'}</p><small>Arrivée : {item.arrivalStatus} · {item.arrivalTime || 'horaire à confirmer'}</small></div>}

        {department === 'cuisine' && <div className="department-block"><strong>Préparation cuisine</strong><p>{item.kitchenNotes || 'Aucune consigne particulière.'}</p></div>}

        <div className="meal-function-grid">
          {item.meals.map((meal) => <div className="meal-function" key={`${item.id}-${meal.service}`}><span>{meal.service}</span><strong><Clock3 size={15} /> {meal.time || (item.arrivalStatus === 'Arrivé' ? 'En attente de l’horaire' : 'Horaire à confirmer')}</strong><small>{meal.pax} pax · {meal.room}</small>{meal.diets && <em>{meal.diets}</em>}{meal.notes && <p>{meal.notes}</p>}</div>)}
        </div>

        {department === 'commercial' && <div className="commercial-actions"><button onClick={() => setEditing(item)}><ClipboardEdit size={16} /> Modifier</button><button onClick={() => window.print()}><Printer size={16} /> Imprimer</button></div>}
      </article>)}
    </section>

    {editing && <div className="function-modal"><form onSubmit={saveSheet} className="function-form"><header><div><p>Commercial</p><h2>Fiche de fonction groupe</h2></div><button type="button" onClick={() => setEditing(null)}>Fermer</button></header>
      <div className="form-grid"><label>Nom du groupe<input name="groupName" defaultValue={editing.groupName} required /></label><label>Agence<input name="agency" defaultValue={editing.agency} /></label><label>Chef de groupe<input name="leader" defaultValue={editing.leader} /></label><label>Nombre de personnes<input name="pax" type="number" defaultValue={editing.pax} required /></label><label>Arrivée<input name="arrivalDate" type="date" defaultValue={editing.arrivalDate} required /></label><label>Heure arrivée<input name="arrivalTime" type="time" defaultValue={editing.arrivalTime} /></label><label>Départ<input name="departureDate" type="date" defaultValue={editing.departureDate} required /></label></div>
      <h3>Services repas</h3>{(['Petit-déjeuner', 'Déjeuner', 'Dîner'] as MealService[]).map((service) => { const meal = editing.meals.find((m) => m.service === service); return <fieldset key={service}><legend><label><input type="checkbox" name={`${service}-enabled`} defaultChecked={Boolean(meal)} /> {service}</label></legend><div className="form-grid"><label>Heure<input type="time" name={`${service}-time`} defaultValue={meal?.time} /></label><label>Pax<input type="number" name={`${service}-pax`} defaultValue={meal?.pax || editing.pax} /></label><label>Salle<input name={`${service}-room`} defaultValue={meal?.room || 'Restaurant principal'} /></label><label>Régimes<input name={`${service}-diets`} defaultValue={meal?.diets} /></label><label className="wide">Consignes<input name={`${service}-notes`} defaultValue={meal?.notes} /></label></div></fieldset>; })}
      <div className="form-grid"><label className="wide">Réception<textarea name="receptionNotes" defaultValue={editing.receptionNotes} /></label><label className="wide">Housekeeping<textarea name="housekeepingNotes" defaultValue={editing.housekeepingNotes} /></label><label className="wide">Cuisine<textarea name="kitchenNotes" defaultValue={editing.kitchenNotes} /></label><label className="wide">Commercial<textarea name="commercialNotes" defaultValue={editing.commercialNotes} /></label></div>
      <footer><button type="button" onClick={() => setEditing(null)}>Annuler</button><button className="interservice-primary" type="submit"><Save size={17} /> Enregistrer la fiche</button></footer>
    </form></div>}
  </div>;
}
