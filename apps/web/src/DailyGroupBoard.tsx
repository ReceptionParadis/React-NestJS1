import { useMemo, useState } from 'react';
import { BellRing, ChevronLeft, ChevronRight, Clock3, LogIn, LogOut, UsersRound, X } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type MealCell={pax?:number;time?:string};
type MealDay={date:string;breakfast?:MealCell;lunch?:MealCell;packedLunch?:MealCell;dinner?:MealCell;packedDinner?:MealCell};
type WakeUp={date:string;time:string;note?:string};
type AuditEntry={id:string;action:string;actor:string;role:string;at:string};
type Group={id:string;name?:string;pax?:number;arrival?:string;departure?:string;arrivalTime?:string;departureTime?:string;status?:string;commercialValidated?:boolean;mealDays?:MealDay[];wakeUps?:WakeUp[];audit?:AuditEntry[]};
type Booking={id:string;groupId?:string;title:string;date:string;start:string;end:string;room:string;attendees:number;updatedBy?:string;updatedAt?:string;[key:string]:unknown};
type SheetLine={groupId:string;groupStatus?:string;arrivalTime?:string;departureTime?:string;departureConfirmed?:boolean};
type Sheet={id?:string;status?:string;weekStart?:string;weekEnd?:string;lockedBy?:string;lockedAt?:string;lines?:SheetLine[]};
type SessionUser={name:string;role:string};

