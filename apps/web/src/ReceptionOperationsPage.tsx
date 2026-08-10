import { useMemo, useState } from 'react';
import { ArrowLeft, BellRing, CheckCircle2, CircleAlert, CreditCard, KeyRound, LockKeyhole, LogIn, LogOut, Luggage, RefreshCw, Save, UtensilsCrossed, UsersRound, X } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type Audit={id:string;action:string;actor:string;role:string;at:string};
type DepartureChecklist={settlementStatus:'pending'|'paid'|'debtor';paymentMethod:string;debtorName:string;settlementAt:string;settlementBy:string;keysRecovered:boolean;keysRecoveredAt:string;keysRecoveredBy:string};
type GroupControl={validatedAt?:string;commercialValidation?:'À valider'|'Validé';[key:string]:unknown};
type MealCell={pax?:number;time?:string};
type MealDay={date:string;breakfast?:MealCell;lunch?:MealCell;packedLunch?:MealCell;dinner?:MealCell;packedDinner?:MealCell;lodging?:MealCell};
type Group={id:string;name?:string;pax?:number;rooms?:number;arrival?:string;departure?:string;arrivalTime?:string;departureTime?:string;status?:string;arrivalConfirmedAt?:string;arrivalConfirmedBy?:string;departureConfirmedAt?:string;departureConfirmedBy?:string;luggageArrival?:string;luggageDeparture?:string;mealDays?:MealDay[];departureChecklist?:DepartureChecklist;groupControl?:GroupControl;audit?:Audit[]};
type GroupWakeup={id:string;groupId:string;groupName?:string;date:string;time:string;note?:string;status?:'À faire'|'Effectué';createdAt?:string;completedAt?:string};
type MealService='breakfast'|'lunch'|'packedLunch'|'dinner'|'packedDinner';

