import { ArrowLeft, BellRing, Calculator, ClipboardCheck, FileArchive, FileText, MoonStar, PackageCheck, UsersRound } from 'lucide-react';
import { canAccessPath, currentRole } from './permissions';
import { useOperationalStore } from './useOperationalStore';

type GroupControl={validatedAt?:string;printedAt?:string;actualMeals?:unknown[]};
type Group={id:string;arrival?:string;departure?:string;status?:string;groupControl?:GroupControl};
type IndividualRequest={id:string;status?:string};
type NightRoute={date:string;validatedAt?:string};
type CashDay={date?:string;lockedAt?:string};
type MealOrder={id:string;date:string;status:string};
type GroupWakeup={id:string;groupId:string;date:string;time:string;completedAt?:string};
function todayIso(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function addDay(value:string,n:number){const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+n);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

export function ReceptionHubPage(){
 const groups=useOperationalStore<Group[]>('group-360',[]),requests=useOperationalStore<IndividualRequest[]>('individual-requests',[]),nightRoutes=useOperationalStore<NightRoute[]>('night-route-notes',[]),cash=useOperationalStore<CashDay[]|CashDay>('reception-cash-day',[]),mealOrders=useOperationalStore<MealOrder[]>('meal-orders',[]),groupWakeups=useOperationalStore<GroupWakeup[]>('group-wakeups',[]);
 const today=todayIso(),tomorrow=addDay(today,1),visibleGroups=groups.data.filter(g=>String(g.arrival)<=tomorrow&&String(g.departure)>=today),activeGroups=groups.data.filter(g=>g.status!=='Parti'),controls=activeGroups.filter(g=>!g.groupControl?.validatedAt);
 const archivedControls=groups.data.filter(g=>Boolean(g.groupControl?.validatedAt||g.groupControl?.printedAt)).length,archivedNights=nightRoutes.data.filter(n=>Boolean(n.validatedAt)).length,activeRequests=requests.data.filter(r=>r.status!=='Terminée').length,cashRecords=Array.isArray(cash.data)?cash.data:[cash.data],todayCash=cashRecords.find(r=>r?.date===today),todayMeals=mealOrders.data.filter(o=>o.date===today&&o.status!=='Remis').length,activeGroupWakeups=groupWakeups.data.filter(w=>!w.completedAt&&w.date>=today).length;
 const role=currentRole();
 const cards=[
  {title:'Fiches Groupe 360°',description:'Consulter les informations commerciales et générales des groupes.',href:'/reception/groupes',icon:UsersRound,count:visibleGroups.length,label:'groupe(s) visible(s)'},
  {title:'Contrôle Groupe',description:'Saisir manuellement chambres, effectifs, guide et horaires de repas. Les repas renseignés alimentent directement la feuille de route du veilleur.',href:'/reception/controles',icon:ClipboardCheck,count:controls.length,label:'contrôle(s) à compléter'},
  {title:'Demandes groupe',description:'Créer et suivre les réveils et demandes des groupes.',href:'/reception/demandes-groupe',icon:BellRing,count:activeGroupWakeups,label:'réveil(s) groupe à venir'},
  {title:'Demandes clients individuels',description:'Enregistrer taxis, réveils et autres demandes clients avec chambre, horaire et consignes.',href:'/reception/demandes-individuelles',icon:BellRing,count:activeRequests,label:'demande(s) active(s)'},
  {title:'Paniers repas & PDJ Box',description:'Créer les bons de commande PDJ Box, paniers déjeuner et dîner.',href:'/reception/paniers-repas-pdj',icon:PackageCheck,count:todayMeals,label:'bon(s) à traiter aujourd’hui'},
  {title:'Caisse',description:'Saisir la caisse du jour, rapprocher VEGA puis imprimer et verrouiller.',href:'/reception/caisse',icon:Calculator,count:todayCash?1:0,label:todayCash?.lockedAt?'caisse verrouillée':'caisse du jour'},
  {title:'Feuille de route veilleur',description:'Consolider la nuit de 22h00 à 08h30. Les horaires et effectifs repas proviennent du Contrôle Groupe.',href:'/reception/feuille-route-veilleur',icon:MoonStar,count:nightRoutes.data.filter(n=>n.date===today).length,label:'feuille de nuit'},
  {title:'Archives',description:'Retrouver les contrôles Groupe, caisses et feuilles de nuit validés.',href:'/reception/archives',icon:FileArchive,count:archivedControls+archivedNights,label:'document(s) archivé(s)'},
 ].filter(card=>canAccessPath(card.href,role));
 return <main className="reception-hub-page"><header className="reception-hub-header"><button onClick={()=>location.href='/'}><ArrowLeft size={18}/>Centre de Commandement</button><p>HospiCore · Réception</p><h1><FileText size={31}/>Espace Réception</h1><span>Interface épurée autour des informations réellement utilisées par la Réception.</span></header><section className="reception-hub-grid">{cards.map(({title,description,href,icon:Icon,count,label})=><button key={href} onClick={()=>location.href=href}><div className="reception-hub-icon"><Icon size={28}/></div><div className="reception-hub-card-content"><div><h2>{title}</h2><p>{description}</p></div><footer><strong>Ouvrir</strong><span><b>{count}</b> {label}</span></footer></div></button>)}</section></main>
}
