import { Archive, Calculator, CalendarDays, ClipboardCheck, ClipboardList, FileText, ListTodo, MessageSquareWarning, MoonStar, PackageCheck } from 'lucide-react';
import { canAccessPath, currentRole } from './permissions';

const coreModules=[
 {title:'Tâches',description:'Créer, attribuer et suivre les tâches opérationnelles.',href:'/taches',icon:ListTodo},
 {title:'Consignes',description:'Centraliser les consignes actives de l’hôtel.',href:'/consignes-generales',icon:ClipboardList},
 {title:'Arrivées / Départs',description:'Renseigner manuellement les mouvements et transmettre ceux de nuit au veilleur.',href:'/reception/arrivees-departs',icon:CalendarDays},
 {title:'Paniers repas & PDJ Box',description:'Créer, suivre et imprimer les commandes de paniers repas et petits-déjeuners box.',href:'/reception/paniers-repas-pdj',icon:PackageCheck},
 {title:'Caisse',description:'Saisir, rapprocher, imprimer et verrouiller la caisse.',href:'/reception/caisse',icon:Calculator},
 {title:'Contrôle Groupe',description:'Matrice manuelle unique pour les contrôles groupes et leurs effectifs repas.',href:'/reception/controles',icon:ClipboardCheck},
 {title:'Plaintes',description:'Enregistrer, traiter et archiver les plaintes clients.',href:'/reception/plaintes',icon:MessageSquareWarning},
 {title:'Archives',description:'Retrouver les contrôles, caisses et feuilles de nuit validés.',href:'/reception/archives',icon:Archive},
 {title:'Rapport Direction',description:'Consulter les rapports opérationnels journaliers consolidés.',href:'/rapports-direction',icon:FileText},
 {title:'Salles de réunion',description:'Gérer les réservations et occupations des salles.',href:'/salles-reunion',icon:CalendarDays},
 {title:'Feuille de route veilleur',description:'Consulter les mouvements et repas utiles de nuit.',href:'/reception/feuille-route-veilleur',icon:MoonStar},
];

function sessionName(){try{const u=JSON.parse(localStorage.getItem('hospicore.session')||'{}')?.user||{};return `${u.firstName||'Utilisateur'} ${u.lastName||''}`.trim()}catch{return'Utilisateur'}}

export function App(){
 const role=currentRole(),modules=coreModules.filter(item=>canAccessPath(item.href,role));
 return <main className="core-dashboard"><header className="core-dashboard-header"><div><p>HÔTEL PARADIS · LOURDES</p><h1>HospiCore</h1><span>Base opérationnelle simplifiée · {sessionName()}</span></div></header><section className="core-dashboard-intro"><strong>Outils opérationnels</strong><span>Une seule version, une navigation courte et uniquement les données nécessaires à l’exploitation quotidienne.</span></section><section className="core-dashboard-grid">{modules.map(({title,description,href,icon:Icon})=><button key={href} onClick={()=>location.href=href}><span className="core-module-icon"><Icon size={26}/></span><div><h2>{title}</h2><p>{description}</p><strong>Ouvrir</strong></div></button>)}</section>{modules.length===0&&<section className="core-dashboard-empty"><h2>Aucun module disponible</h2><p>Les droits de ce compte doivent être mis à jour dans l’administration HospiCore.</p></section>}</main>;
}