const EMPTY:DepartureChecklist={settlementStatus:'pending',paymentMethod:'',debtorName:'',settlementAt:'',settlementBy:'',keysRecovered:false,keysRecoveredAt:'',keysRecoveredBy:''};
const SERVICES:MealService[]=['breakfast','lunch','packedLunch','dinner','packedDinner'];
const SERVICE_LABELS:Record<MealService,string>={breakfast:'Petit-déjeuner',lunch:'Déjeuner',packedLunch:'Panier repas midi',dinner:'Dîner',packedDinner:'Panier repas soir'};
function iso(d:Date){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function today(){return iso(new Date())}
function addDay(value:string,n:number){const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+n);return iso(d)}
function actor(){try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}'),u=s.user||{};return{name:`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim(),role:String(u.role?.name||u.role||'Réception')}}catch{return{name:'Utilisateur HospiCore',role:'Réception'}}}
function stamp(){return new Date().toLocaleString('fr-FR')}
function checklist(g:Group){return{...EMPTY,...g.departureChecklist}}
function ready(g:Group){const c=checklist(g);return(c.settlementStatus==='paid'||c.settlementStatus==='debtor')&&c.keysRecovered&&Boolean(g.groupControl?.validatedAt)}
function arrivalTimeLocked(g:Group){return Boolean(g.arrivalConfirmedAt)||['Arrivé','En séjour','Parti'].includes(g.status||'')}
function departureTimeLocked(g:Group){return Boolean(g.departureConfirmedAt)||g.status==='Parti'}
function fmtDate(v:string){return new Date(`${v}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'long',day:'2-digit',month:'2-digit'})}
function lastService(g:Group){
 const day=(g.mealDays||[]).find(d=>d.date===g.departure);if(!day)return null;
 const available=SERVICES.flatMap(service=>{const cell=day[service];return Number(cell?.pax||0)>0?[{service,label:SERVICE_LABELS[service],time:cell?.time||''}]:[]});
 return available.length?available[available.length-1]:null;
}

export function ReceptionOperationsPage(){
 const store=useOperationalStore<Group[]>('group-360',[]),wakeups=useOperationalStore<GroupWakeup[]>('group-wakeups',[]),user=actor(),date=today(),tomorrow=addDay(date,1);
 const[editing,setEditing]=useState<Group|null>(null),[draft,setDraft]=useState<DepartureChecklist>(EMPTY);
 const arrivals=useMemo(()=>store.data.filter(g=>g.arrival===date&&g.status!=='Parti').sort((a,b)=>(a.arrivalTime||'99:99').localeCompare(b.arrivalTime||'99:99')),[store.data,date]);
 const departures=useMemo(()=>store.data.filter(g=>g.departure===date).sort((a,b)=>(a.departureTime||'99:99').localeCompare(b.departureTime||'99:99')),[store.data,date]);
 const tomorrowArrivals=useMemo(()=>store.data.filter(g=>g.arrival===tomorrow&&g.status!=='Parti').sort((a,b)=>(a.arrivalTime||'99:99').localeCompare(b.arrivalTime||'99:99')),[store.data,tomorrow]);
 const tomorrowDepartures=useMemo(()=>store.data.filter(g=>g.departure===tomorrow).sort((a,b)=>(a.departureTime||'99:99').localeCompare(b.departureTime||'99:99')),[store.data,tomorrow]);
 function groupWakeups(g:Group){return wakeups.data.filter(w=>w.groupId===g.id&&w.status!=='Effectué'&&w.date<=String(g.departure||'9999')).sort((a,b)=>`${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))}
 async function saveGroup(group:Group,patch:Partial<Group>,action:string){const audit={id:crypto.randomUUID(),action,actor:user.name,role:user.role,at:stamp()};await store.save(store.data.map(g=>g.id===group.id?{...g,...patch,audit:[...(g.audit||[]),audit]}:g))}
 async function updateTime(group:Group,kind:'arrival'|'departure',value:string){
  if(kind==='arrival'&&arrivalTimeLocked(group))return;
  if(kind==='departure'&&departureTimeLocked(group))return;
  const current=kind==='arrival'?group.arrivalTime||'':group.departureTime||'';if(value===current)return;const label=kind==='arrival'?'arrivée':'départ';await saveGroup(group,kind==='arrival'?{arrivalTime:value}:{departureTime:value},`Heure ${label} modifiée · ${current||'À confirmer'} → ${value||'À confirmer'}`)
 }
 async function arrive(g:Group){const at=stamp();await saveGroup(g,{status:'Arrivé',arrivalConfirmedAt:at,arrivalConfirmedBy:user.name},`Arrivée confirmée par ${user.name} · ${at}`)}
 async function depart(g:Group){if(!ready(g))return;const at=stamp();await saveGroup(g,{status:'Parti',departureConfirmedAt:at,departureConfirmedBy:user.name,groupControl:{...(g.groupControl||{}),commercialValidation:'À valider'}},`Départ confirmé par ${user.name} · checklist complète · contrôle transmis au Commercial`)}
 function openChecklist(g:Group){setEditing(g);setDraft(checklist(g))}
 async function saveChecklist(){if(!editing)return;if(draft.settlementStatus==='paid'&&!draft.paymentMethod.trim())return;if(draft.settlementStatus==='debtor'&&!draft.debtorName.trim())return;await saveGroup(editing,{departureChecklist:draft},'Checklist de départ mise à jour par la Réception');setEditing(null)}
 function task(done:boolean,label:string){return <span className={`reception-op-task ${done?'done':'missing'}`}>{done?<CheckCircle2 size={14}/>:<CircleAlert size={14}/>}<b>{label}</b></span>}
 function editableTime(group:Group,kind:'arrival'|'departure'){
  const value=kind==='arrival'?group.arrivalTime||'':group.departureTime||'';
  const locked=kind==='arrival'?arrivalTimeLocked(group):departureTimeLocked(group);
  return <label className={`reception-op-time-edit${locked?' locked':''}`} title={locked?`Heure de ${kind==='arrival'?'l’arrivée':'départ'} verrouillée après confirmation`:`Modifier l’heure de ${kind==='arrival'?'l’arrivée':'départ'}`}><span>{kind==='arrival'?'Arrivée':'Départ'}{locked&&<LockKeyhole size={12}/>}</span><input key={`${group.id}-${kind}-${value}-${locked?'locked':'open'}`} type="time" defaultValue={value} disabled={locked} onBlur={e=>void updateTime(group,kind,e.currentTarget.value)} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur()}}/></label>
 }
 function departureInfo(g:Group){
  const service=lastService(g),alarms=groupWakeups(g);
  return <div className="reception-op-departure-info">
   <div className={alarms.length?'attention':''}><BellRing size={17}/><span>Réveil</span><strong>{alarms.length?alarms.map(w=>`${w.time}${w.note?` · ${w.note}`:''}`).join(' / '):'Aucun'}</strong></div>
   <div><Luggage size={17}/><span>Bagagerie</span><strong>{g.luggageDeparture||'Aucune'}</strong></div>
   <div><UtensilsCrossed size={17}/><span>Dernier service</span><strong>{service?`${service.label}${service.time?` · ${service.time}`:''}`:'Aucun'}</strong></div>
  </div>
 }
 function arrivalCard(g:Group,j1=false){
  const confirmed=['Arrivé','En séjour'].includes(g.status||'');
  return <div className={`reception-op-card${j1?' j1':''}`} key={g.id}>
   <div className="reception-op-card-main"><div className="reception-op-identity"><strong>{g.name||'Groupe sans nom'}</strong><span><UsersRound size={14}/>{g.pax||0} pers. <i/> {g.rooms||0} chambres</span>{j1&&<small>{fmtDate(String(g.arrival))}</small>}</div>{editableTime(g,'arrival')}</div>
   <div className="reception-op-card-footer">{j1?<span className="reception-op-status upcoming">J+1 · À anticiper</span>:confirmed?<span className="reception-op-status confirmed"><CheckCircle2 size={14}/>Arrivée confirmée <small>{g.arrivalConfirmedAt||''}</small></span>:<button onClick={()=>void arrive(g)}><LogIn size={15}/>Mettre en arrivée</button>}</div>
  </div>
 }
 function departureCard(g:Group,j1=false){
  const c=checklist(g),isReady=ready(g);
  return <div className={`reception-op-card departure${j1?' j1':''}`} key={g.id}>
   <div className="reception-op-card-main"><div className="reception-op-identity"><strong>{g.name||'Groupe sans nom'}</strong><span><UsersRound size={14}/>{g.pax||0} pers. <i/> {g.rooms||0} chambres</span></div>{editableTime(g,'departure')}</div>
   {departureInfo(g)}
   {!j1&&<div className="reception-op-tasks">{task(c.settlementStatus!=='pending','Solde / débiteur')}{task(c.keysRecovered,'Clés récupérées')}{task(Boolean(g.groupControl?.validatedAt),'Contrôle Groupe')}</div>}
   <div className="reception-op-card-footer">{j1?<span className="reception-op-status upcoming">J+1 · Préparer le départ</span>:<div className="reception-op-actions"><button className="secondary" onClick={()=>openChecklist(g)}>Compléter les étapes</button>{g.status==='Parti'?<span className="reception-op-status confirmed"><CheckCircle2 size={14}/>Départ confirmé <small>{g.departureConfirmedAt||''}</small></span>:<button disabled={!isReady} title={isReady?'Confirmer le départ':'Trois étapes obligatoires à compléter'} onClick={()=>void depart(g)}><LogOut size={15}/>{isReady?'Mettre en départ':'Départ bloqué'}</button>}</div>}</div>
  </div>
 }
 return <main className="reception-workspace-page reception-movements-page">
  <style>{`
   .reception-movements-page .reception-op-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:22px;align-items:start}
   .reception-movements-page .reception-op-grid>article{overflow:hidden;border:1px solid #e4d8cf;border-radius:20px;background:#fff;box-shadow:0 10px 30px rgba(70,38,45,.05)}
   .reception-movements-page .reception-op-grid>article>header{min-height:66px;padding:0 20px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #eee5df;background:#fcfaf7}
   .reception-movements-page .reception-op-grid>article>header h2{font-size:18px;flex:1}.reception-movements-page .reception-op-grid>article>header>b,.reception-op-j1-head>b{min-width:30px;height:30px;border-radius:999px;display:grid;place-items:center;background:#7b1931;color:white}
   .reception-op-card{padding:18px 18px 16px;border-bottom:1px solid #eee5df;background:#fff}.reception-op-card.j1{background:#fffdf9}.reception-op-card:last-child{border-bottom:0}
   .reception-op-card-main{display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:18px;align-items:start}.reception-op-identity{min-width:0}.reception-op-identity>strong{display:block;font-size:17px;line-height:1.25;color:#23191c}.reception-op-identity>span{margin-top:6px;display:flex;align-items:center;gap:6px;color:#806c71;font-size:13px}.reception-op-identity>span i{width:3px;height:3px;border-radius:50%;background:#c5b5ae}.reception-op-identity>small{display:block;margin-top:7px;color:#9b7f86;text-transform:capitalize}
   .reception-op-time-edit{display:grid;gap:5px}.reception-op-time-edit>span{display:flex;align-items:center;gap:4px;color:#a07d83;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.reception-op-time-edit input{width:112px;height:46px;padding:0 12px;border:1px solid #dfcec5;border-radius:12px;background:#fffaf6;color:#7b1931;font-size:17px;font-weight:800}.reception-op-time-edit.locked input{background:#f4efeb;color:#6d5b60}.reception-op-time-edit input:focus{outline:0;border-color:#8b2340;box-shadow:0 0 0 3px rgba(123,25,49,.09)}
   .reception-op-departure-info{margin-top:14px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.reception-op-departure-info>div{min-width:0;padding:10px 11px;border:1px solid #eee3dc;border-radius:12px;display:grid;grid-template-columns:18px minmax(0,1fr);column-gap:7px;row-gap:2px;background:#faf8f5;color:#766166}.reception-op-departure-info svg{grid-row:1/3;margin-top:2px;color:#896e74}.reception-op-departure-info span{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:#9a7d83}.reception-op-departure-info strong{font-size:12px;line-height:1.35;overflow-wrap:anywhere}.reception-op-departure-info>div.attention{border-color:#ecd4a6;background:#fff9eb}.reception-op-departure-info>div.attention svg{color:#a66a11}
   .reception-op-tasks{margin-top:12px;display:flex;flex-wrap:wrap;gap:7px}.reception-op-task{padding:6px 9px;border-radius:999px;display:inline-flex;align-items:center;gap:5px;font-size:11px}.reception-op-task.done{background:#edf7ef;color:#26703f}.reception-op-task.missing{background:#fff0f1;color:#9a2c42}
   .reception-op-card-footer{margin-top:13px;display:flex;align-items:center;justify-content:flex-end}.reception-op-card-footer>button,.reception-op-actions button{min-height:36px;padding:0 12px;border:0;border-radius:10px;background:#7b1931;color:#fff;font-weight:750;cursor:pointer}.reception-op-actions{width:100%;display:flex;align-items:center;justify-content:flex-end;gap:8px}.reception-op-actions .secondary{background:#f1ebe6;color:#6b545a}.reception-op-actions button:disabled{cursor:not-allowed;opacity:.48}
   .reception-op-status{display:inline-flex;align-items:center;gap:6px;padding:6px 9px;border-radius:999px;font-size:12px;font-weight:750}.reception-op-status small{font-weight:500}.reception-op-status.confirmed{background:#edf7ef;color:#26703f}.reception-op-status.upcoming{background:#f5e9ec;color:#7b1931}
   .reception-op-j1-head{min-height:50px;padding:0 18px;display:flex;align-items:center;gap:10px;border-top:5px solid #f5efe9;border-bottom:1px solid #e8ddd5;background:#f8f3ee}.reception-op-j1-head span{flex:1;color:#6f1d2f;font-size:13px;font-weight:850;text-transform:capitalize}.reception-op-j1-head b{min-width:26px;height:26px;font-size:12px}
   .reception-movements-page .reception-op-empty{padding:22px 18px;color:#927d82}.reception-movements-page .reception-op-j1-head+.reception-op-empty{background:#fffdf9}
   @media(max-width:1050px){.reception-movements-page .reception-op-grid{grid-template-columns:1fr}.reception-op-departure-info{grid-template-columns:repeat(3,minmax(150px,1fr))}}
   @media(max-width:680px){.reception-op-card-main{grid-template-columns:1fr}.reception-op-time-edit{width:100%}.reception-op-time-edit input{width:100%}.reception-op-departure-info{grid-template-columns:1fr}.reception-op-card-footer,.reception-op-actions{justify-content:stretch}.reception-op-card-footer>button,.reception-op-actions button{flex:1}.reception-op-actions{flex-wrap:wrap}}
  `}</style>
  <header className="reception-workspace-header"><button onClick={()=>location.href='/reception'}><ArrowLeft size={18}/>Espace Réception</button><div><p>Réception · Exploitation</p><h1>Arrivées & départs J / J+1</h1><span>Mouvements du jour et du lendemain, horaires et informations opérationnelles de départ synchronisées.</span></div><button className="reception-workspace-refresh" onClick={()=>{void store.refresh();void wakeups.refresh()}}><RefreshCw size={17}/>{store.state==='loading'||store.state==='saving'||wakeups.state==='loading'||wakeups.state==='saving'?'Synchronisation…':'Actualiser'}</button></header>
  <section className="reception-op-grid"><article><header><LogIn/><h2>Arrivées du jour</h2><b>{arrivals.length}</b></header>{arrivals.length===0?<p className="reception-op-empty">Aucune arrivée aujourd’hui.</p>:arrivals.map(g=>arrivalCard(g))}<div className="reception-op-j1-head"><span>Demain · {fmtDate(tomorrow)}</span><b>{tomorrowArrivals.length}</b></div>{tomorrowArrivals.length===0?<p className="reception-op-empty">Aucune arrivée J+1.</p>:tomorrowArrivals.map(g=>arrivalCard(g,true))}</article><article><header><LogOut/><h2>Départs du jour</h2><b>{departures.length}</b></header>{departures.length===0?<p className="reception-op-empty">Aucun départ aujourd’hui.</p>:departures.map(g=>departureCard(g))}<div className="reception-op-j1-head"><span>Demain · {fmtDate(tomorrow)}</span><b>{tomorrowDepartures.length}</b></div>{tomorrowDepartures.length===0?<p className="reception-op-empty">Aucun départ J+1.</p>:tomorrowDepartures.map(g=>departureCard(g,true))}</article></section>
  {editing&&<div className="reception-op-backdrop" onMouseDown={()=>setEditing(null)}><section className="reception-op-modal" onMouseDown={e=>e.stopPropagation()}><header><div><p>Checklist de départ</p><h2>{editing.name}</h2></div><button onClick={()=>setEditing(null)}><X/></button></header><label><CreditCard size={17}/>Situation du solde<select value={draft.settlementStatus} onChange={e=>setDraft(d=>({...d,settlementStatus:e.target.value as DepartureChecklist['settlementStatus'],settlementAt:stamp(),settlementBy:user.name}))}><option value="pending">À traiter</option><option value="paid">Payé sur place</option><option value="debtor">Débiteur</option></select></label>{draft.settlementStatus==='paid'&&<label>Mode de paiement<input value={draft.paymentMethod} onChange={e=>setDraft(d=>({...d,paymentMethod:e.target.value}))} placeholder="CB, espèces, virement…"/></label>}{draft.settlementStatus==='debtor'&&<label>Nom du débiteur<input value={draft.debtorName} onChange={e=>setDraft(d=>({...d,debtorName:e.target.value}))}/></label>}<label className="reception-op-check"><input type="checkbox" checked={draft.keysRecovered} onChange={e=>setDraft(d=>({...d,keysRecovered:e.target.checked,keysRecoveredAt:e.target.checked?stamp():'',keysRecoveredBy:e.target.checked?user.name:''}))}/><KeyRound size={17}/>Clés récupérées</label><div className="reception-op-control-state">{editing.groupControl?.validatedAt?<><CheckCircle2/>Contrôle Groupe validé</>:<><CircleAlert/>Contrôle Groupe encore manquant</>}</div><footer><button className="secondary" onClick={()=>setEditing(null)}>Annuler</button><button onClick={()=>void saveChecklist()}><Save size={16}/>Enregistrer</button></footer></section></div>}
 </main>
}
