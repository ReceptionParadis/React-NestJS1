import { ArrowLeft, RefreshCw, UsersRound } from 'lucide-react';
import { OperationalGroupBuckets, type OperationalBooking, type OperationalGroup } from './OperationalGroupBuckets';
import { useOperationalStore } from './useOperationalStore';

function iso(date:Date){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function addDay(value:string,n:number){const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+n);return iso(d)}

export function ReceptionGroupsPage(){
 const groups=useOperationalStore<OperationalGroup[]>('group-360',[]);
 const meetings=useOperationalStore<OperationalBooking[]>('meeting-rooms',[]);
 const today=iso(new Date()),tomorrow=addDay(today,1);
 const visible=groups.data.filter(g=>Boolean(g.arrival)&&Boolean(g.departure)&&String(g.arrival)<=tomorrow&&String(g.departure)>=today&&g.status!=='Parti').sort((a,b)=>String(a.arrival).localeCompare(String(b.arrival))||(a.arrivalTime||'99:99').localeCompare(b.arrivalTime||'99:99'));
 const busy=[groups,meetings].some(s=>s.state==='loading'||s.state==='saving');
 return <main className="reception-workspace-page">
  <header className="reception-workspace-header"><button onClick={()=>location.href='/reception'}><ArrowLeft size={18}/>Espace Réception</button><div><p>Réception · Groupes</p><h1><UsersRound size={29}/>Fiches Groupe 360°</h1><span>Lecture seule · groupes visibles uniquement de J-1 jusqu’au départ.</span></div><button className="reception-workspace-refresh" onClick={()=>{void groups.refresh();void meetings.refresh()}}><RefreshCw size={17}/>{busy?'Synchronisation…':'Actualiser'}</button></header>
  {visible.length===0?<section className="reception-workspace-empty"><UsersRound size={30}/><h2>Aucun groupe à afficher</h2><p>Les groupes apparaîtront automatiquement à partir de la veille de leur arrivée.</p></section>:<OperationalGroupBuckets groups={visible} bookings={meetings.data} context="reception"/>}
 </main>
}