const todayIso=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const addDays=(value:string,n:number)=>{const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const label=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
function currentUser():SessionUser{try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}');const u=s.user||{};return{name:`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim(),role:String(u.role?.name||u.role||'Collaborateur')}}catch{return{name:'Utilisateur HospiCore',role:'Collaborateur'}}}
function stamp(){return new Date().toLocaleString('fr-FR')}
function receptionRole(role:string){const r=role.toLowerCase();return r.includes('réception')||r.includes('reception')||r.includes('front')||r.includes('direction')||r.includes('admin')}
function serviceLabel(group:Group,date:string){const d=group.mealDays?.find(x=>x.date===date);const parts:string[]=[];if(d?.breakfast?.pax)parts.push(`PDJ ${d.breakfast.time||''}`.trim());if(d?.lunch?.pax)parts.push(`Déjeuner ${d.lunch.time||''}`.trim());if(d?.packedLunch?.pax)parts.push(`Panier midi ${d.packedLunch.time||''}`.trim());if(d?.dinner?.pax)parts.push(`Dîner ${d.dinner.time||''}`.trim());if(d?.packedDinner?.pax)parts.push(`Panier soir ${d.packedDinner.time||''}`.trim());return parts.join(' · ')||'Aucun repas prévu'}

export function DailyGroupBoard({compact=false}:{compact?:boolean}){
 const groupsStore=useOperationalStore<Group[]>('group-360',[]);
 const roomsStore=useOperationalStore<Booking[]>('meeting-rooms',[]);
 const sheetsStore=useOperationalStore<Sheet[]>('function-sheets',[]);
 const [date,setDate]=useState(todayIso());
 const [editing,setEditing]=useState<Group|null>(null);
 const user=currentUser();
 const today=todayIso(),past=date<today;
 const isReception=receptionRole(user.role);
 const publishedIds=useMemo(()=>new Set(sheetsStore.data.filter(s=>s.status==='Diffusée'||s.status==='Clôturée').flatMap(s=>s.lines?.map(l=>l.groupId)||[])),[sheetsStore.data]);
 const visible=useMemo(()=>groupsStore.data.filter(g=>publishedIds.has(g.id)),[groupsStore.data,publishedIds]);
 const arrivals=visible.filter(g=>g.arrival===date).sort((a,b)=>(a.arrivalTime||'99:99').localeCompare(b.arrivalTime||'99:99'));
 const departures=visible.filter(g=>g.departure===date).sort((a,b)=>(a.departureTime||'99:99').localeCompare(b.departureTime||'99:99'));
 const stayovers=visible.filter(g=>String(g.arrival)<date&&String(g.departure)>date);
 const receptionMaster=Boolean(editing&&['Arrivé','En séjour'].includes(editing.status||''));
 const canOperate=isReception&&!past;
 const canEditOperational=canOperate&&(receptionMaster||date>=today);

 async function syncFunctionSheets(groupId:string,patch:Partial<SheetLine>){
  const next=sheetsStore.data.map(sheet=>{
   if(!sheet.lines?.some(line=>line.groupId===groupId))return sheet;
   const lines=sheet.lines.map(line=>line.groupId===groupId?{...line,...patch}:line);
   const allDeparted=lines.length>0&&lines.every(line=>line.groupStatus==='Parti');
   return{...sheet,lines,status:allDeparted?'Clôturée':sheet.status,lockedBy:allDeparted?user.name:sheet.lockedBy,lockedAt:allDeparted?stamp():sheet.lockedAt};
  });
  await sheetsStore.save(next);
 }

 async function saveGroup(updated:Group,action:string,sheetPatch?:Partial<SheetLine>){
  const audit=[...(updated.audit||[]),{id:crypto.randomUUID(),action,actor:user.name,role:user.role,at:stamp()}];
  const saved={...updated,audit};
  await groupsStore.save(groupsStore.data.map(g=>g.id===updated.id?saved:g));
  if(sheetPatch)await syncFunctionSheets(updated.id,sheetPatch);
  setEditing(saved);
 }

 async function setOperationalStatus(group:Group,status:'Arrivé'|'Parti'){
  if(!canOperate)return;
  await saveGroup({...group,status},status==='Arrivé'?'Arrivée confirmée par la Réception':'Départ confirmé par la Réception',{groupStatus:status,departureConfirmed:status==='Parti'});
 }

 async function updateArrivalTime(value:string){
  if(!editing||!canEditOperational)return;
  await saveGroup({...editing,arrivalTime:value},'Heure d’arrivée modifiée par la Réception',{arrivalTime:value});
 }
 async function updateDepartureTime(value:string){
  if(!editing||!canEditOperational)return;
  await saveGroup({...editing,departureTime:value},'Heure de départ modifiée par la Réception',{departureTime:value});
 }
 async function updateRoomTime(booking:Booking,key:'start'|'end',value:string){if(!canEditOperational)return;await roomsStore.save(roomsStore.data.map(b=>b.id===booking.id?{...b,[key]:value,updatedBy:user.name,updatedAt:new Date().toISOString()}:b))}

 const card=(group:Group,kind:'arrival'|'departure'|'stay')=><article className="daily-group-card" key={`${kind}-${group.id}`}><div><strong>{group.name||'Groupe sans nom'}</strong><span><UsersRound size={14}/>{group.pax||0} pax · {serviceLabel(group,date)}</span></div><time>{kind==='arrival'?(group.arrivalTime||'À confirmer'):kind==='departure'?(group.departureTime||'À confirmer'):'En séjour'}</time><div className="daily-group-actions"><button onClick={()=>setEditing(group)}>Ouvrir</button>{canOperate&&kind==='arrival'&&group.status!=='Arrivé'&&group.status!=='En séjour'&&group.status!=='Parti'&&<button className="confirm" onClick={()=>void setOperationalStatus(group,'Arrivé')}><LogIn size={15}/>Mettre en arrivée</button>}{canOperate&&kind==='departure'&&group.status!=='Parti'&&<button className="confirm" onClick={()=>void setOperationalStatus(group,'Parti')}><LogOut size={15}/>Mettre en départ</button>}</div></article>;

 return <section className={`daily-board${compact?' compact':''}`}>
  <header><div><p>Exploitation quotidienne</p><h2>Arrivées & départs groupes</h2></div><div className="daily-date-nav"><button onClick={()=>setDate(addDays(date,-1))}><ChevronLeft/></button><strong>{label(date)}</strong><button onClick={()=>setDate(addDays(date,1))}><ChevronRight/></button><button onClick={()=>setDate(today)}>Aujourd’hui</button></div></header>
  {past&&<div className="daily-closed">Journée clôturée · consultation en lecture seule</div>}
  <div className="daily-columns"><div><h3><LogIn/>Arrivées <b>{arrivals.length}</b></h3>{arrivals.length?arrivals.map(g=>card(g,'arrival')):<p className="daily-empty">Aucune arrivée.</p>}</div><div><h3><LogOut/>Départs <b>{departures.length}</b></h3>{departures.length?departures.map(g=>card(g,'departure')):<p className="daily-empty">Aucun départ.</p>}</div>{!compact&&<div><h3><Clock3/>En séjour <b>{stayovers.length}</b></h3>{stayovers.length?stayovers.map(g=>card(g,'stay')):<p className="daily-empty">Aucun groupe en séjour.</p>}</div>}</div>
  {editing&&<div className="daily-modal-backdrop" onMouseDown={()=>setEditing(null)}><div className="daily-modal" onMouseDown={e=>e.stopPropagation()}><header><div><p>Fiche opérationnelle</p><h2>{editing.name}</h2><span>{['Arrivé','En séjour'].includes(editing.status||'')?'Réception master sur le dossier':'Dossier en préparation opérationnelle'}</span></div><button onClick={()=>setEditing(null)}><X/></button></header><div className="daily-edit-grid"><label>Heure d’arrivée<input disabled={!canEditOperational} type="time" value={editing.arrivalTime||''} onChange={e=>void updateArrivalTime(e.target.value)}/></label><label>Heure de départ<input disabled={!canEditOperational} type="time" value={editing.departureTime||''} onChange={e=>void updateDepartureTime(e.target.value)}/></label></div><h3>Horaires des repas</h3><div className="daily-meals">{(editing.mealDays||[]).filter(d=>d.date>=today).map(day=><div key={day.date}><strong>{new Date(`${day.date}T12:00:00`).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</strong>{(['breakfast','lunch','packedLunch','dinner','packedDinner'] as const).map(key=>day[key]?.pax?<label key={key}>{key==='breakfast'?'PDJ':key==='lunch'?'Déjeuner':key==='packedLunch'?'Panier midi':key==='dinner'?'Dîner':'Panier soir'}<input disabled={!canEditOperational} type="time" value={day[key]?.time||''} onChange={e=>{const mealDays=(editing.mealDays||[]).map(d=>d.date===day.date?{...d,[key]:{...d[key],time:e.target.value}}:d);void saveGroup({...editing,mealDays},`Horaire repas modifié le ${day.date}`)}}/></label>:null)}</div>)}</div><h3><BellRing size={17}/>Réveils pendant le séjour</h3><div className="wake-list">{(editing.wakeUps||[]).map((w,index)=><div key={`${w.date}-${index}`}><input disabled={!canEditOperational} type="date" value={w.date} onChange={e=>{const wakeUps=[...(editing.wakeUps||[])];wakeUps[index]={...w,date:e.target.value};void saveGroup({...editing,wakeUps},'Réveil modifié')}}/><input disabled={!canEditOperational} type="time" value={w.time} onChange={e=>{const wakeUps=[...(editing.wakeUps||[])];wakeUps[index]={...w,time:e.target.value};void saveGroup({...editing,wakeUps},'Réveil modifié')}}/></div>)}{canEditOperational&&<button onClick={()=>void saveGroup({...editing,wakeUps:[...(editing.wakeUps||[]),{date:date<editing.arrival! ? editing.arrival! : date,time:'06:30'}]},'Réveil ajouté')}>+ Ajouter un réveil</button>}</div><h3>Salles de réunion</h3><div className="daily-room-list">{roomsStore.data.filter(b=>b.groupId===editing.id).sort((a,b)=>`${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`)).map(b=><div key={b.id}><strong>{b.date} · {b.room}</strong><label>Début<input disabled={!canEditOperational} type="time" value={b.start} onChange={e=>void updateRoomTime(b,'start',e.target.value)}/></label><label>Fin<input disabled={!canEditOperational} type="time" value={b.end} onChange={e=>void updateRoomTime(b,'end',e.target.value)}/></label></div>)}</div><p className="daily-readonly-note">Après la mise en arrivée, la Réception devient le service maître pour les horaires, repas, réveils, salles et statut opérationnel. Les données commerciales restent en lecture seule.</p></div></div>}
 </section>;
}
