import { useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Coffee, Droplets, Grape, Salad, Soup, UsersRound } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type MealKey='breakfast'|'lunch'|'packedLunch'|'dinner'|'packedDinner';
type MealCell={pax?:number;time?:string;water?:boolean;wine?:boolean};
type MealDay={date:string;breakfast?:MealCell;lunch?:MealCell;packedLunch?:MealCell;dinner?:MealCell;packedDinner?:MealCell};
type MealStatus='Prévu'|'Pris en charge'|'En salle'|'Terminé';
type Group={id:string;name?:string;pax?:number;status?:string;breakfastType?:string;dietary?:string;mealDays?:MealDay[];restaurantTracking?:Record<string,{status:MealStatus;updatedBy:string;updatedAt:string}>;audit?:Array<{id:string;action:string;actor:string;role:string;at:string}>};
type SessionUser={name:string;role:string};

const mealNames:Record<MealKey,string>={breakfast:'Petit-déjeuner',lunch:'Déjeuner',packedLunch:'Panier repas midi',dinner:'Dîner',packedDinner:'Panier repas soir'};
const mealIcons:Record<MealKey,typeof Coffee>={breakfast:Coffee,lunch:Salad,packedLunch:Salad,dinner:Soup,packedDinner:Soup};
const todayIso=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const addDays=(value:string,n:number)=>{const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+n);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const dateLabel=(value:string)=>new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
function user():SessionUser{try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}');const u=s.user||{};return{name:`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim(),role:String(u.role?.name||u.role||'Collaborateur')}}catch{return{name:'Utilisateur HospiCore',role:'Collaborateur'}}}
function stamp(){return new Date().toLocaleString('fr-FR')}

export function RestaurantPlanningPage(){
 const store=useOperationalStore<Group[]>('group-360',[]);
 const [date,setDate]=useState(todayIso());
 const [filter,setFilter]=useState<'Tous'|MealKey>('Tous');
 const currentUser=user();
 const rows=useMemo(()=>store.data.flatMap(group=>{
  const day=group.mealDays?.find(item=>item.date===date);if(!day)return[];
  return (Object.keys(mealNames) as MealKey[]).flatMap(key=>{const meal=day[key];if(!meal?.pax)return[];const tracking=group.restaurantTracking?.[`${date}:${key}`];return[{group,key,meal,status:tracking?.status||'Prévu' as MealStatus,updatedAt:tracking?.updatedAt||''}]});
 }).filter(row=>filter==='Tous'||row.key===filter).sort((a,b)=>(a.meal.time||'99:99').localeCompare(b.meal.time||'99:99')),[store.data,date,filter]);
 const totals=useMemo(()=>({breakfast:rows.filter(r=>r.key==='breakfast').reduce((s,r)=>s+(r.meal.pax||0),0),lunch:rows.filter(r=>r.key==='lunch'||r.key==='packedLunch').reduce((s,r)=>s+(r.meal.pax||0),0),dinner:rows.filter(r=>r.key==='dinner'||r.key==='packedDinner').reduce((s,r)=>s+(r.meal.pax||0),0),arrived:new Set(rows.filter(r=>['Arrivé','En séjour'].includes(r.group.status||'')).map(r=>r.group.id)).size}),[rows]);
 async function setStatus(group:Group,key:MealKey,status:MealStatus){const slot=`${date}:${key}`,at=stamp();await store.save(store.data.map(g=>g.id===group.id?{...g,restaurantTracking:{...(g.restaurantTracking||{}),[slot]:{status,updatedBy:currentUser.name,updatedAt:at}},audit:[...(g.audit||[]),{id:crypto.randomUUID(),action:`Restaurant · ${mealNames[key]} : ${status}`,actor:currentUser.name,role:currentUser.role,at}]}:g))}
 return <div className="restaurant-page">
  <header className="restaurant-header"><div><button className="restaurant-back" onClick={()=>location.href='/'}><ArrowLeft size={18}/>Dashboard</button><p className="restaurant-eyebrow">HospiCore · Restaurant</p><h1>Service Restaurant</h1><p>Repas groupes, horaires, effectifs et prise en charge en temps réel.</p></div><div className="restaurant-date-nav"><button onClick={()=>setDate(addDays(date,-1))}><ChevronLeft/></button><strong>{dateLabel(date)}</strong><button onClick={()=>setDate(addDays(date,1))}><ChevronRight/></button><button onClick={()=>setDate(todayIso())}>Aujourd’hui</button></div></header>
  <div className={`sync-banner ${store.state}`}><span>{store.message}</span></div>
  <section className="restaurant-kpis"><article><Coffee/><span>Petit-déjeuner</span><strong>{totals.breakfast}</strong><small>couverts</small></article><article><Salad/><span>Midi</span><strong>{totals.lunch}</strong><small>repas + paniers</small></article><article><Soup/><span>Soir</span><strong>{totals.dinner}</strong><small>repas + paniers</small></article><article><CheckCircle2/><span>Groupes arrivés</span><strong>{totals.arrived}</strong><small>confirmés par la Réception</small></article></section>
  <section className="restaurant-toolbar"><div className="meal-tabs">{(['Tous','breakfast','lunch','packedLunch','dinner','packedDinner'] as const).map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item==='Tous'?'Tous':mealNames[item]}</button>)}</div></section>
  <section className="restaurant-list">{rows.length?rows.map(({group,key,meal,status,updatedAt})=>{const Icon=mealIcons[key],arrived=['Arrivé','En séjour'].includes(group.status||'');return <article className="restaurant-group-card" key={`${group.id}-${date}-${key}`}><div className="meal-icon"><Icon/></div><div className="group-main"><div className="group-heading"><div><span className="meal-label">{mealNames[key]}</span><h2>{group.name||'Groupe sans nom'}</h2></div><span className={`arrival-badge ${arrived?'arrivé':'non-arrivé'}`}>{arrived?'Arrivé':'Non arrivé'}</span></div><div className="group-details"><span><Clock3/><strong>{meal.time||'À confirmer'}</strong></span><span><UsersRound/><strong>{meal.pax} pax</strong></span>{key==='breakfast'&&<span><Coffee/><strong>{group.breakfastType||'Standard'}</strong></span>}{meal.water&&<span><Droplets/><strong>Eau incluse</strong></span>}{meal.wine&&<span><Grape/><strong>Vin inclus</strong></span>}</div>{group.dietary&&<div className="group-notes"><strong>Régimes / allergies :</strong> {group.dietary}</div>}</div><div className="reception-status"><span>Suivi Restaurant</span><strong>{status}</strong>{updatedAt&&<small>{updatedAt}</small>}{status==='Prévu'&&<button onClick={()=>void setStatus(group,key,'Pris en charge')}>Prendre en charge</button>}{status==='Pris en charge'&&arrived&&<button onClick={()=>void setStatus(group,key,'En salle')}>Groupe en salle</button>}{status==='En salle'&&<button onClick={()=>void setStatus(group,key,'Terminé')}>Service terminé</button>}{status==='Terminé'&&<small>✓ Service clôturé</small>}</div></article>}):<div className="restaurant-empty"><strong>Aucun repas groupe prévu</strong><span>pour cette date et ce filtre.</span></div>}</section>
 </div>
}
