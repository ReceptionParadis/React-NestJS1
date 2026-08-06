import { useMemo, useState } from 'react';
import { ArrowLeft, BedDouble, CheckCircle2, ChevronLeft, ChevronRight, Plus, Save, Trash2, UsersRound, X } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type ExceptionReason='Refus service'|'Ne pas déranger';
type ExceptionRoom={room:string;reason:ExceptionReason};
type Audit={id:string;action:string;actor:string;role:string;at:string};
type Group={
 id:string;name?:string;pax?:number;rooms?:number;arrival?:string;departure?:string;
 arrivalTime?:string;departureTime?:string;status?:string;housekeepingType?:string;
 housekeepingArrivalStatus?:string;stayoverStatus?:string;stayoverExceptions?:ExceptionRoom[];audit?:Audit[]
};
type SessionUser={name:string;role:string};

const iso=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const addDays=(value:string,days:number)=>{const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+days);return iso(d)};
const label=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
const stamp=()=>new Date().toLocaleString('fr-FR');
function currentUser():SessionUser{try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}'),u=s.user||{};return{name:`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim(),role:String(u.role?.name||u.role||u.department?.name||u.department||'Housekeeping')}}catch{return{name:'Utilisateur HospiCore',role:'Housekeeping'}}}

export function HousekeepingDashboardPage(){
 const groupsStore=useOperationalStore<Group[]>('group-360',[]);
 const [date,setDate]=useState(iso(new Date()));
 const [editing,setEditing]=useState<Group|null>(null);
 const [draftExceptions,setDraftExceptions]=useState<ExceptionRoom[]>([]);
 const user=currentUser();
 const groups=groupsStore.data;

 const arrivals=useMemo(()=>groups.filter(g=>g.arrival===date&&g.status!=='Parti').sort((a,b)=>(a.arrivalTime||'99:99').localeCompare(b.arrivalTime||'99:99')),[groups,date]);
 const stayovers=useMemo(()=>groups.filter(g=>String(g.arrival)<date&&String(g.departure)>date&&['Arrivé','En séjour','IN_HOUSE'].includes(g.status||'')),[groups,date]);

 async function saveGroup(next:Group,action:string){
  const audit=[...(next.audit||[]),{id:crypto.randomUUID(),action,actor:user.name,role:user.role,at:stamp()}];
  const saved={...next,audit};
  const ok=await groupsStore.save(groups.map(g=>g.id===saved.id?saved:g));
  if(ok)setEditing(saved);
 }
 async function markReady(group:Group){await saveGroup({...group,housekeepingArrivalStatus:'Chambres prêtes à donner'},'Housekeeping : chambres prêtes à donner')}
 async function markStayoverComplete(group:Group){await saveGroup({...group,stayoverStatus:'Recouche OK',stayoverExceptions:[]},'Housekeeping : recouche OK')}
 async function savePartial(){
  if(!editing||!draftExceptions.length||draftExceptions.some(item=>!item.room.trim()))return;
  await saveGroup({...editing,stayoverStatus:'Recouche partielle',stayoverExceptions:draftExceptions.map(item=>({...item,room:item.room.trim()}))},'Housekeeping : recouche partielle');
  setEditing(null);
 }
 function openPartial(group:Group){setEditing(group);setDraftExceptions(group.stayoverExceptions||[{room:'',reason:'Ne pas déranger'}])}

 return <div className="hk-page hk-simple-page">
  <header className="hk-header">
   <div><a href="/"><ArrowLeft size={18}/>Dashboard</a><p>HospiCore · Housekeeping</p><h1><BedDouble/>Suivi des groupes</h1><span>Indiquez uniquement si les chambres sont prêtes ou si la recouche est complète ou partielle.</span></div>
   <div className="hk-date-nav"><button onClick={()=>setDate(addDays(date,-1))}><ChevronLeft/></button><strong>{label(date)}</strong><button onClick={()=>setDate(addDays(date,1))}><ChevronRight/></button><button onClick={()=>setDate(iso(new Date()))}>Aujourd’hui</button></div>
  </header>

  <section className="hk-simple-summary">
   <article><span>Arrivées</span><strong>{arrivals.length}</strong></article>
   <article><span>Recouches</span><strong>{stayovers.length}</strong></article>
   <article><span>Groupes traités</span><strong>{[...arrivals,...stayovers].filter(g=>g.housekeepingArrivalStatus==='Chambres prêtes à donner'||['Recouche OK','Recouche partielle'].includes(g.stayoverStatus||'')).length}</strong></article>
  </section>

  <section className="hk-simple-columns">
   <div><h2>Groupes en arrivée <b>{arrivals.length}</b></h2>
    {arrivals.length?arrivals.map(group=>{
     const ready=group.housekeepingArrivalStatus==='Chambres prêtes à donner';
     return <article className={`hk-simple-card${ready?' done':''}`} key={group.id}>
      <header><div><strong>{group.name||'Groupe sans nom'}</strong><span><UsersRound size={14}/>{group.pax||0} pax · {group.rooms||0} chambres</span></div><time>{group.arrivalTime||'À confirmer'}</time></header>
      <p>{group.housekeepingType||'Prestation standard'}</p>
      {ready?<div className="hk-success"><CheckCircle2 size={18}/>Chambres prêtes à donner</div>:<button className="hk-primary-action" onClick={()=>void markReady(group)}><CheckCircle2 size={18}/>Marquer chambres prêtes à donner</button>}
     </article>
    }):<p className="hk-empty">Aucun groupe en arrivée.</p>}
   </div>

   <div><h2>Groupes en recouche <b>{stayovers.length}</b></h2>
    {stayovers.length?stayovers.map(group=>{
     const complete=group.stayoverStatus==='Recouche OK';
     const partial=group.stayoverStatus==='Recouche partielle';
     return <article className={`hk-simple-card${complete?' done':partial?' partial':''}`} key={group.id}>
      <header><div><strong>{group.name||'Groupe sans nom'}</strong><span><UsersRound size={14}/>{group.pax||0} pax · {group.rooms||0} chambres</span></div><span className="hk-pill">{group.stayoverStatus||'À traiter'}</span></header>
      {partial&&group.stayoverExceptions?.length?<ul>{group.stayoverExceptions.map(item=><li key={`${item.room}-${item.reason}`}>Chambre {item.room} · {item.reason}</li>)}</ul>:null}
      <div className="hk-card-actions"><button className="hk-complete-action" onClick={()=>void markStayoverComplete(group)}><CheckCircle2 size={17}/>Recouche OK</button><button className="hk-partial-action" onClick={()=>openPartial(group)}>Recouche partielle</button></div>
     </article>
    }):<p className="hk-empty">Aucun groupe en recouche.</p>}
   </div>
  </section>

  {editing&&<div className="hk-modal-backdrop" onMouseDown={()=>setEditing(null)}><div className="hk-modal hk-partial-modal" onMouseDown={event=>event.stopPropagation()}>
   <header><div><p>Recouche partielle</p><h2>{editing.name}</h2></div><button onClick={()=>setEditing(null)}><X/></button></header>
   <p>Renseignez uniquement les chambres qui n’ont pas été faites.</p>
   <div className="hk-exceptions">{draftExceptions.map((item,index)=><div key={index}><input inputMode="numeric" placeholder="N° de chambre" value={item.room} onChange={event=>setDraftExceptions(draftExceptions.map((value,i)=>i===index?{...value,room:event.target.value}:value))}/><select value={item.reason} onChange={event=>setDraftExceptions(draftExceptions.map((value,i)=>i===index?{...value,reason:event.target.value as ExceptionReason}:value))}><option>Refus service</option><option>Ne pas déranger</option></select><button aria-label="Supprimer" onClick={()=>setDraftExceptions(draftExceptions.filter((_,i)=>i!==index))}><Trash2 size={16}/></button></div>)}</div>
   <button className="hk-add" onClick={()=>setDraftExceptions([...draftExceptions,{room:'',reason:'Ne pas déranger'}])}><Plus size={16}/>Ajouter une chambre</button>
   <button className="hk-save" disabled={!draftExceptions.length||draftExceptions.some(item=>!item.room.trim())} onClick={()=>void savePartial()}><Save size={16}/>Enregistrer la recouche partielle</button>
  </div></div>}
 </div>
}
