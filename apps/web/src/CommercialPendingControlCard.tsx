import { CheckCircle2, ChevronRight } from 'lucide-react';
import type { OperationalGroup } from './OperationalGroupBuckets';
import './commercial-pending-control.css';

type Props<T extends OperationalGroup>={group:T;canValidate:boolean;onValidate:(group:T)=>void};
function value(v:unknown,fallback='—'){return v===undefined||v===null||v===''?fallback:String(v)}
function euro(v?:number){return Number(v||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}

export function CommercialPendingControlCard<T extends OperationalGroup>({group,canValidate,onValidate}:Props<T>){
 const c=group.groupControl;
 return <article className="commercial-pending-control-card">
  <details>
   <summary>
    <div><strong>{group.name||'Groupe sans nom'}</strong><span>{group.directAgency||group.agency||'Agence non renseignée'} · départ confirmé · {c?.totalPax||group.pax||0} personnes</span><small>Contrôle Réception validé le {c?.validatedAt||'—'}{c?.printedAt?` · imprimé le ${c.printedAt}`:''}{c?.printedBy?` par ${c.printedBy}`:''}</small></div>
    <span className="commercial-control-expand">Voir le contrôle <ChevronRight size={17}/></span>
   </summary>
   <div className="commercial-control-review">
    <div className="operational-360-grid">
     <section><h4>Séjour</h4><p><b>Arrivée</b><span>{value(group.arrival)} · {value(group.arrivalTime,'heure à confirmer')}</span></p><p><b>Départ</b><span>{value(group.departure)} · {value(group.departureTime,'heure à confirmer')}</span></p><p><b>Chambres</b><span>{group.rooms||0}</span></p><p><b>Effectif fiche</b><span>{group.pax||0} pers.</span></p></section>
     <section><h4>Contrôle Réception</h4><p><b>Personnes réelles</b><span>{c?.totalPax??group.pax??0}</span></p><p><b>Adultes taxables</b><span>{c?.taxableAdults??0}</span></p><p><b>Validé le</b><span>{value(c?.validatedAt)}</span></p><p><b>Imprimé</b><span>{c?.printedAt?`${c.printedAt}${c.printedBy?` · ${c.printedBy}`:''}`:'Non renseigné'}</span></p></section>
     <section><h4>Paiement</h4><p><b>Statut</b><span>{value(group.paymentStatus)}</span></p><p><b>Solde</b><span>{euro(group.amountDue)}</span></p><p><b>Débiteur</b><span>{value(group.debtor)}</span></p><p><b>Validation commerciale</b><span>{c?.commercialValidation||'À valider'}</span></p></section>
     <section><h4>Informations utiles</h4><p><b>Agence</b><span>{value(group.directAgency||group.agency)}</span></p><p><b>Tour Leader</b><span>{[group.leaderFirstName,group.leaderLastName].filter(Boolean).join(' ')||'—'}</span></p><p><b>Téléphone</b><span>{value(group.leaderPhone)}</span></p><p><b>Notes Réception</b><span>{value(group.receptionNotes)}</span></p></section>
    </div>
    <div className="commercial-control-review-actions"><button type="button" onClick={()=>window.location.href='/reception/controles'}>Ouvrir le contrôle complet</button>{canValidate?<button type="button" className="validate" onClick={()=>onValidate(group)}><CheckCircle2 size={16}/>Valider le contrôle</button>:<span>Validation réservée au Commercial / Direction</span>}</div>
   </div>
  </details>
 </article>;
}
