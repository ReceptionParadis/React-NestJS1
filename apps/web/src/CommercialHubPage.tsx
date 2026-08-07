import { ArrowLeft, BellRing, CalendarDays, CheckCircle2, ChevronRight, ClipboardCheck, FileCheck2, UsersRound } from 'lucide-react';
import { can, currentRole } from './permissions';
import { useOperationalStore } from './useOperationalStore';

type Audit={id:string;action:string;actor:string;role:string;at:string};
type GroupControl={locked?:boolean;printedBy?:string;printedAt?:string;totalPax?:number;taxableAdults?:number;commercialValidation?:'À valider'|'Validé';commercialValidatedBy?:string;commercialValidatedAt?:string};
type Group={id:string;name?:string;agency?:string;status?:string;departure?:string;groupControl?:GroupControl;audit?:Audit[]};

const items=[
 {title:'Fiches Groupe 360°',description:'Créer, compléter et valider les dossiers groupes, les prestations, les repas et les informations financières.',href:'/commercial/groupes',icon:UsersRound},
 {title:'Fiche de fonction hebdomadaire',description:'Importer les groupes validés, relire chaque ligne, valider l’impression et diffuser la fiche aux services.',href:'/commercial/planning-hebdomadaire',icon:CalendarDays},
];
function sessionUser(){try{const s=JSON.parse(localStorage.getItem('hospicore.session')||'{}');const u=s.user||{};return{name:`${u.firstName||'Utilisateur'} ${u.lastName||'HospiCore'}`.trim(),role:String(u.role?.name||u.role||'Commercial')}}catch{return{name:'Utilisateur HospiCore',role:'Commercial'}}}
function stamp(){return new Date().toLocaleString('fr-FR')}

export function CommercialHubPage(){
 const store=useOperationalStore<Group[]>('group-360',[]);const user=sessionUser();const role=currentRole();const canValidate=can('commercial.validate-control',role);
 const pending=store.data.filter(g=>g.status==='Parti'&&g.groupControl?.locked&&g.groupControl?.commercialValidation!=='Validé').sort((a,b)=>String(b.departure).localeCompare(String(a.departure)));
 async function validate(group:Group){if(!canValidate)return;const control={...group.groupControl,commercialValidation:'Validé' as const,commercialValidatedBy:user.name,commercialValidatedAt:stamp()};const audit={id:crypto.randomUUID(),action:'Contrôle Groupe validé par le Commercial · Facture à envoyer depuis VEGA',actor:user.name,role:user.role,at:stamp()};await store.save(store.data.map(g=>g.id===group.id?{...g,groupControl:control,audit:[...(g.audit||[]),audit]}:g))}
 return <main className="commercial-hub">
  <header className="commercial-hub-header"><button onClick={()=>{window.location.href='/'}}><ArrowLeft size={18}/>Tableau de bord</button><p>HospiCore · Espace Commercial</p><h1><ClipboardCheck size={32}/>Pilotage des groupes</h1><span>Préparez les dossiers groupes et validez les contrôles transmis par la Réception.</span></header>
  {pending.length>0&&<section className="commercial-control-notices"><header><div><BellRing size={22}/><div><p>Notification Réception</p><h2>Contrôles Groupe à valider</h2></div></div><b>{pending.length}</b></header><div>{pending.map(group=><article key={group.id}><div><strong>{group.name||'Groupe sans nom'}</strong><span>{group.agency||'Agence non renseignée'} · départ confirmé · {group.groupControl?.totalPax||0} personnes</span><small>Contrôle imprimé le {group.groupControl?.printedAt||'—'} par {group.groupControl?.printedBy||'—'} · {group.groupControl?.taxableAdults||0} taxes de séjour</small></div><div><button onClick={()=>{window.location.href='/commercial/groupes'}}>Voir la fiche</button>{canValidate?<button className="validate" onClick={()=>void validate(group)}><CheckCircle2 size={16}/>Valider pour facturation VEGA</button>:<span title="Votre profil n’est pas habilité à valider ce contrôle">Validation réservée au Commercial / Direction</span>}</div></article>)}</div></section>}
  <section className="commercial-hub-grid">{items.map(({title,description,href,icon:Icon})=><button key={href} onClick={()=>{window.location.href=href}}><span className="commercial-hub-icon"><Icon size={30}/></span><div><h2>{title}</h2><p>{description}</p><strong>Ouvrir le module <ChevronRight size={17}/></strong></div></button>)}</section>
  {pending.length===0&&<section className="commercial-control-empty"><FileCheck2 size={22}/><div><strong>Aucun contrôle en attente</strong><span>Les contrôles apparaissent ici dès que la Réception met un groupe en départ.</span></div></section>}
 </main>
}
