import { useMemo, useState } from 'react';
import {
  BedDouble, BookOpenCheck, BriefcaseBusiness, CalendarDays, ChefHat, ClipboardList,
  ConciergeBell, History, LayoutDashboard, ListTodo, Menu, RefreshCw, Settings,
  Sparkles, UsersRound, UtensilsCrossed, Wrench, X,
} from 'lucide-react';
import { DailyGroupBoard } from './DailyGroupBoard';
import { useOperationalStore } from './useOperationalStore';

type Session={user?:{firstName?:string;lastName?:string;role?:string|{name?:string};hotel?:{name?:string}}};
type MealCell={pax?:number;time?:string};
type MealDay={date:string;breakfast?:MealCell;lunch?:MealCell;packedLunch?:MealCell;dinner?:MealCell;packedDinner?:MealCell};
type Group={id:string;name?:string;pax?:number;arrival?:string;departure?:string;status?:string;mealDays?:MealDay[]};
type Booking={id:string;groupId?:string;title:string;room:string;date:string;start:string;end:string;attendees:number;status?:string};
type Sheet={status?:string;lines?:Array<{groupId:string}>};

type MealEvent={id:string;time:string;label:string;group:string;pax:number};

const nav=[
 {label:'HospiCore Live',icon:LayoutDashboard,href:'/'},
 {label:'Réception',icon:ConciergeBell,href:'/reception'},
 {label:'Restaurant',icon:UtensilsCrossed,href:'/restaurant'},
 {label:'Housekeeping',icon:BedDouble,href:'/housekeeping'},
 {label:'Cuisine',icon:ChefHat,href:'/cuisine'},
 {label:'Commercial',icon:BriefcaseBusiness,href:'/commercial'},
 {label:'Salles de réunion',icon:CalendarDays,href:'/salles-reunion'},
 {label:'Tâches',icon:ListTodo,href:'/taches'},
 {label:'Consignes',icon:ClipboardList,href:'/consignes-generales'},
 {label:'Journal',icon:History,href:'/journal-exploitation'},
 {label:'Centre des opérations',icon:BookOpenCheck,href:'/centre-operations'},
 {label:'Tickets',icon:Wrench,href:'/tickets'},
 {label:'Administration',icon:Settings,href:'/administration'},
];

