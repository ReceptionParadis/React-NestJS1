import { Archive, Calculator, CalendarDays, ClipboardCheck, ClipboardList, FileText, ListTodo, LogOut, MessageSquareWarning, MoonStar, PackageCheck, Settings, Sparkles } from 'lucide-react';
import { canAccessPath, currentRole } from './permissions';

type ModuleGroup='Exploitation'|'Suivi & transmission'|'Pilotage';
type Module={title:string;description:string;href:string;icon:typeof ListTodo;group:ModuleGroup;feedsNight?:boolean;featured?:boolean};
const coreModules:Module[]=[
 {title:'Arrivées / Départs',description:'Mouvements, horaires, pax, transports et consignes.',href:'/reception/arrivees-departs',icon:CalendarDays,group:'Exploitation',feedsNight:true,featured:true},
 {title:'Contrôle Groupe',description:'Matrice manuelle des groupes, effectifs et repas.',href:'/reception/controles',icon:ClipboardCheck,group:'Exploitation',feedsNight:true,featured:true},
 {title:'Paniers repas & PDJ Box',description:'Commandes, horaires de remise et régimes alimentaires.',href:'/reception/paniers-repas-pdj',icon:PackageCheck,group:'Exploitation',feedsNight:true},
 {title:'Caisse',description:'Saisie, rapprochement et clôture de la caisse.',href:'/reception/caisse',icon:Calculator,group:'Exploitation',feedsNight:true},
 {title:'Salles de réunion',description:'Réservations, horaires, capacités et consignes de mise en place.',href:'/salles-reunion',icon:CalendarDays,group:'Exploitation',feedsNight:true},
 {title:'Tâches',description:'Actions assignées, priorités, échéances et suivi.',href:'/taches',icon:ListTodo,group:'Suivi & transmission',feedsNight:true},
 {title:'Consignes',description:'Informations interservices et transmissions prioritaires.',href:'/consignes-generales',icon:ClipboardList,group:'Suivi & transmission',feedsNight:true},
 {title:'Plaintes',description:'Plaintes ouvertes, traitement et suivi client.',href:'/reception/plaintes',icon:MessageSquareWarning,group:'Suivi & transmission',feedsNight:true},
 {title:'Archives',description:'Contrôles, caisses et feuilles de nuit déjà validés.',href:'/reception/archives',icon:Archive,group:'Suivi & transmission',feedsNight:true},
 {title:'Feuille de route veilleur',description:'Synthèse automatique de toutes les données utiles au service de nuit.',href:'/reception/feuille-route-veilleur',icon:MoonStar,group:'Suivi & transmission',featured:true},
 {title:'Rapport Direction',description:'Synthèse journalière consolidée pour la Direction.',href:'/rapports-direction',icon:FileText,group:'Pilotage',feedsNight:true},
 {title:'Administration',description:'Utilisateurs, profils, droits et référentiels HospiCore.',href:'/administration',icon:Settings,group:'Pilotage',feedsNight:true},
];
function sessionName(){try{const u=JSON.parse(localStorage.getItem('hospicore.session')||'{}')?.user||{};return`${u.firstName||'Utilisateur'} ${u.lastName||''}`.trim()}catch{return'Utilisateur'}}
function logout(){localStorage.removeItem('hospicore.session');localStorage.removeItem('hospicore.token');location.assign('/')}
export function App(){
 const role=currentRole(),modules=coreModules.filter(item=>canAccessPath(item.href,role)),groups=(['Exploitation','Suivi & transmission','Pilotage'] as ModuleGroup[]).map(group=>({group,items:modules.filter(m=>m.group===group)})).filter(g=>g.items.length);
 return <main className="core-dashboard"><header className="core-dashboard-header"><div><p>HÔTEL PARADIS · LOURDES</p><h1>HospiCore</h1><span>Base opérationnelle unifiée · {sessionName()}</span></div><div className="core-header-actions"><span className="core-night-status"><MoonStar size={16}/>Tous les modules utiles alimentent la fiche veilleur</span><button className="core-logout" onClick={logout}><LogOut size={18}/>Déconnexion</button></div></header><section className="core-dashboard-intro"><div><span className="core-eyebrow"><Sparkles size={15}/>Centre opérationnel</span><strong>Une interface courte, lisible et orientée action.</strong><span>Les informations saisies dans les modules sont consolidées automatiquement dans la feuille de route du veilleur lorsqu’elles concernent la nuit.</span></div></section>{groups.map(({group,items})=><section className="core-module-section" key={group}><header><h2>{group}</h2><span>{items.length} module{items.length>1?'s':''}</span></header><div className="core-dashboard-grid">{items.map(({title,description,href,icon:Icon,feedsNight,featured})=><button className={featured?'featured':''} key={href} onClick={()=>location.href=href}><span className="core-module-icon"><Icon size={25}/></span><div className="core-card-copy"><div className="core-card-title"><h3>{title}</h3>{feedsNight&&<span className="core-night-badge"><MoonStar size={12}/>Veilleur</span>}</div><p>{description}</p><strong>Ouvrir le module</strong></div></button>)}</div></section>)}{modules.length===0&&<section className="core-dashboard-empty"><h2>Aucun module disponible</h2><p>Les droits de ce compte doivent être mis à jour dans l’administration HospiCore.</p></section>}</main>;
}
