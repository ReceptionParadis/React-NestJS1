import { ActivityJournalPage } from './ActivityJournalPage';
import { AdministrationPage } from './AdministrationPage';
import { App } from './App';
import { AuthGate } from './AuthGate';
import { CommercialHubPage } from './CommercialHubPage';
import { DiagnosticPage } from './DiagnosticPage';
import { GeneralInstructionsPage } from './GeneralInstructionsPage';
import { GroupsPage } from './GroupsPage';
import { MeetingRoomsPage } from './MeetingRoomsPage';
import { OperationalPlanningPage } from './OperationalPlanningPage';
import { OperationsCenterV2Page } from './OperationsCenterV2Page';
import { ReceptionArchivesPage } from './ReceptionArchivesPage';
import { ReceptionDailyPage } from './ReceptionDailyPage';
import { ReceptionHubPage } from './ReceptionHubPage';
import { RoomingListImportPage } from './RoomingListImportPage';
import { TasksPage } from './TasksPage';
import { TicketsPage } from './TicketsPage';
import { WeeklyPlanningPage } from './WeeklyPlanningPage';
import { canAccessPath, currentRole } from './permissions';

function CurrentPage(){
 const path=window.location.pathname;
 const role=currentRole();

 if(
  path.startsWith('/restaurant')||
  path.startsWith('/cuisine')||
  path.startsWith('/housekeeping')||
  path.startsWith('/suivi-interservice')
 ){
  window.history.replaceState({},'','/');
  return <App/>;
 }

 if(path.startsWith('/main-courante')){
  window.history.replaceState({},'','/journal-exploitation');
  return canAccessPath('/journal-exploitation',role)?<ActivityJournalPage/>:<App/>;
 }

 if(!canAccessPath(path,role)){
  window.history.replaceState({},'','/');
  return <App/>;
 }

 if(path.startsWith('/diagnostic'))return <DiagnosticPage/>;
 if(path.startsWith('/administration')||path.startsWith('/parametres'))return <AdministrationPage/>;
 if(path.startsWith('/planning-operationnel'))return <OperationalPlanningPage/>;
 if(path.startsWith('/taches'))return <TasksPage/>;
 if(path.startsWith('/journal-exploitation')||path.startsWith('/activite'))return <ActivityJournalPage/>;
 if(path.startsWith('/consignes-generales'))return <GeneralInstructionsPage/>;
 if(path.startsWith('/centre-operations')||path.startsWith('/cahier-consignes')||path.startsWith('/prets')||path.startsWith('/inventaire'))return <OperationsCenterV2Page/>;
 if(path.startsWith('/commercial/groupes'))return <GroupsPage/>;
 if(path.startsWith('/commercial/planning-hebdomadaire'))return <WeeklyPlanningPage/>;
 if(path==='/commercial'||path==='/commercial/')return <CommercialHubPage/>;
 if(path.startsWith('/planning-hebdomadaire'))return <WeeklyPlanningPage/>;
 if(path==='/reception'||path==='/reception/')return <ReceptionHubPage/>;
 if(path.startsWith('/reception/archives'))return <ReceptionArchivesPage/>;
 if(path.startsWith('/reception/fiche-fonction'))return <WeeklyPlanningPage/>;
 if(path.startsWith('/reception/groupes')||path.startsWith('/reception/controles'))return <ReceptionDailyPage/>;
 if(path.startsWith('/salles-reunion'))return <MeetingRoomsPage/>;
 if(path.startsWith('/chambres')||path.startsWith('/groupes/allocation')){window.history.replaceState({},'','/salles-reunion');return <MeetingRoomsPage/>}
 if(path.startsWith('/tickets'))return <TicketsPage/>;
 if(path.startsWith('/groupes/import-rooming-list'))return <RoomingListImportPage/>;
 if(path.startsWith('/groupes')){window.history.replaceState({},'','/commercial/groupes');return <GroupsPage/>}
 return <App/>;
}

export function AppRouter(){return <AuthGate><CurrentPage/></AuthGate>}
