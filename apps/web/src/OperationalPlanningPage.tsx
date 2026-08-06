import { useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock3, Filter, RefreshCw, TriangleAlert, UsersRound } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type MealCell={pax?:number;time?:string};
type MealDay={date:string;breakfast?:MealCell;lunch?:MealCell;packedLunch?:MealCell;dinner?:MealCell;packedDinner?:MealCell};
type HistoryItem={at?:string;date?:string;time?:string;action?:string;message?:string;user?:string;role?:string;service?:string};
type Group={
 id:string;name?:string;pax?:number;rooms?:number;arrival?:string;departure?:string;arrivalTime?:string;departureTime?:string;
 status?:string;stayType?:string;housekeepingType?:string;housekeepingArrivalStatus?:string;stayoverStatus?:string;
 luggageArrival?:string|boolean;luggageDeparture?:string|boolean;balanceDue?:number;mealDays?:MealDay[];history?:HistoryItem[];
};
type Booking={id:string;groupId?:string;title:string;room:string;date:string;start:string;end:string;attendees:number;status?:string};
type Sheet={status?:string;lines?:Array<{groupId:string}>};
type Service='Tous'|'Réception'|'Restaurant'|'Cuisine'|'Housekeeping'|'Commercial'|'Direction';
type EventKind='arrival'|'departure'|'meal'|'meeting'|'luggage';
type PlanningEvent={id:string;time:string;sort:string;kind:EventKind;title:string;subtitle:string;meta:string;services:Service[];groupId?:string;pax?:number};

