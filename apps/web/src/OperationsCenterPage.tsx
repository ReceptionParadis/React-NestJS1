import { FormEvent, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, Clock3, CreditCard, PackagePlus, Plus, Search, UserRound, X } from 'lucide-react';

type LoanStatus = 'En cours' | 'Restitué' | 'En retard';
type HistoryEntry = { id: string; action: string; actor: string; role: string; at: string };
type Loan = {
  id: string; reference: string; itemType: string; inventoryNumber: string; clientName: string; room: string;
  phone: string; nationality: string; startAt: string; expectedEndAt: string; actualEndAt?: string;
  depositAmount: number; cardBrand: string; cardLast4: string; preauthorizationReference: string;
  notes: string; status: LoanStatus; history: HistoryEntry[];
};

const KEY = 'hospicore.operations.loans.v1';
const demoLoans: Loan[] = [{
  id: 'loan-1', reference: 'OP-2026-000128', itemType: 'Fauteuil roulant', inventoryNumber: 'FR-03',
  clientName: 'John Smith', room: '315', phone: '+44 7700 900000', nationality: 'Britannique',
  startAt: '2026-08-05T18:15', expectedEndAt: '2026-08-08T10:00', depositAmount: 100,
  cardBrand: 'Visa', cardLast4: '4587', preauthorizationReference: 'PREAUTH-78451', notes: 'Roue avant légèrement marquée.',
  status: 'En cours', history: [{ id: 'h1', action: 'Prêt créé et matériel remis', actor: 'Thomas PETRISSANS', role: 'Directeur Hébergement', at: '05/08/2026 18:15:22' }],
}];