function readSession():Session{try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function todayIso(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function dateLabel(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function mealName(key:string){return key==='breakfast'?'Petit-déjeuner':key==='lunch'?'Déjeuner':key==='packedLunch'?'Panier repas midi':key==='dinner'?'Dîner':'Panier repas soir'}

export function App(){
 const [sidebarOpen,setSidebarOpen]=useState(false);
 const groupsStore=useOperationalStore<Group[]>('group-360',[]);
 const roomsStore=useOperationalStore<Booking[]>('meeting-rooms',[]);
 const sheetsStore=useOperationalStore<Sheet[]>('function-sheets',[]);
 const session=readSession();
 const date=todayIso();
 const userName=`${session.user?.firstName||'Utilisateur'} ${session.user?.lastName||''}`.trim();
 const initials=`${session.user?.firstName?.[0]||'H'}${session.user?.lastName?.[0]||'C'}`.toUpperCase();
 const publishedIds=useMemo(()=>new Set(sheetsStore.data.filter(s=>['Prête à imprimer','Diffusée','Clôturée'].includes(s.status||'')).flatMap(s=>s.lines?.map(l=>l.groupId)||[])),[sheetsStore.data]);
 const groups=useMemo(()=>groupsStore.data.filter(group=>publishedIds.has(group.id)),[groupsStore.data,publishedIds]);
 const todayRooms=useMemo(()=>roomsStore.data.filter(room=>room.date===date).sort((a,b)=>a.start.localeCompare(b.start)),[roomsStore.data,date]);
 const meals=useMemo(()=>{
  const events:MealEvent[]=[];
  groups.forEach(group=>{
   const day=group.mealDays?.find(item=>item.date===date);
   if(!day)return;
   (['breakfast','lunch','packedLunch','dinner','packedDinner'] as const).forEach(key=>{
    const meal=day[key];
    if(meal?.pax)events.push({id:`${group.id}-${key}`,time:meal.time||'À confirmer',label:mealName(key),group:group.name||'Groupe sans nom',pax:meal.pax});
   });
  });
  return events.sort((a,b)=>(a.time==='À confirmer'?'99:99':a.time).localeCompare(b.time==='À confirmer'?'99:99':b.time));
 },[groups,date]);
 const loading=[groupsStore.state,roomsStore.state,sheetsStore.state].some(state=>state==='loading'||state==='saving');
 const refresh=()=>{void groupsStore.refresh();void roomsStore.refresh();void sheetsStore.refresh()};
 return <div className="app-shell executive-shell">
  <aside className={`sidebar${sidebarOpen?' open':''}`}>
   <div className="brand"><div className="brand-mark">H</div><div><strong>HospiCore</strong><span>Hôtel Paradis · Lourdes</span></div><button className="sidebar-close" onClick={()=>setSidebarOpen(false)}><X size={20}/></button></div>
   <nav className="nav-list">{nav.map(({label,icon:Icon,href})=><button key={label} className={`nav-item${href==='/'?' active':''}`} onClick={()=>location.href=href}><Icon size={19}/>{label}</button>)}</nav>
   <div className="demo-version"><Sparkles size={16}/><div><strong>HospiCore V2</strong><span>Exploitation interservices</span></div></div>
  </aside>
  <main className="live-v2-main">
   <header className="live-v2-topbar"><div className="live-v2-title"><button className="live-v2-menu" onClick={()=>setSidebarOpen(true)}><Menu size={22}/></button><div><h1>HospiCore Live</h1><p>{session.user?.hotel?.name||'Hôtel Paradis'} · vue commune des services</p></div></div><div className="live-v2-user"><button className={`live-v2-sync${loading?' loading':''}`} onClick={refresh}><RefreshCw size={15}/>{loading?'Synchronisation…':'Données à jour'}</button><div className="live-v2-avatar" title={userName}>{initials}</div></div></header>
   <div className="live-v2-content operational-home">
    <section className="operational-home-heading"><div><p>Vue du jour</p><h2>{dateLabel(date)}</h2><span>Arrivées, départs, salles et restauration en un seul écran.</span></div><div><strong>{new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</strong><small>{userName}</small></div></section>
    <DailyGroupBoard compact/>
    <section className="operational-home-grid">
     <article className="operational-home-panel"><header><div><p>Meeting Rooms</p><h3><CalendarDays size={20}/>Salles réservées aujourd’hui</h3></div><button onClick={()=>location.href='/salles-reunion'}>Agenda complet</button></header><div className="operational-home-list">{todayRooms.length?todayRooms.map(room=><div className="operational-home-row" key={room.id}><time>{room.start}–{room.end}</time><div><strong>{room.room}</strong><span>{room.title} · {room.attendees} pers.</span></div><b>{room.status==='OPTION'?'Option':room.status==='BLOCKED'?'Bloquée':'Confirmée'}</b></div>):<p className="operational-home-empty">Aucune salle réservée aujourd’hui.</p>}</div></article>
     <article className="operational-home-panel"><header><div><p>Restaurant & Cuisine</p><h3><UtensilsCrossed size={20}/>Repas groupes prévus</h3></div><button onClick={()=>location.href='/restaurant'}>Planning repas</button></header><div className="operational-home-list">{meals.length?meals.map(meal=><div className="operational-home-row" key={meal.id}><time>{meal.time}</time><div><strong>{meal.label}</strong><span>{meal.group}</span></div><b>{meal.pax} pax</b></div>):<p className="operational-home-empty">Aucun repas groupe prévu aujourd’hui.</p>}</div></article>
    </section>
   </div>
  </main>
 </div>;
}
