import { useMemo, useState } from 'react';
import {
  AlertTriangle, Bell, BookOpenCheck, BriefcaseBusiness, CalendarDays, CheckCircle2,
  ChevronRight, ClipboardCheck, ClipboardList, ConciergeBell, History, LayoutDashboard,
  ListTodo, Menu, RefreshCw, Settings, Sparkles, Stethoscope, Wrench, X,
} from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type Session={user?:{firstName?:string;lastName?:string;role?:string|{name?:string};hotel?:{name?:string}}};
type Audit={id:string;action:string;actor:string;role:string;at:string};
type DepartureChecklist={paymentChoice?:'paid'|'debtor';paymentMethod?:string;debtorName?:string;paymentDoneAt?:string;keysReturned?:boolean;keysReturnedAt?:string};
type GroupControl={validatedAt?:string;locked?:boolean;commercialValidation?:'À valider'|'Validé';commercialValidatedAt?:string};
type Group={id:string;name?:string;pax?:number;rooms?:number;arrival?:string;departure?:string;arrivalTime?:string;departureTime?:string;status?:string;agency?:string;directAgency?:string;groupControl?:GroupControl;departureChecklist?:DepartureChecklist;audit?:Audit[]};
type Booking={id:string;title:string;room:string;date:string;start:string;end:string;attendees:number;status?:string};
type Sheet={status?:string;lines?:Array<{groupId:string}>};
type NavItem={label:string;icon:typeof LayoutDashboard;href:string};
type ActionItem={id:string;label:string;detail:string;href:string;level:'urgent'|'warning'|'info'|'done'};

const nav:NavItem[]=[
 {label:'Commercial',icon:BriefcaseBusiness,href:'/commercial'},
 {label:'Salles de réunion',icon:CalendarDays,href:'/salles-reunion'},
 {label:'Tâches',icon:ListTodo,href:'/taches'},
 {label:'Consignes',icon:ClipboardList,href:'/consignes-generales'},
 {label:'Journal',icon:History,href:'/journal-exploitation'},
 {label:'Centre des opérations',icon:BookOpenCheck,href:'/centre-operations'},
 {label:'Maintenance',icon:Wrench,href:'/tickets'},
 {label:'Diagnostic',icon:Stethoscope,href:'/diagnostic'},
 {label:'Administration',icon:Settings,href:'/administration'},
];