function currentUser() {
  try {
    const session = JSON.parse(localStorage.getItem('hospicore.session') || '{}');
    const user = session.user || {};
    return { name: `${user.firstName || 'Utilisateur'} ${user.lastName || 'HospiCore'}`.trim(), role: user.role || 'Collaborateur' };
  } catch { return { name: 'Utilisateur HospiCore', role: 'Collaborateur' }; }
}
function nowStamp() { return new Date().toLocaleString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit' }); }
function loadLoans(): Loan[] { try { return JSON.parse(localStorage.getItem(KEY) || 'null') || demoLoans; } catch { return demoLoans; } }
function persist(items: Loan[]) { localStorage.setItem(KEY, JSON.stringify(items)); }

export function OperationsCenterPage() {
  const [loans, setLoans] = useState<Loan[]>(loadLoans);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => loans.filter((loan) => `${loan.reference} ${loan.itemType} ${loan.clientName} ${loan.room}`.toLowerCase().includes(query.toLowerCase())), [loans, query]);
  const overdue = loans.filter((loan) => loan.status !== 'Restitué' && new Date(loan.expectedEndAt) < new Date()).length;

  function createLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const user = currentUser();
    const sequence = String(loans.length + 129).padStart(6, '0');
    const value: Loan = {
      id: crypto.randomUUID(), reference: `OP-${new Date().getFullYear()}-${sequence}`,
      itemType: String(form.get('itemType') || ''), inventoryNumber: String(form.get('inventoryNumber') || ''),
      clientName: String(form.get('clientName') || ''), room: String(form.get('room') || ''), phone: String(form.get('phone') || ''),
      nationality: String(form.get('nationality') || ''), startAt: String(form.get('startAt') || ''), expectedEndAt: String(form.get('expectedEndAt') || ''),
      depositAmount: Number(form.get('depositAmount') || 0), cardBrand: String(form.get('cardBrand') || ''),
      cardLast4: String(form.get('cardLast4') || '').slice(-4), preauthorizationReference: String(form.get('preauthorizationReference') || ''),
      notes: String(form.get('notes') || ''), status: 'En cours',
      history: [{ id: crypto.randomUUID(), action: 'Prêt créé et matériel remis', actor: user.name, role: user.role, at: nowStamp() }],
    };
    const next = [value, ...loans]; persist(next); setLoans(next); setOpen(false);
  }

  function closeLoan(id: string) {
    const user = currentUser(); const next = loans.map((loan) => loan.id === id ? {
      ...loan, status: 'Restitué' as const, actualEndAt: new Date().toISOString().slice(0,16),
      history: [...loan.history, { id: crypto.randomUUID(), action: 'Matériel restitué et dossier clôturé', actor: user.name, role: user.role, at: nowStamp() }],
    } : loan); persist(next); setLoans(next);
  }

  return <div className="operations-page">
    <header className="operations-header"><div><button onClick={() => { window.location.href = '/'; }}><ArrowLeft size={18}/> Tableau de bord</button><p>HospiCore · Centre des opérations</p><h1>Cahier de consignes & prêts</h1><span>Suivi sécurisé, signé et horodaté du matériel confié aux clients.</span></div><button className="operations-primary" onClick={() => setOpen(true)}><Plus size={18}/> Nouveau prêt</button></header>
    <section className="operations-kpis"><article><PackagePlus/><span>Prêts actifs</span><strong>{loans.filter(l=>l.status==='En cours').length}</strong></article><article><Clock3/><span>Retours en retard</span><strong>{overdue}</strong></article><article><CheckCircle2/><span>Restitués</span><strong>{loans.filter(l=>l.status==='Restitué').length}</strong></article></section>
    <div className="operations-search"><Search size={18}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Rechercher par client, chambre, matériel ou référence…"/></div>
    <section className="operations-list">{filtered.map((loan) => <article className="loan-card" key={loan.id}><div className="loan-title"><div><span className={`loan-status ${loan.status.toLowerCase().replace(' ','-')}`}>{loan.status}</span><h2>{loan.itemType} · {loan.inventoryNumber}</h2><small>{loan.reference}</small></div><div className="loan-client"><UserRound size={20}/><strong>{loan.clientName}</strong><span>Chambre {loan.room}</span></div></div>
      <div className="loan-grid"><div><span>Début</span><strong>{loan.startAt.replace('T',' ')}</strong></div><div><span>Retour prévu</span><strong>{loan.expectedEndAt.replace('T',' ')}</strong></div><div><span>Caution</span><strong>{loan.depositAmount.toFixed(2)} €</strong></div><div><span>Garantie CB</span><strong><CreditCard size={15}/> {loan.cardBrand} •••• {loan.cardLast4 || '—'}</strong><small>{loan.preauthorizationReference || 'Sans référence de préautorisation'}</small></div></div>
      <p className="loan-notes">{loan.notes || 'Aucune observation.'}</p><div className="loan-history"><strong>Historique signé</strong>{loan.history.map((h)=><div key={h.id}><span>{h.at}</span><p>{h.action}</p><small>{h.actor} · {h.role}</small></div>)}</div>
      {loan.status !== 'Restitué' && <button className="operations-secondary" onClick={()=>closeLoan(loan.id)}><CheckCircle2 size={17}/> Enregistrer la restitution</button>}
    </article>)}</section>
    {open && <div className="operations-modal"><form onSubmit={createLoan}><header><div><p>Nouvelle consigne</p><h2>Prêt de matériel</h2></div><button type="button" onClick={()=>setOpen(false)}><X/></button></header><div className="operations-form-grid">
      <label>Matériel<select name="itemType" required><option>Adaptateur</option><option>Fauteuil roulant</option><option>Chargeur</option><option>Parapluie</option><option>Lit bébé</option><option>Autre</option></select></label><label>N° inventaire<input name="inventoryNumber" required/></label>
      <label>Nom complet du client<input name="clientName" required/></label><label>Chambre<input name="room" required/></label><label>Téléphone<input name="phone"/></label><label>Nationalité<input name="nationality"/></label>
      <label>Date et heure de début<input name="startAt" type="datetime-local" required/></label><label>Date et heure de retour prévue<input name="expectedEndAt" type="datetime-local" required/></label>
      <label>Montant caution (€)<input name="depositAmount" type="number" min="0" step="0.01"/></label><label>Type de carte<select name="cardBrand"><option value="">Aucune</option><option>Visa</option><option>Mastercard</option><option>Amex</option></select></label>
      <label>4 derniers chiffres<input name="cardLast4" inputMode="numeric" maxLength={4} pattern="[0-9]{4}" placeholder="4587"/></label><label>Référence préautorisation<input name="preauthorizationReference"/></label>
      <label className="wide">Observations<textarea name="notes"/></label></div><p className="card-warning">Le numéro complet de carte et le cryptogramme ne doivent jamais être saisis dans HospiCore.</p><footer><button type="button" onClick={()=>setOpen(false)}>Annuler</button><button className="operations-primary" type="submit">Créer et signer le prêt</button></footer></form></div>}
  </div>;
}
