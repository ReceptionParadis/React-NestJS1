import { App } from './App';
import { AuthGate } from './AuthGate';
import { GroupsPage } from './GroupsPage';
import { InterservicePage } from './InterservicePage';
import { MainCourante } from './MainCourante';
import { MeetingRoomsPage } from './MeetingRoomsPage';
import { RestaurantPlanningPage } from './RestaurantPlanningPage';
import { RoomingListImportPage } from './RoomingListImportPage';
import { TicketsPage } from './TicketsPage';
import { WeeklyPlanningPage } from './WeeklyPlanningPage';

function CurrentPage() {
  const path = window.location.pathname;

  if (path.startsWith('/planning-hebdomadaire')) return <WeeklyPlanningPage />;
  if (path.startsWith('/reception')) return <InterservicePage department="reception" />;
  if (path.startsWith('/restaurant')) return <RestaurantPlanningPage />;
  if (path.startsWith('/housekeeping')) return <InterservicePage department="housekeeping" />;
  if (path.startsWith('/cuisine')) return <InterservicePage department="cuisine" />;
  if (path.startsWith('/commercial')) return <InterservicePage department="commercial" />;
  if (path.startsWith('/main-courante')) return <MainCourante />;
  if (path.startsWith('/salles-reunion')) return <MeetingRoomsPage />;
  if (path.startsWith('/chambres') || path.startsWith('/groupes/allocation')) {
    window.history.replaceState({}, '', '/salles-reunion');
    return <MeetingRoomsPage />;
  }
  if (path.startsWith('/tickets')) return <TicketsPage />;
  if (path.startsWith('/groupes/import-rooming-list')) return <RoomingListImportPage />;
  if (path.startsWith('/groupes')) return <GroupsPage />;

  return <App />;
}

export function AppRouter() {
  return <AuthGate><CurrentPage /></AuthGate>;
}
