import { ActivityJournalPage } from './ActivityJournalPage';
import { AdministrationPage } from './AdministrationPage';
import { App } from './App';
import { AuthGate } from './AuthGate';
import { CommercialHubPage } from './CommercialHubPage';
import { DailyGroupBoard } from './DailyGroupBoard';
import { DiagnosticPage } from './DiagnosticPage';
import { GeneralInstructionsPage } from './GeneralInstructionsPage';
import { GroupsPage } from './GroupsPage';
import { InterserviceControlPage } from './InterserviceControlPage';
import { InterservicePage } from './InterservicePage';
import { MainCourante } from './MainCourante';
import { MeetingRoomsPage } from './MeetingRoomsPage';
import { OperationsCenterV2Page } from './OperationsCenterV2Page';
import { ReceptionDailyPage } from './ReceptionDailyPage';
import { RestaurantPlanningPage } from './RestaurantPlanningPage';
import { RoomingListImportPage } from './RoomingListImportPage';
import { TasksPage } from './TasksPage';
import { TicketsPage } from './TicketsPage';
import { WeeklyPlanningPage } from './WeeklyPlanningPage';

function CurrentPage() {
  const path = window.location.pathname;
  if (path.startsWith('/diagnostic')) return <DiagnosticPage />;
  if (path.startsWith('/administration') || path.startsWith('/parametres')) return <AdministrationPage />;
  if (path.startsWith('/taches')) return <TasksPage />;
  if (path.startsWith('/journal-exploitation') || path.startsWith('/activite')) return <ActivityJournalPage />;
  if (path.startsWith('/consignes-generales')) return <GeneralInstructionsPage />;
  if (path.startsWith('/centre-operations') || path.startsWith('/cahier-consignes') || path.startsWith('/prets') || path.startsWith('/inventaire')) return <OperationsCenterV2Page />;
  if (path.startsWith('/suivi-interservice')) return <InterserviceControlPage />;
  if (path.startsWith('/commercial/groupes')) return <GroupsPage />;
  if (path.startsWith('/commercial/planning-hebdomadaire')) return <WeeklyPlanningPage />;
  if (path === '/commercial' || path === '/commercial/') return <CommercialHubPage />;
  if (path.startsWith('/planning-hebdomadaire')) return <WeeklyPlanningPage />;
  if (path.startsWith('/reception')) return <ReceptionDailyPage />;
  if (path.startsWith('/restaurant')) return <RestaurantPlanningPage />;
  if (path.startsWith('/housekeeping')) return <InterservicePage department="housekeeping" />;
  if (path.startsWith('/cuisine')) return <InterservicePage department="cuisine" />;
  if (path.startsWith('/main-courante')) return <MainCourante />;
  if (path.startsWith('/salles-reunion')) return <MeetingRoomsPage />;
  if (path.startsWith('/chambres') || path.startsWith('/groupes/allocation')) { window.history.replaceState({}, '', '/salles-reunion'); return <MeetingRoomsPage />; }
  if (path.startsWith('/tickets')) return <TicketsPage />;
  if (path.startsWith('/groupes/import-rooming-list')) return <RoomingListImportPage />;
  if (path.startsWith('/groupes')) { window.history.replaceState({}, '', '/commercial/groupes'); return <GroupsPage />; }
  return <><App/><div className="dashboard-daily-embed"><DailyGroupBoard compact/></div></>;
}

export function AppRouter() { return <AuthGate><CurrentPage /></AuthGate>; }