const filters:Service[]=['Tous','Réception','Restaurant','Cuisine','Housekeeping','Commercial','Direction'];
function iso(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function shift(value:string,days:number){const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+days);return iso(d)}
function label(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function mealLabel(key:string){return key==='breakfast'?'Petit-déjeuner':key==='lunch'?'Déjeuner':key==='packedLunch'?'Panier repas midi':key==='dinner'?'Dîner':'Panier repas soir'}
function safeTime(value?:string){return value&&/^\d{2}:\d{2}/.test(value)?value.slice(0,5):'À confirmer'}
function scoreLabel(score:number){return score>=80?'Critique':score>=55?'Élevée':score>=30?'Modérée':'Faible'}

export function OperationalPlanningPage(){
 const [date,setDate]=useState(()=>iso(new Date()));
 const [filter,setFilter]=useState<Service>('Tous');
 const groupsStore=useOperationalStore<Group[]>('group-360',[]);
 const roomsStore=useOperationalStore<Booking[]>('meeting-rooms',[]);
 const sheetsStore=useOperationalStore<Sheet[]>('function-sheets',[]);
 const publishedIds=useMemo(()=>new Set(sheetsStore.data.filter(s=>['Prête à imprimer','Diffusée','Clôturée'].includes(s.status||'')).flatMap(s=>s.lines?.map(l=>l.groupId)||[])),[sheetsStore.data]);
 const groups=useMemo(()=>groupsStore.data.filter(g=>publishedIds.size===0||publishedIds.has(g.id)),[groupsStore.data,publishedIds]);

 const events=useMemo(()=>{
  const list:PlanningEvent[]=[];
  groups.forEach(group=>{
   if(group.arrival===date){
    const time=safeTime(group.arrivalTime);
    list.push({id:`a-${group.id}`,time,sort:time==='À confirmer'?'99:90':time,kind:'arrival',title:`Arrivée · ${group.name||'Groupe'}`,subtitle:`${group.pax||0} pax · ${group.rooms||0} chambre(s)`,meta:group.housekeepingArrivalStatus||group.housekeepingType||'Préparation à confirmer',services:['Réception','Housekeeping','Restaurant','Cuisine','Direction'],groupId:group.id,pax:group.pax});
    if(group.luggageArrival)list.push({id:`la-${group.id}`,time,sort:time==='À confirmer'?'99:91':time,kind:'luggage',title:`Bagagerie arrivée · ${group.name||'Groupe'}`,subtitle:`${group.pax||0} pax`,meta:String(group.luggageArrival===true?'Prévue':group.luggageArrival),services:['Réception','Direction'],groupId:group.id});
   }
   if(group.departure===date){
    const time=safeTime(group.departureTime);
    list.push({id:`d-${group.id}`,time,sort:time==='À confirmer'?'99:92':time,kind:'departure',title:`Départ · ${group.name||'Groupe'}`,subtitle:`${group.pax||0} pax · ${group.rooms||0} chambre(s)`,meta:group.status||'Prévu',services:['Réception','Housekeeping','Direction'],groupId:group.id,pax:group.pax});
    if(group.luggageDeparture)list.push({id:`ld-${group.id}`,time,sort:time==='À confirmer'?'99:93':time,kind:'luggage',title:`Bagagerie départ · ${group.name||'Groupe'}`,subtitle:`${group.pax||0} pax`,meta:String(group.luggageDeparture===true?'Prévue':group.luggageDeparture),services:['Réception','Direction'],groupId:group.id});
   }
   const day=group.mealDays?.find(item=>item.date===date);
   if(day)(['breakfast','lunch','packedLunch','dinner','packedDinner'] as const).forEach(key=>{
    const meal=day[key];if(!meal?.pax)return;const time=safeTime(meal.time);
    list.push({id:`m-${group.id}-${key}`,time,sort:time==='À confirmer'?'99:94':time,kind:'meal',title:`${mealLabel(key)} · ${group.name||'Groupe'}`,subtitle:`${meal.pax} couvert(s)`,meta:key.includes('packed')?'Production paniers repas':'Service groupe',services:['Restaurant','Cuisine','Direction'],groupId:group.id,pax:meal.pax});
   });
  });
  roomsStore.data.filter(room=>room.date===date).forEach(room=>list.push({id:`r-${room.id}`,time:safeTime(room.start),sort:safeTime(room.start)==='À confirmer'?'99:95':safeTime(room.start),kind:'meeting',title:`Salle ${room.room}`,subtitle:room.title,meta:`${room.start}–${room.end} · ${room.attendees} pers.`,services:['Commercial','Réception','Direction'],groupId:room.groupId,pax:room.attendees}));
  return list.sort((a,b)=>a.sort.localeCompare(b.sort)||a.title.localeCompare(b.title,'fr'));
 },[groups,roomsStore.data,date]);

 const visible=filter==='Tous'||filter==='Direction'?events:events.filter(event=>event.services.includes(filter));
 const arrivals=events.filter(e=>e.kind==='arrival');
 const departures=events.filter(e=>e.kind==='departure');
 const meals=events.filter(e=>e.kind==='meal');
 const meetings=events.filter(e=>e.kind==='meeting');
 const luggage=events.filter(e=>e.kind==='luggage');
 const covers=meals.reduce((sum,e)=>sum+(e.pax||0),0);
 const serviceLoads=useMemo(()=>{
  const reception=Math.min(100,arrivals.length*15+departures.length*12+luggage.length*10);
  const housekeeping=Math.min(100,arrivals.reduce((s,e)=>s+Math.ceil((e.pax||0)/25),0)*8+departures.length*8);
  const restaurant=Math.min(100,Math.round(covers/8));
  const cuisine=Math.min(100,Math.round(covers/9)+meals.filter(e=>e.title.includes('Panier')).length*10);
  const commercial=Math.min(100,meetings.length*18);
  return [{name:'Réception',score:reception},{name:'Housekeeping',score:housekeeping},{name:'Restaurant',score:restaurant},{name:'Cuisine',score:cuisine},{name:'Commercial',score:commercial}];
 },[arrivals,departures,luggage,covers,meals,meetings]);
 const alerts=useMemo(()=>{
  const rows:string[]=[];
  const byTime=new Map<string,PlanningEvent[]>();events.filter(e=>e.time!=='À confirmer').forEach(e=>byTime.set(e.time,[...(byTime.get(e.time)||[]),e]));
  byTime.forEach((items,time)=>{const arrivalsAt=items.filter(e=>e.kind==='arrival');if(arrivalsAt.length>=2)rows.push(`${arrivalsAt.length} groupes arrivent à ${time}.`);const mealPax=items.filter(e=>e.kind==='meal').reduce((s,e)=>s+(e.pax||0),0);if(mealPax>=350)rows.push(`${mealPax} couverts prévus à ${time}.`);});
  arrivals.forEach(e=>{const g=groups.find(item=>item.id===e.groupId);if(g?.arrivalTime&&g.arrivalTime<'16:00'&&g.housekeepingArrivalStatus!=='Chambres prêtes à donner')rows.push(`Early check-in ${g.name||'groupe'} sans confirmation de chambres prêtes.`)});
  if(meetings.length>=3)rows.push(`${meetings.length} salles à préparer sur la journée.`);
  return rows.slice(0,6);
 },[events,arrivals,groups,meetings.length]);
 const timeline=useMemo(()=>groups.flatMap(group=>(group.history||[]).map((item,index)=>({id:`${group.id}-${index}`,group:group.name||'Groupe',at:item.at||item.date||'',time:item.time||'',text:item.message||item.action||'Mise à jour',service:item.service||item.role||'Opérations'}))).filter(item=>item.at.startsWith(date)||item.at.includes(date)).sort((a,b)=>`${b.at}${b.time}`.localeCompare(`${a.at}${a.time}`)).slice(0,10),[groups,date]);
 const loading=[groupsStore,roomsStore,sheetsStore].some(store=>store.state==='loading'||store.state==='saving');
 const refresh=()=>{void groupsStore.refresh();void roomsStore.refresh();void sheetsStore.refresh()};

 return <div className="op-plan-page">
  <header className="op-plan-topbar">
   <div><button onClick={()=>location.href='/'}><ArrowLeft size={18}/>HospiCore Live</button><p>Centre de pilotage</p><h1>Planning opérationnel</h1><span>Vue chronologique de l’activité de l’hôtel.</span></div>
   <button className={loading?'loading':''} onClick={refresh}><RefreshCw size={17}/>Actualiser</button>
  </header>
  <main className="op-plan-content">
   <section className="op-plan-datebar"><button onClick={()=>setDate(shift(date,-1))}><ChevronLeft size={19}/></button><div><CalendarDays size={20}/><strong>{label(date)}</strong></div><button onClick={()=>setDate(shift(date,1))}><ChevronRight size={19}/></button><button onClick={()=>setDate(iso(new Date()))}>Aujourd’hui</button></section>
   <section className="op-plan-loads">{serviceLoads.map(item=><article key={item.name} data-level={scoreLabel(item.score)}><span>{item.name}</span><strong>{scoreLabel(item.score)}</strong><div><i style={{width:`${item.score}%`}}/></div><small>{item.score}/100</small></article>)}</section>
   <section className="op-plan-summary">
    <article><b>{arrivals.length}</b><span>Arrivées</span></article><article><b>{departures.length}</b><span>Départs</span></article><article><b>{covers}</b><span>Couverts</span></article><article><b>{luggage.length}</b><span>Bagageries</span></article><article><b>{meetings.length}</b><span>Salles</span></article>
   </section>
   <section className="op-plan-filters"><Filter size={17}/>{filters.map(item=><button className={filter===item?'active':''} onClick={()=>setFilter(item)} key={item}>{item}</button>)}</section>
   <div className="op-plan-layout">
    <section className="op-plan-timeline"><header><div><Clock3 size={19}/><h2>Déroulé chronologique</h2></div><span>{visible.length} événement(s)</span></header>{visible.length?visible.map(event=><button key={event.id} className={`op-event ${event.kind}`} onClick={()=>event.groupId&&(location.href=`/commercial/groupes?groupId=${encodeURIComponent(event.groupId)}`)}><time>{event.time}</time><div><strong>{event.title}</strong><span>{event.subtitle}</span><small>{event.meta}</small></div><em>{event.services.filter(s=>s!=='Direction').slice(0,3).join(' · ')}</em></button>):<p className="op-empty">Aucun événement pour cette sélection.</p>}</section>
    <aside className="op-plan-side">
     <section className="op-alerts"><header><TriangleAlert size={19}/><h2>Alertes de charge</h2></header>{alerts.length?alerts.map((alert,index)=><p key={index}>{alert}</p>):<p className="ok">Aucun conflit détecté.</p>}</section>
     <section className="op-live"><header><UsersRound size={19}/><h2>Timeline live</h2></header>{timeline.length?timeline.map(item=><article key={item.id}><time>{item.time||'—'}</time><div><strong>{item.service}</strong><span>{item.group} · {item.text}</span></div></article>):<p className="op-empty">Aucune action enregistrée pour cette journée.</p>}</section>
    </aside>
   </div>
  </main>
 </div>;
}
