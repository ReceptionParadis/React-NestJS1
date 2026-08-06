import { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, Baby, CheckCircle2, ChevronDown, ChevronUp,
  ClipboardCheck, LockKeyhole, Printer,
} from 'lucide-react';
import { DailyGroupBoard } from './DailyGroupBoard';
import { useOperationalStore } from './useOperationalStore';

type StayoverException={room:string;reason:'Refus service'|'Ne pas déranger'};
type MealCell={pax?:number;time?:string;water?:boolean;wine?:boolean};
type MealDay={date:string;breakfast?:MealCell;lunch?:MealCell;packedLunch?:MealCell;dinner?:MealCell;packedDinner?:MealCell;lodging?:MealCell};
type Audit={id:string;action:string;actor:string;role:string;at:string};
type GroupControl={
 single:number;double:number;twin:number;triple:number;quadruple:number;
 babies:number;children3to6:number;children7to10:number;minors11to17:number;
 totalRooms:number;totalPax:number;adults:number;taxableAdults:number;
 validatedBy:string;validatedAt:string;printedBy?:string;printedAt?:string;locked:boolean;
};
type Group={
 id:string;name?:string;agency?:string;arrival?:string;departure?:string;arrivalTime?:string;departureTime?:string;
 rooms?:number;pax?:number;status?:string;paymentStatus?:string;amountDue?:number;debtor?:string;rooming?:boolean;
 leaderFirstName?:string;leaderLastName?:string;leaderPhone?:string;leaderEmail?:string;language?:string;buses?:number;parking?:boolean;
 stayType?:string;breakfastType?:string;housekeepingType?:string;dietary?:string;luggageArrival?:string;luggageDeparture?:string;
 mealDays?:MealDay[];receptionNotes?:string;commercialNotes?:string;housekeepingArrivalStatus?:string;
 stayoverStatus?:string;stayoverExceptions?:StayoverException[];audit?:Audit[];groupControl?:GroupControl;
};
type Booking={id:string;groupId?:string;title?:string;room:string;date:string;start:string;end:string;attendees?:number};
type SessionUser={name:string;role:string};
type MealKey='breakfast'|'lunch'|'packedLunch'|'dinner'|'packedDinner'|'lodging';

const capacities={single:1,double:2,twin:2,triple:3,quadruple:4} as const;
const mealKeys:MealKey[]=['breakfast','lunch','packedLunch','dinner','packedDinner','lodging'];
const emptyControl:GroupControl={single:0,double:0,twin:0,triple:0,quadruple:0,babies:0,children3to6:0,children7to10:0,minors11to17:0,totalRooms:0,totalPax:0,adults:0,taxableAdults:0,validatedBy:'',validatedAt:'',locked:false};

