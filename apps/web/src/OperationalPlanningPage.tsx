import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Clock3, Filter, RefreshCw, TriangleAlert, UsersRound } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type MealCell={pax?:number;time?:string};
type MealDay={date:string;breakfast?:MealCell;lunch?:MealCell;packedLunch?:MealCell;dinner?:MealCell;packedDinner?:MealCell};
type Audit={at?:string;action?:string;actor?:string;role?:string};
type Group={id:string;name?:string;pax?:number;rooms?:number;arrival?:string;departure?:string;arrivalTime?:string;departureTime?:string;status?:string;stayType?:string;housekeepingType?:string;housekeepingArrivalStatus?:string;stayoverStatus?:string;luggageArrival?:string|boolean;luggageDeparture?:string|boolean;mealDays?:MealDay[];audit?:Audit[]};
type Booking={id:string;groupId?:string;title:string;room:string;date:string;start:string;end:string;attendees:number;status?:string};
type Service='Tous'|'Réception'|'Commercial'|'Direction';
type EventKind='arrival'|'departure'|'meal'|'meeting'|'luggage';
type PlanningEvent={id:string;time:string;sort:string;kind:EventKind;title:string;subtitle:string;meta:string;services:Service[];groupId?:string;pax?:number;endTime?:string};

const filters:Service[]=['Tous','Réception','Commercial','Direction'];
function iso(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function shift(value:string,days:number){const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+days);return iso(d)}
function label(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function mealLabel(key:string){return key==='breakfast'?'Petit-déjeuner':key==='lunch'?'Déjeuner':key==='packedLunch'?'Panier repas midi':key==='dinner'?'Dîner':'Panier repas soir'}
function safeTime(value?:string){return value&&/^\d{2}:\d{2}/.test(value)?value.slice(0,5):'À confirmer'}
function scoreLabel(score:number){return score>=80?'Critique':score>=55?'Élevée':score>=30?'Modérée':'Faible'}
function timeAt(date:string,time?:string){if(!time||!/^\d{1,2}:\d{2}/.test(time))return Number.NaN;const [y,m,d]=date.split('-').map(Number),[hh,mm]=time.split(':').map(Number);return new Date(y,m-1,d,hh,mm,0,0).getTime()}
function eventExpired(event:PlanningEvent,date:string,now:number){if(date!==iso(new Date(now)))return false;if(event.time==='À confirmer')return false;const expiry=event.kind==='meeting'&&event.endTime?timeAt(date,event.endTime):timeAt(date,event.time)+5*60_000;return Number.isFinite(expiry)&&now>=expiry}

export function OperationalPlanningPage(){
 const [date,setDate]=useState(()=>iso(new Date()));
 const [filter,setFilter]=useState<Service>('Tous');
 const [now,setNow]=useState(()=>Date.now());
 const groupsStore=useOperationalStore<Group[]>('group-360',[]);
 const roomsStore=useOperationalStore<Booking[]>('meeting-rooms',[]);
 const groups=groupsStore.data;
 useEffect(()=>{const timer=window.setInterval(()=>setNow(Date.now()),5_000);return()=>window.clearInterval(timer)},[]);

 const events=useMemo(()=>{
  const list:PlanningEvent[]=[];
  groups.forEach(group=>{
   if(group.arrival===date){
    const time=safeTime(group.arrivalTime);
    list.push({id:`a-${group.id}`,time,sort:time==='À confirmer'?'99:90':time,kind:'arrival',title:`Arrivée · ${group.name||'Groupe'}`,subtitle:`${group.pax||0} pax · ${group.rooms||0} chambre(s)`,meta:group.housekeepingArrivalStatus||group.housekeepingType||'Préparation à confirmer',services:['Réception','Direction'],groupId:group.id,pax:group.pax});
    if(group.luggageArrival)list.push({id:`la-${group.id}`,time,sort:time==='À confirmer'?'99:91':time,kind:'luggage',title:`Bagagerie arrivée · ${group.name||'Groupe'}`,subtitle:`${group.pax||0} pax`,meta:String(group.luggageArrival===true?'Prévue':group.luggageArrival),services:['Réception','Direction'],groupId:group.id});
   }
   if(group.departure===date){
    const time=safeTime(group.departureTime);
    list.push({id:`d-${group.id}`,time,sort:time==='À confirmer'?'99:92':time,kind:'departure',title:`Départ · ${group.name||'Groupe'}`,subtitle:`${group.pax||0} pax · ${group.rooms||0} chambre(s)`,meta:group.status||'Prévu',services:['Réception','Direction'],groupId:group.id,pax:group.pax});
    if(group.luggageDeparture)list.push({id:`ld-${group.id}`,time,sort:time==='À confirmer'?'99:93':time,kind:'luggage',title:`Bagagerie départ · ${group.name||'Groupe'}`,subtitle:`${group.pax||0} pax`,meta:String(group.luggageDeparture===true?'Prévue':group.luggageDeparture),services:['Réception','Direction'],groupId:group.id});
   }
   const day=group.mealDays?.find(item=>item.date===date);
   if(day)(['breakfast','lunch','packedLunch','dinner','packedDinner'] as const).forEach(key=>{
    const meal=day[key];if(!meal?.pax)return;const time=safeTime(meal.time);
    list.push({id:`m-${group.id}-${key}`,time,sort:time==='À confirmer'?'99:94':time,kind:'meal',title:`${mealLabel(key)} · ${group.name||'Groupe'}`,subtitle:`${meal.pax} personne(s)`,meta:key.includes('packed')?'Panier repas groupe':'Prestation repas groupe',services:['Réception','Commercial','Direction'],groupId:group.id,pax:meal.pax});
   });
  });
  roomsStore.data.filter(room=>room.date===date).forEach(room=>list.push({id:`r-${room.id}`,time:safeTime(room.start),endTime:safeTime(room.end),sort:safeTime(room.start)==='À confirmer'?'99:95':safeTime(room.start),kind:'meeting',title:`Salle ${room.room}`,subtitle:room.title,meta:`${room.start}–${room.end} · ${room.attendees} pers.`,services:['Commercial','Réception','Direction'],groupId:room.groupId,pax:room.attendees}));
  return list.sort((a,b)=>a.sort.localeCompare(b.sort)||a.title.localeCompare(b.title,'fr'));
 },[groups,roomsStore.data,date]);

 const activeEvents=useMemo(()=>events.filter(event=>!eventExpired(event,date,now)),[events,date,now]);
 const visible=filter==='Tous'||filter==='Direction'?activeEvents:activeEvents.filter(event=>event.services.includes(filter));
 const arrivals=activeEvents.filter(e=>e.kind==='arrival');
 const departures=activeEvents.filter(e=>e.kind==='departure');
 const meals=activeEvents.filter(e=>e.kind==='meal');
 const meetings=activeEvents.filter(e=>e.kind==='meeting');
 const luggage=activeEvents.filter(e=>e.kind==='luggage');
 const covers=meals.reduce((sum,e)=>sum+(e.pax||0),0);
 const serviceLoads=useMemo(()=>{
  const reception=Math.min(100,arrivals.length*15+departures.length*12+luggage.length*10);
  const groupMeals=Math.min(100,Math.round(covers/8)+meals.filter(e=>e.title.includes('Panier')).length*8);
  const commercial=Math.min(100,meetings.length*18+arrivals.length*4);
  return [{name:'Réception',score:reception},{name:'Repas groupes',score:groupMeals},{name:'Commercial',score:commercial}];
 },[arrivals,departures,luggage,covers,meals,meetings]);
 const alerts=useMemo(()=>{
  const rows:string[]=[];
  const byTime=new Map<string,PlanningEvent[]>();activeEvents.filter(e=>e.time!=='À confirmer').forEach(e=>byTime.set(e.time,[...(byTime.get(e.time)||[]),e]));
  byTime.forEach((items,time)=>{const arrivalsAt=items.filter(e=>e.kind==='arrival');if(arrivalsAt.length>=2)rows.push(`${arrivalsAt.length} groupes arrivent à ${time}.`);const mealPax=items.filter(e=>e.kind==='meal').reduce((s,e)=>s+(e.pax||0),0);if(mealPax>=350)rows.push(`${mealPax} personnes prévues sur les prestations repas à ${time}.`);});
  if(meetings.length>=3)rows.push(`${meetings.length} salles à préparer sur la journée.`);
  return rows.slice(0,6);
 },[activeEvents,meetings.length]);
 const timeline=useMemo(()=>groups.flatMap(group=>(group.audit||[]).map((item,index)=>({id:`${group.id}-${index}`,group:group.name||'Groupe',at:item.at||'',text:item.action||'Mise à jour',service:item.role||'Opérations',actor:item.actor||''}))).filter(item=>item.at.includes(date.split('-').reverse().join('/'))||item.at.startsWith(date)).sort((a,b)=>b.at.localeCompare(a.at,'fr')).slice(0,10),[groups,date]);
 const loading=[groupsStore,roomsStore].some(store=>store.state==='loading'||store.state==='saving');
 const refresh=()=>{void groupsStore.refresh();void roomsStore.refresh()};

 return <div className="op-plan-page">
  <header className="op-plan-topbar"><div><button onClick={()=>location.href='/'}><ArrowLeft size={18}/>HospiCore</button><p>Centre de pilotage</p><h1>Planning opérationnel</h1><span>Vue chronologique commune à la Réception, au Commercial et à la Direction.</span></div><button className={loading?'loading':''} onClick={refresh}><RefreshCw size={17}/>Actualiser</button></header>
  <main className="op-plan-content">
   <section className="op-plan-datebar"><button onClick={()=>setDate(shift(date,-1))}><ChevronLeft size={19}/></button><div><CalendarDays size={20}/><strong>{label(date)}</strong></div><button onClick={()=>setDate(shift(date,1))}><ChevronRight size={19}/></button><button onClick={()=>setDate(iso(new Date()))}>Aujourd’hui</button></section>
   <section className="op-plan-loads">{serviceLoads.map(item=><article key={item.name} data-level={scoreLabel(item.score)}><span>{item.name}</span><strong>{scoreLabel(item.score)}</strong><div><i style={{width:`${item.score}%`}}/></div><small>{item.score}/100</small></article>)}</section>
   <section className="op-plan-summary"><article><b>{arrivals.length}</b><span>Arrivées</span></article><article><b>{departures.length}</b><span>Départs</span></article><article><b>{covers}</b><span>Personnes repas</span></article><article><b>{luggage.length}</b><span>Bagageries</span></article><article><b>{meetings.length}</b><span>Salles</span></article></section>
   <section className="op-plan-filters"><Filter size={17}/>{filters.map(item=><button className={filter===item?'active':''} onClick={()=>setFilter(item)} key={item}>{item}</button>)}</section>
   <div className="op-plan-layout"><section className="op-plan-timeline"><header><div><Clock3 size={19}/><h2>Déroulé chronologique</h2></div><span>{visible.length} événement(s)</span></header>{visible.length?visible.map(event=><button key={event.id} className={`op-event ${event.kind}`} onClick={()=>event.groupId&&(location.href=`/commercial/groupes?groupId=${encodeURIComponent(event.groupId)}`)}><time>{event.time}</time><div><strong>{event.title}</strong><span>{event.subtitle}</span><small>{event.meta}</small></div><em>{event.services.filter(s=>s!=='Direction').join(' · ')}</em></button>):<p className="op-empty">Aucun événement en cours ou à venir pour cette sélection.</p>}</section><aside className="op-plan-side"><section className="op-alerts"><header><TriangleAlert size={19}/><h2>Alertes de charge</h2></header>{alerts.length?alerts.map((alert,index)=><p key={index}>{alert}</p>):<p className="ok">Aucun conflit détecté.</p>}</section><section className="op-live"><header><UsersRound size={19}/><h2>Timeline live</h2></header>{timeline.length?timeline.map(item=><article key={item.id}><time>{item.at||'—'}</time><div><strong>{item.service}</strong><span>{item.group} · {item.text}{item.actor?` · ${item.actor}`:''}</span></div></article>):<p className="op-empty">Aucune action enregistrée pour cette journée.</p>}</section></aside></div>
  </main>
 </div>;
}
