import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, Package, PackagePlus, Plus, RefreshCw, Search, Wrench, X } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type LoanStatus = 'En cours' | 'Restitué';
type EquipmentStatus = 'Disponible' | 'Prêté' | 'Maintenance';
type History = { id: string; action: string; actor: string; role: string; at: string };
type Loan = { id: string; reference: string; inventoryNumber: string; itemType: string; clientName: string; room: string; startAt: string; expectedEndAt: string; status: LoanStatus; history: History[] };
type Equipment = { id: string; inventoryNumber: string; itemType: string; label: string; location: string; condition: string; status: EquipmentStatus; updatedBy: string; updatedAt: string };
type Store = { loans: Loan[]; equipment: Equipment[] };

const INITIAL: Store = { loans: [], equipment: [] };

function actor() {
  try {
    const session = JSON.parse(localStorage.getItem('hospicore.session') || '{}');
    const user = session.user || {};
    return { name: `${user.firstName || 'Utilisateur'} ${user.lastName || 'HospiCore'}`.trim(), role: user.role || 'Collaborateur' };
  } catch {
    return { name: 'Utilisateur HospiCore', role: 'Collaborateur' };
  }
}

function stamp() {
  return new Date().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function OperationsCenterV2Page() {
  const store = useOperationalStore<Store>('operations-center', INITIAL);
  const [tab, setTab] = useState<'prets' | 'inventaire'>('prets');
  const [query, setQuery] = useState('');
  const [loanOpen, setLoanOpen] = useState(false);
  const [equipmentOpen, setEquipmentOpen] = useState(false);

  const loans = useMemo(() => store.data.loans.filter((item) => `${item.reference} ${item.clientName} ${item.room} ${item.itemType}`.toLowerCase().includes(query.toLowerCase())), [store.data.loans, query]);
  const equipment = useMemo(() => store.data.equipment.filter((item) => `${item.inventoryNumber} ${item.label} ${item.itemType} ${item.location}`.toLowerCase().includes(query.toLowerCase())), [store.data.equipment, query]);
  const overdue = store.data.loans.filter((item) => item.status === 'En cours' && new Date(item.expectedEndAt) < new Date()).length;

  async function createEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const user = actor();
    const item: Equipment = {
      id: crypto.randomUUID(),
      inventoryNumber: String(form.get('inventoryNumber') || ''),
      itemType: String(form.get('itemType') || ''),
      label: String(form.get('label') || ''),
      location: String(form.get('location') || 'Réception'),
      condition: String(form.get('condition') || 'Bon état'),
      status: 'Disponible',
      updatedBy: user.name,
      updatedAt: stamp(),
    };
    if (await store.save({ ...store.data, equipment: [item, ...store.data.equipment] })) setEquipmentOpen(false);
  }

  async function createLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const inventoryNumber = String(form.get('inventoryNumber') || '');
    const equipmentItem = store.data.equipment.find((item) => item.inventoryNumber === inventoryNumber && item.status === 'Disponible');
    if (!equipmentItem) return;
    const user = actor();
    const reference = `OP-${new Date().getFullYear()}-${String(store.data.loans.length + 1).padStart(6, '0')}`;
    const loan: Loan = {
      id: crypto.randomUUID(), reference, inventoryNumber, itemType: equipmentItem.itemType,
      clientName: String(form.get('clientName') || ''), room: String(form.get('room') || ''),
      startAt: String(form.get('startAt') || ''), expectedEndAt: String(form.get('expectedEndAt') || ''), status: 'En cours',
      history: [{ id: crypto.randomUUID(), action: 'Prêt créé et matériel remis', actor: user.name, role: user.role, at: stamp() }],
    };
    const next: Store = {
      loans: [loan, ...store.data.loans],
      equipment: store.data.equipment.map((item) => item.id === equipmentItem.id ? { ...item, status: 'Prêté', location: `Chambre ${loan.room}`, updatedBy: user.name, updatedAt: stamp() } : item),
    };
    if (await store.save(next)) setLoanOpen(false);
  }

  async function closeLoan(id: string) {
    const loan = store.data.loans.find((item) => item.id === id);
    if (!loan) return;
    const user = actor();
    await store.save({
      loans: store.data.loans.map((item) => item.id === id ? { ...item, status: 'Restitué', history: [...item.history, { id: crypto.randomUUID(), action: 'Matériel restitué', actor: user.name, role: user.role, at: stamp() }] } : item),
      equipment: store.data.equipment.map((item) => item.inventoryNumber === loan.inventoryNumber ? { ...item, status: 'Disponible', location: 'Réception', updatedBy: user.name, updatedAt: stamp() } : item),
    });
  }

  async function toggleMaintenance(id: string) {
    const user = actor();
    await store.save({ ...store.data, equipment: store.data.equipment.map((item) => item.id === id ? { ...item, status: item.status === 'Maintenance' ? 'Disponible' : 'Maintenance', updatedBy: user.name, updatedAt: stamp() } : item) });
  }

  return <div className="operations-page">
    <header className="operations-header"><div><button onClick={() => location.href = '/'}><ArrowLeft size={18}/>Tableau de bord</button><p>HospiCore · Centre des opérations</p><h1>Prêts & inventaire partagé</h1><span>Les remises, restitutions et changements de statut sont synchronisés entre tous les services.</span></div><div className="operations-header-actions"><button className="operations-secondary" onClick={() => void store.refresh()} disabled={store.state === 'loading' || store.state === 'saving'}><RefreshCw size={17}/>{store.message}</button><button className="operations-primary" onClick={() => tab === 'prets' ? setLoanOpen(true) : setEquipmentOpen(true)} disabled={store.state === 'saving'}><Plus size={18}/>{tab === 'prets' ? 'Nouveau prêt' : 'Ajouter du matériel'}</button></div></header>
    {store.state === 'error' || store.state === 'conflict' ? <div className="sync-banner local">Erreur de synchronisation : {store.message}</div> : <div className="sync-banner shared">PostgreSQL connecté · version {store.version}{store.updatedAt ? ` · ${new Date(store.updatedAt).toLocaleString('fr-FR')}` : ''}</div>}
    <div className="operations-tabs"><button className={tab === 'prets' ? 'active' : ''} onClick={() => setTab('prets')}><PackagePlus size={17}/>Prêts</button><button className={tab === 'inventaire' ? 'active' : ''} onClick={() => setTab('inventaire')}><Package size={17}/>Inventaire</button></div>
    <section className="operations-kpis"><article><PackagePlus/><span>Prêts actifs</span><strong>{store.data.loans.filter((item) => item.status === 'En cours').length}</strong></article><article><Clock3/><span>Retours en retard</span><strong>{overdue}</strong></article><article><CheckCircle2/><span>Disponibles</span><strong>{store.data.equipment.filter((item) => item.status === 'Disponible').length}</strong></article><article><Wrench/><span>Maintenance</span><strong>{store.data.equipment.filter((item) => item.status === 'Maintenance').length}</strong></article></section>
    <label className="operations-search"><Search size={18}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher…"/></label>
    {tab === 'prets' ? <section className="operations-list">{loans.length === 0 && <article className="loan-card"><h2>Aucun prêt en cours</h2><p>Créez un prêt depuis le bouton « Nouveau prêt ».</p></article>}{loans.map((loan) => <article className="loan-card" key={loan.id}><div className="loan-title"><div><span className="loan-status">{loan.status}</span><h2>{loan.itemType} · {loan.inventoryNumber}</h2><small>{loan.reference}</small></div><div><strong>{loan.clientName}</strong><span>Chambre {loan.room}</span></div></div><div className="loan-grid"><div><span>Début</span><strong>{loan.startAt.replace('T', ' ')}</strong></div><div><span>Retour prévu</span><strong>{loan.expectedEndAt.replace('T', ' ')}</strong></div></div>{loan.status === 'En cours' && <button className="operations-secondary" onClick={() => void closeLoan(loan.id)} disabled={store.state === 'saving'}><CheckCircle2 size={17}/>Enregistrer la restitution</button>}</article>)}</section> : <section className="equipment-grid">{equipment.length === 0 && <article className="equipment-card"><h2>Aucun matériel enregistré</h2><p>Ajoutez le premier équipement à l’inventaire.</p></article>}{equipment.map((item) => <article className="equipment-card" key={item.id}><div className="equipment-heading"><div><span className="equipment-status">{item.status}</span><h2>{item.label}</h2><small>{item.inventoryNumber} · {item.itemType}</small></div><Package size={23}/></div><div className="equipment-details"><div><span>Emplacement</span><strong>{item.location}</strong></div><div><span>État</span><strong>{item.condition}</strong></div></div><small>Mis à jour par {item.updatedBy} · {item.updatedAt}</small>{item.status !== 'Prêté' && <button className="operations-secondary" onClick={() => void toggleMaintenance(item.id)} disabled={store.state === 'saving'}><Wrench size={17}/>{item.status === 'Maintenance' ? 'Remettre disponible' : 'Passer en maintenance'}</button>}</article>)}</section>}
    {equipmentOpen && <div className="operations-modal"><form onSubmit={(event) => void createEquipment(event)}><header><h2>Ajouter un équipement</h2><button type="button" onClick={() => setEquipmentOpen(false)}><X/></button></header><div className="operations-form-grid"><label>N° inventaire<input name="inventoryNumber" required/></label><label>Catégorie<input name="itemType" required/></label><label className="wide">Désignation<input name="label" required/></label><label>Emplacement<input name="location" defaultValue="Réception" required/></label><label>État<input name="condition" defaultValue="Bon état"/></label></div><footer><button type="button" onClick={() => setEquipmentOpen(false)}>Annuler</button><button className="operations-primary" type="submit">Ajouter et synchroniser</button></footer></form></div>}
    {loanOpen && <div className="operations-modal"><form onSubmit={(event) => void createLoan(event)}><header><h2>Nouveau prêt</h2><button type="button" onClick={() => setLoanOpen(false)}><X/></button></header><div className="operations-form-grid"><label>Matériel<select name="inventoryNumber" required defaultValue=""><option value="" disabled>Sélectionner…</option>{store.data.equipment.filter((item) => item.status === 'Disponible').map((item) => <option key={item.id} value={item.inventoryNumber}>{item.inventoryNumber} · {item.label}</option>)}</select></label><label>Client<input name="clientName" required/></label><label>Chambre<input name="room" required/></label><label>Début<input type="datetime-local" name="startAt" required/></label><label>Retour prévu<input type="datetime-local" name="expectedEndAt" required/></label></div><footer><button type="button" onClick={() => setLoanOpen(false)}>Annuler</button><button className="operations-primary" type="submit">Créer et synchroniser</button></footer></form></div>}
  </div>;
}