function todayIso(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function stamp(){return new Date().toLocaleString('fr-FR')}
function sessionUser():SessionUser{try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}');const u=s.user||{};return{name:`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim(),role:String(u.role?.name||u.role||'Collaborateur')}}catch{return{name:'Utilisateur HospiCore',role:'Collaborateur'}}}
function roleRights(role:string){const r=role.toLowerCase();return{access:r.includes('réception')||r.includes('reception')||r.includes('commercial')||r.includes('direction')||r.includes('admin'),unlock:r.includes('chef de réception')||r.includes('chef de reception')||r.includes('commercial')||r.includes('direction')||r.includes('admin')}}
function calcControl(value:GroupControl):GroupControl{const totalRooms=value.single+value.double+value.twin+value.triple+value.quadruple;const totalPax=value.single+value.double*2+value.twin*2+value.triple*3+value.quadruple*4;const nonAdults=value.babies+value.children3to6+value.children7to10+value.minors11to17;const adults=Math.max(0,totalPax-nonAdults);return{...value,totalRooms,totalPax,adults,taxableAdults:adults}}
function formatDate(value?:string){if(!value)return'—';return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR')}
function mealLabel(key:MealKey){return key==='breakfast'?'Petit-déjeuner':key==='lunch'?'Déjeuner':key==='packedLunch'?'Panier repas midi':key==='dinner'?'Dîner':key==='packedDinner'?'Panier repas soir':'Logement'}
function serviceFor(group:Group,kind:'arrival'|'departure'){
 const day=group.mealDays?.find(item=>item.date===(kind==='arrival'?group.arrival:group.departure));
 if(!day)return kind==='arrival'?'Arrivée seule':'Après dernier service';
 const ordered:MealKey[]=kind==='arrival'?['breakfast','lunch','packedLunch','dinner','packedDinner','lodging']:['packedDinner','dinner','packedLunch','lunch','breakfast','lodging'];
 const key=ordered.find(item=>Number(day[item]?.pax||0)>0);
 return key?mealLabel(key):(kind==='arrival'?'Arrivée seule':'Après dernier service');
}
function mealRows(group:Group){return(group.mealDays||[]).flatMap(day=>mealKeys.map(key=>({date:day.date,key,cell:day[key]})).filter(item=>Number(item.cell?.pax||0)>0))}

export function ReceptionDailyPage(){
 const groupsStore=useOperationalStore<Group[]>('group-360',[]);const meetingStore=useOperationalStore<Booking[]>('meeting-rooms',[]);
 const [expanded,setExpanded]=useState<string[]>([]);const [controlOpen,setControlOpen]=useState('');const [draft,setDraft]=useState<GroupControl>(emptyControl);
 const user=sessionUser();const rights=roleRights(user.role);const today=todayIso();
 const activeGroups=useMemo(()=>groupsStore.data.filter(g=>String(g.arrival)<=today&&String(g.departure)>=today).sort((a,b)=>(a.arrivalTime||'99:99').localeCompare(b.arrivalTime||'99:99')),[groupsStore.data,today]);
 const readyGroups=activeGroups.filter(g=>g.arrival===today&&g.housekeepingArrivalStatus==='Chambres prêtes à donner');
 const stayoverGroups=activeGroups.filter(g=>String(g.arrival)<today&&String(g.departure)>today&&['Recouche OK','Recouche partielle'].includes(g.stayoverStatus||''));
 async function saveGroup(updated:Group,action:string){const audit:Audit={id:crypto.randomUUID(),action,actor:user.name,role:user.role,at:stamp()};await groupsStore.save(groupsStore.data.map(g=>g.id===updated.id?{...updated,audit:[...(updated.audit||[]),audit]}:g))}
 function openControl(group:Group){setDraft(calcControl({...emptyControl,...group.groupControl,locked:group.groupControl?.locked||false}));setControlOpen(group.id)}
 function updateControl(key:keyof GroupControl,value:number){setDraft(current=>calcControl({...current,[key]:Math.max(0,Number(value)||0)}))}
 async function validateControl(group:Group){if(draft.totalPax<=0)return;const control=calcControl({...draft,validatedBy:user.name,validatedAt:stamp(),locked:false});await saveGroup({...group,groupControl:control},`Contrôle Groupe validé · ${control.totalPax} personnes · ${control.taxableAdults} adultes assujettis`);setDraft(control)}
 async function printAndLock(group:Group){const base=group.groupControl||draft;if(!base.validatedAt)return;const control={...calcControl(base),locked:true,printedBy:base.validatedBy||user.name,printedAt:stamp()};await saveGroup({...group,groupControl:control},`Contrôle Groupe imprimé, signé et verrouillé par ${control.printedBy}`);setDraft(control);setTimeout(()=>window.print(),250)}
 async function unlock(group:Group){if(!rights.unlock||!group.groupControl)return;const control={...group.groupControl,locked:false};await saveGroup({...group,groupControl:control},'Contrôle Groupe déverrouillé par un utilisateur habilité');setDraft(control)}
 if(!rights.access)return <div className="reception-daily-page"><header className="reception-daily-header"><a href="/"><ArrowLeft size={18}/>Dashboard</a><h1>Accès restreint</h1></header></div>;
 return <div className="reception-daily-page">
  <header className="reception-daily-header"><a href="/"><ArrowLeft size={18}/>Dashboard</a><p>HospiCore · Réception</p><h1>Pilotage quotidien des groupes</h1><span>Fiches Groupe 360°, suivi Housekeeping et contrôle des effectifs.</span></header>
  {groupsStore.state==='error'&&<div className="daily-closed">Synchronisation indisponible : {groupsStore.message}</div>}
  {readyGroups.length>0&&<section className="reception-hk-panel reception-hk-ready"><header><CheckCircle2 size={21}/><strong>Chambres prêtes à donner</strong><b>{readyGroups.length}</b></header><div className="reception-hk-grid">{readyGroups.map(g=><article className="reception-hk-card" key={g.id}><div><strong>{g.name||'Groupe sans nom'}</strong><span>{g.rooms||0} chambre(s) · arrivée {g.arrivalTime||'à confirmer'}</span></div><em className="reception-hk-badge ready">Prêtes</em></article>)}</div></section>}
  {stayoverGroups.length>0&&<section className="reception-hk-panel"><header><CheckCircle2 size={21}/><strong>Suivi des recouches</strong><b>{stayoverGroups.length}</b></header><div className="reception-hk-grid">{stayoverGroups.map(g=>{const partial=g.stayoverStatus==='Recouche partielle';return <article className={`reception-hk-card${partial?' partial':''}`} key={g.id}><div className="reception-hk-card-head">{partial?<AlertTriangle size={19}/>:<CheckCircle2 size={19}/>}<div><strong>{g.name||'Groupe sans nom'}</strong><span>{g.rooms||0} chambre(s)</span></div><em className={`reception-hk-badge${partial?' partial':' ready'}`}>{partial?'Recouche partielle':'Recouche OK'}</em></div>{partial&&<div className="reception-hk-exceptions"><strong>Chambres non faites</strong>{(g.stayoverExceptions||[]).map(x=><div key={`${x.room}-${x.reason}`}><b>Chambre {x.room}</b><span>{x.reason}</span></div>)}</div>}</article>})}</div></section>}
  <section className="reception-groups360"><header><div><p>Informations opérationnelles</p><h2>Fiches Groupe 360° du jour</h2></div><b>{activeGroups.length} groupe(s)</b></header><div className="reception-group-list">{activeGroups.map(group=>{const isOpen=expanded.includes(group.id);const arrived=['Arrivé','En séjour'].includes(group.status||'');const bookings=meetingStore.data.filter(b=>b.groupId===group.id||b.title===group.name);return <article className={`reception-group360-card${isOpen?' open':''}`} key={group.id}>
   <button className="reception-group360-summary" onClick={()=>setExpanded(v=>v.includes(group.id)?v.filter(id=>id!==group.id):[...v,group.id])}><div><strong>{group.name||'Groupe sans nom'}</strong><span>{group.agency||'Agence non renseignée'} · {group.pax||0} pax · {group.rooms||0} chambres</span></div><div className="reception-group360-status"><em>{group.status||'Préparation'}</em>{isOpen?<ChevronUp/>:<ChevronDown/>}</div></button>
   {isOpen&&<div className="reception-group360-body"><div className="reception-360-grid"><section><h3>Informations générales</h3><p><b>Séjour :</b> {formatDate(group.arrival)} → {formatDate(group.departure)}</p><p><b>Horaires :</b> {group.arrivalTime||'—'} / {group.departureTime||'—'}</p><p><b>Type de séjour :</b> {group.stayType||'—'}</p><p><b>Langue :</b> {group.language||'—'}</p></section><section><h3>Tour leader</h3><p><b>Nom :</b> {[group.leaderFirstName,group.leaderLastName].filter(Boolean).join(' ')||'—'}</p><p><b>Téléphone :</b> {group.leaderPhone||'—'}</p><p><b>E-mail :</b> {group.leaderEmail||'—'}</p></section><section><h3>Réception & comptabilité</h3><p><b>Paiement :</b> {group.paymentStatus||'—'}</p><p><b>Solde :</b> {Number(group.amountDue||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'})}</p><p><b>Débiteur :</b> {group.debtor||'—'}</p><p><b>Bagagerie :</b> {group.luggageArrival||'Non'} / {group.luggageDeparture||'Non'}</p></section><section><h3>Restauration & Housekeeping</h3><p><b>Petit-déjeuner :</b> {group.breakfastType||'—'}</p><p><b>Housekeeping :</b> {group.housekeepingType||'—'}</p><p><b>Allergies / régimes :</b> {group.dietary||'Aucun renseignement'}</p></section></div>
   {mealRows(group).length>0&&<section className="reception-360-meals"><h3>Repas du séjour</h3><div>{mealRows(group).map(item=><span key={`${item.date}-${item.key}`}><b>{formatDate(item.date)} · {mealLabel(item.key)}</b>{item.cell?.time||'—'} · {item.cell?.pax||0} pax{item.cell?.water?' · eau':''}{item.cell?.wine?' · vin':''}</span>)}</div></section>}
   {bookings.length>0&&<section className="reception-360-meetings"><h3>Salles réservées</h3>{bookings.map(b=><p key={b.id}><b>{b.room}</b> · {formatDate(b.date)} · {b.start}–{b.end} · {b.attendees||0} pers.</p>)}</section>}
   <div className="reception-360-actions">{arrived&&<button onClick={()=>openControl(group)}><ClipboardCheck size={18}/>{group.groupControl?.validatedAt?'Ouvrir le contrôle Groupe':'Réaliser le contrôle Groupe'}</button>}{group.groupControl?.locked&&<span><LockKeyhole size={16}/>Contrôle verrouillé · Bon pour paiement</span>}</div></div>}
  </article>})}</div></section>
  <DailyGroupBoard/>
  {controlOpen&&(()=>{const group=groupsStore.data.find(g=>g.id===controlOpen);if(!group)return null;const locked=Boolean(group.groupControl?.locked)&&!rights.unlock;const meals=mealRows(group);return <div className="group-control-backdrop" onMouseDown={()=>setControlOpen('')}><section className="group-control-modal" onMouseDown={e=>e.stopPropagation()}>
   <header className="group-control-title"><div><p>Contrôle Groupe · Bon pour paiement</p><h2>{group.name}</h2></div><button onClick={()=>setControlOpen('')}>×</button></header>
   <section className="control-print-summary"><div><span>Arrivée</span><strong>{formatDate(group.arrival)} · {group.arrivalTime||'—'}</strong><small>{serviceFor(group,'arrival')}</small></div><div><span>Départ</span><strong>{formatDate(group.departure)} · {group.departureTime||'—'}</strong><small>{serviceFor(group,'departure')}</small></div><div><span>Séjour restauration</span><strong>{group.stayType||'—'}</strong><small>{group.breakfastType||'Petit-déjeuner non précisé'}</small></div></section>
   <div className="group-control-lock">{group.groupControl?.locked?<><LockKeyhole size={18}/><span>Imprimé et verrouillé le {group.groupControl.printedAt} par {group.groupControl.printedBy}</span>{rights.unlock&&<button onClick={()=>unlock(group)}>Déverrouiller</button>}</>:<><ClipboardCheck size={18}/><span>L’impression signera, horodatera et verrouillera automatiquement le contrôle.</span></>}</div>
   <section className="control-room-types"><h3>Chambres par typologie</h3><div>{([['single','Individuelle · 1 pers.'],['double','Double · 2 pers.'],['twin','Twin · 2 pers.'],['triple','Triple · 3 pers.'],['quadruple','Quadruple · 4 pers.']] as const).map(([key,label])=><label key={key}><span>{label}</span><input type="number" min="0" disabled={locked} value={draft[key]} onChange={e=>updateControl(key,Number(e.target.value))}/></label>)}</div></section>
   <section className="control-age-groups"><h3>Enfants et mineurs</h3><div><label><span><Baby size={16}/>0–2 ans · offert</span><input type="number" min="0" disabled={locked} value={draft.babies} onChange={e=>updateControl('babies',Number(e.target.value))}/></label><label><span>3–6 ans · réduction 50 %</span><input type="number" min="0" disabled={locked} value={draft.children3to6} onChange={e=>updateControl('children3to6',Number(e.target.value))}/></label><label><span>7–10 ans · réduction 30 %</span><input type="number" min="0" disabled={locked} value={draft.children7to10} onChange={e=>updateControl('children7to10',Number(e.target.value))}/></label><label><span>11–17,99 ans · taxe offerte</span><input type="number" min="0" disabled={locked} value={draft.minors11to17} onChange={e=>updateControl('minors11to17',Number(e.target.value))}/></label></div></section>
   <section className="control-results"><article><span>Chambres</span><strong>{draft.totalRooms}</strong></article><article><span>Personnes</span><strong>{draft.totalPax}</strong></article><article><span>Adultes</span><strong>{draft.adults}</strong></article><article><span>Taxes de séjour</span><strong>{draft.taxableAdults}</strong></article></section>
   <section className="control-discounts"><h3>Réductions à appliquer</h3><p><b>{draft.babies}</b> gratuité(s) 0–2 ans</p><p><b>{draft.children3to6}</b> réduction(s) de 50 %</p><p><b>{draft.children7to10}</b> réduction(s) de 30 %</p><p><b>{draft.minors11to17}</b> exonération(s) de taxe</p></section>
   <section className="control-meal-table"><h3>Tableau des effectifs repas</h3><table><thead><tr><th>Date</th><th>Service</th><th>Heure</th><th>Effectif</th><th>Suppléments</th></tr></thead><tbody>{meals.length?meals.map(item=><tr key={`${item.date}-${item.key}`}><td>{formatDate(item.date)}</td><td>{mealLabel(item.key)}</td><td>{item.cell?.time||'—'}</td><td>{item.cell?.pax||0}</td><td>{[item.cell?.water?'Eau':'',item.cell?.wine?'Vin':''].filter(Boolean).join(' + ')||'—'}</td></tr>):<tr><td colSpan={5}>Aucun repas renseigné.</td></tr>}</tbody></table></section>
   {draft.totalPax>0&&draft.babies+draft.children3to6+draft.children7to10+draft.minors11to17>draft.totalPax&&<div className="control-warning"><AlertTriangle size={18}/>Le nombre d’enfants et mineurs dépasse l’effectif calculé.</div>}
   <section className="control-signature"><div><span>Contrôle réalisé par</span><strong>{draft.validatedBy||user.name}</strong></div><div><span>Validation</span><strong>{draft.validatedAt||'À valider'}</strong></div><div><span>Signature automatique à l’impression</span><strong>{draft.printedBy||draft.validatedBy||user.name}</strong><small>{draft.printedAt||'Horodatage généré à l’impression'}</small></div></section>
   <footer>{!locked&&<button className="control-save" disabled={draft.totalPax<=0||draft.babies+draft.children3to6+draft.children7to10+draft.minors11to17>draft.totalPax} onClick={()=>validateControl(group)}><CheckCircle2 size={18}/>Valider le contrôle</button>}<button className="control-print" disabled={!draft.validatedAt} onClick={()=>printAndLock(group)}><Printer size={18}/>{group.groupControl?.locked?'Réimprimer':'Imprimer, signer et verrouiller'}</button></footer>
   <div className="control-payment-stamp">BON POUR PAIEMENT</div>
  </section></div>})()}
 </div>;
}
