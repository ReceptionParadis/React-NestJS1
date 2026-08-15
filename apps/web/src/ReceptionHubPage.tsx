import { ArrowLeft, Calculator, CalendarDays, ClipboardCheck, FileArchive, FileText, MessageSquareWarning, MoonStar } from 'lucide-react';
import { canAccessPath, currentRole } from './permissions';

export function ReceptionHubPage(){
 const role=currentRole();
 const cards=[
  {title:'Arrivées / Départs',description:'Saisir manuellement les mouvements, horaires, pax, guide, transport et consignes.',href:'/reception/arrivees-departs',icon:CalendarDays},
  {title:'Contrôle Groupe',description:'Matrice manuelle unique : groupe, séjour, guide, chambres, effectifs et repas.',href:'/reception/controles',icon:ClipboardCheck},
  {title:'Caisse',description:'Saisie, rapprochement, impression et verrouillage de la caisse.',href:'/reception/caisse',icon:Calculator},
  {title:'Plaintes',description:'Enregistrement et suivi des plaintes clients.',href:'/reception/plaintes',icon:MessageSquareWarning},
  {title:'Archives',description:'Contrôles groupes validés, caisses verrouillées et feuilles de nuit.',href:'/reception/archives',icon:FileArchive},
  {title:'Feuille de route veilleur',description:'Mouvements de nuit et repas issus des saisies manuelles HospiCore.',href:'/reception/feuille-route-veilleur',icon:MoonStar},
 ].filter(card=>canAccessPath(card.href,role));
 return <main className="reception-hub-page"><header className="reception-hub-header"><button onClick={()=>location.href='/'}><ArrowLeft size={18}/>Accueil HospiCore</button><p>HospiCore · Réception</p><h1><FileText size={31}/>Réception</h1><span>Un espace volontairement réduit aux outils réellement utilisés.</span></header><section className="reception-hub-grid">{cards.map(({title,description,href,icon:Icon})=><button key={href} onClick={()=>location.href=href}><div className="reception-hub-icon"><Icon size={28}/></div><div className="reception-hub-card-content"><div><h2>{title}</h2><p>{description}</p></div><footer><strong>Ouvrir</strong></footer></div></button>)}</section></main>;
}
