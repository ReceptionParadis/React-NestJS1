import { ArrowLeft, RefreshCw, UsersRound } from 'lucide-react';
import { OperationalGroupBuckets, type OperationalBooking, type OperationalGroup } from './OperationalGroupBuckets';
import { useOperationalStore } from './useOperationalStore';

function iso(date:Date){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function addDay(value:string,n:number){const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+n);return iso(d)}
function actor(){try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}'),u=s.user||{};return{name:`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim(),role:String(u.role?.name||u.role||'Réception')}}catch{return{name:'Utilisateur HospiCore',role:'Réception'}}}
function stamp(){return new Date().toLocaleString('fr-FR')}

export function ReceptionGroupsPage(){
 const groups=useOperationalStore<OperationalGroup[]>('group-360',[]);
 const meetings=useOperationalStore<OperationalBooking[]>('meeting-rooms',[]);
 const today=iso(new Date()),tomorrow=addDay(today,1),user=actor();
 const visible=groups.data.filter(g=>Boolean(g.arrival)&&Boolean(g.departure)&&String(g.arrival)<=tomorrow&&String(g.departure)>=today&&g.status!=='Parti').sort((a,b)=>String(a.arrival).localeCompare(String(b.arrival))||(a.arrivalTime||'99:99').localeCompare(b.arrivalTime||'99:99'));
 const busy=[groups,meetings].some(s=>s.state==='loading'||s.state==='saving');
 async function updateMealTime(groupId:string,date:string,service:string,time:string){const group=groups.data.find(g=>g.id===groupId);if(!group)return;const previous=group.mealDays?.find(d=>d.date===date)?.[service as keyof NonNullable<OperationalGroup['mealDays']>[number]] as {time?:string}|undefined;if((previous?.time||'')===time)return;const audit={id:crypto.randomUUID(),action:`Horaire repas ${service} modifié · ${date} · ${previous?.time||'—'} → ${time||'—'}`,actor:user.name,role:user.role,at:stamp()};await groups.save(groups.data.map(g=>g.id!==groupId?g:{...g,mealDays:(g.mealDays||[]).map(day=>day.date!==date?day:{...day,[service]:{...(day[service as keyof typeof day] as object||{}),time}}),audit:[...(g.audit||[]),audit]}))}
 async function updateWakeup(groupId:string,patch:{wakeupDate?:string;wakeupTime?:string}){const group=groups.data.find(g=>g.id===groupId);if(!group)return;const next={...group,...patch};if(group.wakeupDate===next.wakeupDate&&group.wakeupTime===next.wakeupTime)return;const label=[next.wakeupDate,next.wakeupTime].filter(Boolean).join(' à ')||'supprimé';const audit={id:crypto.randomUUID(),action:`Réveil groupe mis à jour · ${label}`,actor:user.name,role:user.role,at:stamp()};await groups.save(groups.data.map(g=>g.id===groupId?{...next,audit:[...(g.audit||[]),audit]}:g))}
 return <main className="reception-workspace-page">
  <header className="reception-workspace-header"><button onClick={()=>location.href='/reception'}><ArrowLeft size={18}/>Espace Réception</button><div><p>Réception · Groupes</p><h1><UsersRound size={29}/>Fiches Groupe 360°</h1><span>Vue opérationnelle · horaires repas et réveil groupe modifiables par la Réception.</span></div><button className="reception-workspace-refresh" onClick={()=>{void groups.refresh();void meetings.refresh()}}><RefreshCw size={17}/>{busy?'Synchronisation…':'Actualiser'}</button></header>
  {visible.length===0?<section className="reception-workspace-empty"><UsersRound size={30}/><h2>Aucun groupe à afficher</h2><p>Les groupes apparaîtront automatiquement à partir de la veille de leur arrivée.</p></section>:<OperationalGroupBuckets groups={visible} bookings={meetings.data} context="reception" onMealTimeChange={(groupId,date,service,time)=>void updateMealTime(groupId,date,service,time)} onWakeupChange={(groupId,patch)=>void updateWakeup(groupId,patch)}/>} 
 </main>
}
