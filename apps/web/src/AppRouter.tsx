import { App } from './App';
import { AuthGate } from './AuthGate';
import { ComplaintsPage } from './ComplaintsPage';
import { DirectionReportsPage } from './DirectionReportsPage';
import { GeneralInstructionsPage } from './GeneralInstructionsPage';
import { ManualArrivalsDeparturesPage } from './ManualArrivalsDeparturesPage';
import { MeetingRoomsPage } from './MeetingRoomsPage';
import { NightWatchRoutePage } from './NightWatchRoutePage';
import { ReceptionArchivesPage } from './ReceptionArchivesPage';
import { ReceptionCashPage } from './ReceptionCashPage';
import { ReceptionControlsPage } from './ReceptionControlsPage';
import { ReceptionHubPage } from './ReceptionHubPage';
import { TasksPage } from './TasksPage';
import { canAccessPath, currentRole } from './permissions';

const retiredPrefixes=[
 '/reception/groupes','/reception/fiche-fonction','/reception/demandes-groupe','/reception/demandes-individuelles','/reception/paniers-repas-pdj',
 '/commercial','/groupes','/planning-operationnel','/planning-hebdomadaire','/tickets','/maintenance','/centre-operations','/journal-exploitation','/activite','/main-courante','/diagnostic','/chambres','/restaurant','/cuisine','/housekeeping','/suivi-interservice'
];
function redirectHome(){window.history.replaceState({},'','/');return <App/>}
function CurrentPage(){
 const path=window.location.pathname,role=currentRole();
 if(retiredPrefixes.some(prefix=>path.startsWith(prefix)))return redirectHome();
 if(!canAccessPath(path,role))return redirectHome();
 if(path.startsWith('/rapports-direction'))return <DirectionReportsPage/>;
 if(path.startsWith('/taches'))return <TasksPage/>;
 if(path.startsWith('/consignes-generales'))return <GeneralInstructionsPage/>;
 if(path==='/reception'||path==='/reception/')return <ReceptionHubPage/>;
 if(path.startsWith('/reception/arrivees-departs'))return <ManualArrivalsDeparturesPage/>;
 if(path.startsWith('/reception/archives'))return <ReceptionArchivesPage/>;
 if(path.startsWith('/reception/plaintes'))return <ComplaintsPage/>;
 if(path.startsWith('/reception/feuille-route-veilleur'))return <NightWatchRoutePage/>;
 if(path.startsWith('/reception/caisse'))return <ReceptionCashPage/>;
 if(path.startsWith('/reception/controles'))return <ReceptionControlsPage/>;
 if(path.startsWith('/salles-reunion'))return <MeetingRoomsPage/>;
 return <App/>;
}
export function AppRouter(){return <AuthGate><CurrentPage/></AuthGate>}
