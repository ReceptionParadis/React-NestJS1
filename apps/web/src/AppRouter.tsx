import { ActivityJournalPage } from './ActivityJournalPage';
import { AdministrationPage } from './AdministrationPage';
import { App } from './App';
import { AuthGate } from './AuthGate';
import { CommercialHubPage } from './CommercialHubPage';
import { ComplaintsPage } from './ComplaintsPage';
import { DiagnosticPage } from './DiagnosticPage';
import { DirectionReportsPage } from './DirectionReportsPage';
import { GeneralInstructionsPage } from './GeneralInstructionsPage';
import { GroupArrivalPersistenceBridge } from './GroupArrivalPersistenceBridge';
import { GroupBucketsBridge } from './GroupBucketsBridge';
import { GroupContractsPage } from './GroupContractsPage';
import { GroupPaymentDepartureSync } from './GroupPaymentDepartureSync';
import { GroupRequestsPage } from './GroupRequestsPage';
import { GroupsPage } from './GroupsPage';
import { IndividualRequestsPage } from './IndividualRequestsPage';
import { MealOrdersPage } from './MealOrdersPage';
import { MeetingRoomsPage } from './MeetingRoomsPage';
import { NightWatchRoutePage } from './NightWatchRoutePage';
import { OperationalPlanningPage } from './OperationalPlanningPage';
import { OperationsCenterV2Page } from './OperationsCenterV2Page';
import { ReceptionArchivesPage } from './ReceptionArchivesPage';
import { ReceptionCashPage } from './ReceptionCashPage';
import { ReceptionControlsPage } from './ReceptionControlsPage';
import { ReceptionExpiredItemsFilter } from './ReceptionExpiredItemsFilter';
import { ReceptionGroupsPage } from './ReceptionGroupsPage';
import { ReceptionHubPage } from './ReceptionHubPage';
import { ReceptionOperationsPage } from './ReceptionOperationsPage';
import { RoomingListImportPage } from './RoomingListImportPage';
import { TasksPage } from './TasksPage';
import { TicketsPage } from './TicketsPage';
import { WeeklyPlanningPage } from './WeeklyPlanningPage';
import { canAccessPath, currentRole } from './permissions';
import './groups-readability-v2.css';
import './group-buckets.css';

function CurrentPage(){
 const path=window.location.pathname;const role=currentRole();
 if(path.startsWith('/restaurant')||path.startsWith('/cuisine')||path.startsWith('/housekeeping')||path.startsWith('/suivi-interservice')){window.history.replaceState({},'','/');return <App/>}
 if(path.startsWith('/main-courante')){window.history.replaceState({},'','/journal-exploitation');return canAccessPath('/journal-exploitation',role)?<ActivityJournalPage/>:<App/>}
 if(!canAccessPath(path,role)){window.history.replaceState({},'','/');return <App/>}
 if(path.startsWith('/rapports-direction'))return <DirectionReportsPage/>;
 if(path.startsWith('/diagnostic'))return <DiagnosticPage/>;
 if(path.startsWith('/administration')||path.startsWith('/parametres'))return <AdministrationPage/>;
 if(path.startsWith('/planning-operationnel'))return <OperationalPlanningPage/>;
 if(path.startsWith('/taches'))return <TasksPage/>;
 if(path.startsWith('/journal-exploitation')||path.startsWith('/activite'))return <ActivityJournalPage/>;
 if(path.startsWith('/consignes-generales'))return <GeneralInstructionsPage/>;
 if(path.startsWith('/centre-operations')||path.startsWith('/cahier-consignes')||path.startsWith('/prets')||path.startsWith('/inventaire'))return <OperationsCenterV2Page/>;
 if(path.startsWith('/commercial/contrats'))return <GroupContractsPage/>;
 if(path.startsWith('/commercial/groupes'))return <><GroupsPage/><GroupBucketsBridge/></>;
 if(path.startsWith('/commercial/planning-hebdomadaire'))return <WeeklyPlanningPage/>;
 if(path==='/commercial'||path==='/commercial/')return <CommercialHubPage/>;
 if(path.startsWith('/planning-hebdomadaire'))return <WeeklyPlanningPage/>;
 if(path==='/reception'||path==='/reception/')return <ReceptionHubPage/>;
 if(path.startsWith('/reception/archives'))return <ReceptionArchivesPage/>;
 if(path.startsWith('/reception/plaintes'))return <ComplaintsPage/>;
 if(path.startsWith('/reception/demandes-groupe'))return <GroupRequestsPage/>;
 if(path.startsWith('/reception/demandes-individuelles'))return <IndividualRequestsPage/>;
 if(path.startsWith('/reception/paniers-repas-pdj'))return <MealOrdersPage/>;
 if(path.startsWith('/reception/feuille-route-veilleur'))return <NightWatchRoutePage/>;
 if(path.startsWith('/reception/fiche-fonction'))return <WeeklyPlanningPage/>;
 if(path.startsWith('/reception/caisse'))return <ReceptionCashPage/>;
 if(path.startsWith('/reception/arrivees-departs'))return <><ReceptionOperationsPage/><GroupArrivalPersistenceBridge/><ReceptionExpiredItemsFilter/></>;
 if(path.startsWith('/reception/controles'))return <ReceptionControlsPage/>;
 if(path.startsWith('/reception/groupes'))return <ReceptionGroupsPage/>;
 if(path.startsWith('/salles-reunion'))return <MeetingRoomsPage/>;
 if(path.startsWith('/chambres')||path.startsWith('/groupes/allocation')){window.history.replaceState({},'','/salles-reunion');return <MeetingRoomsPage/>}
 if(path.startsWith('/tickets'))return <TicketsPage/>;
 if(path.startsWith('/groupes/import-rooming-list'))return <RoomingListImportPage/>;
 if(path.startsWith('/groupes')){window.history.replaceState({},'','/commercial/groupes');return <><GroupsPage/><GroupBucketsBridge/></>}
 return <App/>;
}
export function AppRouter(){return <AuthGate><><GroupPaymentDepartureSync/><CurrentPage/></></AuthGate>}