function readSession():Session{try{return JSON.parse(localStorage.getItem('hospicore.session')||'{}')}catch{return{}}}
function isoDate(date:Date){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function addDays(value:string,days:number){const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+days);return isoDate(d)}
function dateLabel(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
function shortDate(value:string){return new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit'})}
function checklist(group:Group){
 const payment=group.departureChecklist?.paymentChoice==='paid'?Boolean(group.departureChecklist.paymentMethod):group.departureChecklist?.paymentChoice==='debtor'?Boolean(group.departureChecklist.debtorName):false;
 const keys=Boolean(group.departureChecklist?.keysReturned);
 const control=Boolean(group.groupControl?.validatedAt);
 return{payment,keys,control,complete:payment&&keys&&control};
}
function roleName(session:Session){return String(typeof session.user?.role==='object'?session.user?.role?.name:session.user?.role||'Utilisateur')}

export function App(){
 const[sidebarOpen,setSidebarOpen]=useState(false);
 const groupsStore=useOperationalStore<Group[]>('group-360',[]);
 const roomsStore=useOperationalStore<Booking[]>('meeting-rooms',[]);
 const sheetsStore=useOperationalStore<Sheet[]>('function-sheets',[]);
 const session=readSession(),today=isoDate(new Date());
 const userName=`${session.user?.firstName||'Utilisateur'} ${session.user?.lastName||''}`.trim();
 const initials=`${session.user?.firstName?.[0]||'H'}${session.user?.lastName?.[0]||'C'}`.toUpperCase();
 const publishedIds=useMemo(()=>new Set(sheetsStore.data.filter(s=>['Prête à imprimer','Diffusée','Clôturée'].includes(s.status||'')).flatMap(s=>s.lines?.map(l=>l.groupId)||[])),[sheetsStore.data]);
 const groups=useMemo(()=>groupsStore.data.filter(g=>publishedIds.size===0||publishedIds.has(g.id)),[groupsStore.data,publishedIds]);
 const arrivals=useMemo(()=>groups.filter(g=>g.arrival===today).sort((a,b)=>(a.arrivalTime||'99:99').localeCompare(b.arrivalTime||'99:99')),[groups,today]);
 const departures=useMemo(()=>groups.filter(g=>g.departure===today).sort((a,b)=>(a.departureTime||'99:99').localeCompare(b.departureTime||'99:99')),[groups,today]);
 const present=useMemo(()=>groups.filter(g=>String(g.arrival)<=today&&String(g.departure)>=today&&g.status!=='Parti'),[groups,today]);
 const todayRooms=useMemo(()=>roomsStore.data.filter(r=>r.date===today).sort((a,b)=>a.start.localeCompare(b.start)),[roomsStore.data,today]);
 const controlsToDo=groups.filter(g=>['Arrivé','En séjour'].includes(g.status||'')&&!g.groupControl?.validatedAt);
 const controlsCommercial=groups.filter(g=>g.groupControl?.commercialValidation==='À valider');
 const controlsVega=groups.filter(g=>g.groupControl?.commercialValidation==='Validé');
 const blockedDepartures=departures.filter(g=>g.status!=='Parti'&&!checklist(g).complete);
 const audit=useMemo(()=>groups.flatMap(g=>(g.audit||[]).map(a=>({...a,group:g.name||'Groupe'}))).sort((a,b)=>b.at.localeCompare(a.at,'fr')).slice(0,20),[groups]);
 const actions=useMemo<ActionItem[]>(()=>[
  ...blockedDepartures.map(g=>({id:`dep-${g.id}`,label:`Départ bloqué · ${g.name||'Groupe'}`,detail:'Solde, clés ou contrôle à compléter',href:'/reception',level:'urgent' as const})),
  ...controlsToDo.map(g=>({id:`ctl-${g.id}`,label:`Contrôle Groupe · ${g.name||'Groupe'}`,detail:'À réaliser par la Réception',href:'/reception',level:'warning' as const})),
  ...controlsCommercial.map(g=>({id:`com-${g.id}`,label:`Validation commerciale · ${g.name||'Groupe'}`,detail:'Contrôle prêt à valider',href:'/commercial',level:'warning' as const})),
  ...todayRooms.map(r=>({id:`room-${r.id}`,label:`${r.room} · ${r.title}`,detail:`${r.start}–${r.end} · ${r.attendees} pers.`,href:'/salles-reunion',level:'info' as const})),
 ].slice(0,12),[blockedDepartures,controlsToDo,controlsCommercial,todayRooms]);
 const forecast=[0,1,2].map(offset=>{const date=addDays(today,offset);const a=groups.filter(g=>g.arrival===date).length;const d=groups.filter(g=>g.departure===date).length;const p=groups.filter(g=>String(g.arrival)<=date&&String(g.departure)>=date&&g.status!=='Parti').length;const c=groups.filter(g=>g.arrival===date).length;const m=roomsStore.data.filter(r=>r.date===date).length;const score=a*3+d*2+m*2;return{date,a,d,p,c,m,level:score>=18?'Critique':score>=10?'Élevée':score>=5?'Modérée':'Faible'}});
 const stores=[groupsStore,roomsStore,sheetsStore],loading=stores.some(s=>s.state==='loading'||s.state==='saving'),syncError=stores.find(s=>s.state==='error'||s.state==='conflict');
 const syncLabel=loading?'Synchronisation…':syncError?'Synchronisation en erreur':'PostgreSQL à jour';
 const refresh=()=>{void groupsStore.refresh();void roomsStore.refresh();void sheetsStore.refresh()};
 return <div className="app-shell executive-shell command-shell">
  <aside className={`sidebar${sidebarOpen?' open':''}`}>
   <div className="brand"><div className="brand-mark">H</div><div><strong>HospiCore</strong><span>Hôtel Paradis · Lourdes</span></div><button className="sidebar-close" onClick={()=>setSidebarOpen(false)}><X size={20}/></button></div>
   <nav className="nav-list" aria-label="Navigation principale">
    <button data-nav="/" className="nav-item active" onClick={()=>location.assign('/')}><LayoutDashboard size={19}/><span>Centre de Commandement</span></button>
    <span aria-hidden="true" style={{display:'none'}} data-nav-spacer="true"/>
    <button data-nav="/reception" className="nav-item reception-nav-item" onClick={()=>location.assign('/reception')}><ConciergeBell size={19}/><span>Réception</span></button>
    <button data-nav="/planning-operationnel" className="nav-item" onClick={()=>location.assign('/planning-operationnel')}><CalendarDays size={19}/><span>Planning opérationnel</span></button>
    {nav.map(({label,icon:Icon,href})=><button key={href} data-nav={href} className="nav-item" onClick={()=>location.assign(href)}><Icon size={19}/><span>{label}</span></button>)}
   </nav>
   <div className="demo-version"><Sparkles size={16}/><div><strong>HospiCore V3</strong><span>Réception · Commercial · Direction · Maintenance</span></div></div>
  </aside>
  <main className="live-v2-main command-main">
   <header className="live-v2-topbar command-topbar"><div className="live-v2-title"><button className="live-v2-menu" onClick={()=>setSidebarOpen(true)}><Menu size={22}/></button><div><h1>Centre de Commandement</h1><p>{session.user?.hotel?.name||'Hôtel Paradis'} · {dateLabel(today)}</p></div></div><div className="live-v2-user"><button className={`live-v2-sync${loading?' loading':''}${syncError?' error':''}`} onClick={refresh}><RefreshCw size={15}/>{syncLabel}</button><div className="command-clock"><strong>{new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</strong><span>{roleName(session)}</span></div><div className="live-v2-avatar" title={userName}>{initials}</div></div></header>
   <div className="command-content">
    <section className="command-alerts">
     <button className={blockedDepartures.length?'critical':'ok'} onClick={()=>location.href='/reception'}><AlertTriangle size={18}/><strong>{blockedDepartures.length}</strong><span>départ(s) bloqué(s)</span></button>
     <button className={controlsToDo.length?'warning':'ok'} onClick={()=>location.href='/reception'}><ClipboardCheck size={18}/><strong>{controlsToDo.length}</strong><span>contrôle(s) à réaliser</span></button>
     <button className={controlsCommercial.length?'warning':'ok'} onClick={()=>location.href='/commercial'}><BriefcaseBusiness size={18}/><strong>{controlsCommercial.length}</strong><span>validation(s) commerciale(s)</span></button>
     <button className={syncError?'critical':'ok'} onClick={()=>location.href='/diagnostic'}><RefreshCw size={18}/><strong>{syncError?'!':'✓'}</strong><span>{syncError?'synchronisation en erreur':'PostgreSQL synchronisé'}</span></button>
    </section>

    <section className="command-kpis">
     <article><span>Groupes présents</span><strong>{present.length}</strong><small>{present.reduce((n,g)=>n+Number(g.pax||0),0)} personnes</small></article>
     <article><span>Arrivées</span><strong>{arrivals.length}</strong><small>{arrivals.reduce((n,g)=>n+Number(g.pax||0),0)} personnes</small></article>
     <article><span>Départs</span><strong>{departures.length}</strong><small>{departures.filter(g=>g.status==='Parti').length} terminés</small></article>
     <article><span>Contrôles</span><strong>{groups.filter(g=>g.groupControl?.validatedAt).length}</strong><small>{controlsToDo.length} à réaliser</small></article>
     <article><span>Salles aujourd’hui</span><strong>{todayRooms.length}</strong><small>{todayRooms.reduce((n,r)=>n+Number(r.attendees||0),0)} participants</small></article>
    </section>

    <section className="command-grid primary">
     <article className="command-panel command-actions"><header><div><p>Boîte de réception opérationnelle</p><h2><Bell size={20}/>Actions prioritaires</h2></div><b>{actions.length}</b></header><div>{actions.length?actions.map(item=><button key={item.id} className={item.level} onClick={()=>location.href=item.href}><span className="command-action-dot"/><div><strong>{item.label}</strong><small>{item.detail}</small></div><ChevronRight size={18}/></button>):<p className="command-empty"><CheckCircle2 size={20}/>Aucune action prioritaire.</p>}</div></article>
     <article className="command-panel command-flow"><header><div><p>Réception</p><h2>Arrivées & départs</h2></div><button onClick={()=>location.href='/reception'}>Ouvrir</button></header><div className="command-flow-columns"><section><h3>Arrivées <b>{arrivals.length}</b></h3>{arrivals.map(g=><button key={g.id} onClick={()=>location.href='/reception'}><time>{g.arrivalTime||'—'}</time><div><strong>{g.name}</strong><span>{g.pax||0} pax · {g.status||'Préparation'}</span></div></button>)}{!arrivals.length&&<p>Aucune arrivée.</p>}</section><section><h3>Départs <b>{departures.length}</b></h3>{departures.map(g=>{const c=checklist(g);return <button key={g.id} className={c.complete?'ready':'blocked'} onClick={()=>location.href='/reception'}><time>{g.departureTime||'—'}</time><div><strong>{g.name}</strong><span>{c.complete?'Prêt au départ':'Étapes manquantes'}</span></div></button>})}{!departures.length&&<p>Aucun départ.</p>}</section></div></article>
    </section>

    <section className="command-grid secondary">
     <article className="command-panel command-controls"><header><div><p>Contrôles Groupe</p><h2>Suivi de facturation</h2></div><button onClick={()=>location.href='/commercial'}>Commercial</button></header><div><button onClick={()=>location.href='/reception'}><span>À réaliser</span><strong>{controlsToDo.length}</strong></button><button onClick={()=>location.href='/commercial'}><span>En validation</span><strong>{controlsCommercial.length}</strong></button><button onClick={()=>location.href='/commercial'}><span>Prêts pour VEGA</span><strong>{controlsVega.length}</strong></button></div></article>
     <article className="command-panel command-meetings"><header><div><p>Planning du jour</p><h2>Salles de réunion</h2></div><button onClick={()=>location.href='/salles-reunion'}>Agenda</button></header><div>{todayRooms.map(r=><button key={r.id} onClick={()=>location.href='/salles-reunion'}><time>{r.start}</time><div><strong>{r.room}</strong><span>{r.title} · {r.attendees} pers.</span></div></button>)}{!todayRooms.length&&<p className="command-empty">Aucune salle réservée.</p>}</div></article>
     <article className="command-panel command-maintenance"><header><div><p>Maintenance</p><h2>Interventions</h2></div><button onClick={()=>location.href='/tickets'}>Ouvrir</button></header><div className="maintenance-placeholder"><Wrench size={30}/><strong>Centre maintenance</strong><span>Consulter les urgences, interventions en cours et travaux terminés.</span><button onClick={()=>location.href='/tickets'}>Accéder au Kanban</button></div></article>
    </section>

    <section className="command-grid lower">
     <article className="command-panel command-journal"><header><div><p>Traçabilité</p><h2>Journal Live</h2></div><button onClick={()=>location.href='/journal-exploitation'}>Journal complet</button></header><div>{audit.length?audit.map(item=><div key={`${item.id}-${item.group}`}><time>{item.at}</time><div><strong>{item.actor} · {item.group}</strong><span>{item.action}</span></div></div>):<p className="command-empty">Aucune action récente.</p>}</div></article>
     <article className="command-panel command-forecast"><header><div><p>Anticipation</p><h2>Prévision à 3 jours</h2></div><button onClick={()=>location.href='/planning-operationnel'}>Planning</button></header><table><thead><tr><th>Jour</th><th>Arr.</th><th>Dép.</th><th>Présents</th><th>Contrôles</th><th>Salles</th><th>Charge</th></tr></thead><tbody>{forecast.map(f=><tr key={f.date} onClick={()=>location.href=`/planning-operationnel?date=${f.date}`}><td>{shortDate(f.date)}</td><td>{f.a}</td><td>{f.d}</td><td>{f.p}</td><td>{f.c}</td><td>{f.m}</td><td><span className={`forecast-level ${f.level.toLowerCase().replace('é','e')}`}>{f.level}</span></td></tr>)}</tbody></table></article>
    </section>
   </div>
  </main>
 </div>;
}
