import { ArrowLeft, CalendarDays, ClipboardCheck, FileArchive, FileText, UsersRound } from 'lucide-react';
import { useOperationalStore } from './useOperationalStore';

type GroupControl={validatedAt?:string;locked?:boolean;printedAt?:string};
type Group={id:string;arrival?:string;departure?:string;status?:string;groupControl?:GroupControl};
type WeeklySheet={id:string;status?:string};

function todayIso(){const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function addDay(value:string,n:number){const d=new Date(`${value}T12:00:00`);d.setDate(d.getDate()+n);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}

export function ReceptionHubPage(){
 const groups=useOperationalStore<Group[]>('group-360',[]);
 const sheets=useOperationalStore<WeeklySheet[]>('function-sheets',[]);
 const today=todayIso(),tomorrow=addDay(today,1);
 const visibleGroups=groups.data.filter(g=>String(g.arrival)<=tomorrow&&String(g.departure)>=today);
 const controls=visibleGroups.filter(g=>['Arrivé','En séjour'].includes(g.status||'')&&!g.groupControl?.validatedAt);
 const archivedControls=groups.data.filter(g=>g.groupControl?.locked&&g.groupControl?.printedAt).length;
 const archivedSheets=sheets.data.filter(s=>['Prête à imprimer','Diffusée','Clôturée'].includes(s.status||'')).length;
 const cards=[
  {title:'Fiches Groupe 360°',description:'Consulter en lecture seule les dossiers groupes visibles par la Réception, de J-1 au départ.',href:'/reception/groupes',icon:UsersRound,count:visibleGroups.length,label:'groupe(s) visible(s)'},
  {title:'Fiche de fonction hebdomadaire',description:'Consulter la fiche de fonction partagée de la semaine et les informations opérationnelles validées.',href:'/reception/fiche-fonction',icon:CalendarDays,count:sheets.data.length,label:'fiche(s) enregistrée(s)'},
  {title:'Contrôles Groupe à compléter',description:'Accéder directement aux groupes arrivés ou en séjour dont le contrôle réel doit encore être réalisé.',href:'/reception/controles',icon:ClipboardCheck,count:controls.length,label:'contrôle(s) à réaliser'},
  {title:'Archives',description:'Retrouver les contrôles Groupe et fiches de fonction validés ou imprimés, classés automatiquement par mois.',href:'/reception/archives',icon:FileArchive,count:archivedControls+archivedSheets,label:'document(s) archivé(s)'},
 ];
 return <main className="reception-hub-page"><header className="reception-hub-header"><button onClick={()=>location.href='/'}><ArrowLeft size={18}/>Centre de Commandement</button><p>HospiCore · Réception</p><h1><FileText size={31}/>Espace Réception</h1><span>Accès centralisé aux dossiers groupes, contrôles, fiches de fonction et archives.</span></header><section className="reception-hub-grid">{cards.map(({title,description,href,icon:Icon,count,label})=><button key={href} onClick={()=>location.href=href}><div className="reception-hub-icon"><Icon size={28}/></div><div className="reception-hub-card-content"><div><h2>{title}</h2><p>{description}</p></div><footer><strong>Ouvrir</strong><span><b>{count}</b> {label}</span></footer></div></button>)}</section></main>;
}
