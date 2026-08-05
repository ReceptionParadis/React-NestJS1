import { App } from './App';
import { AuthGate } from './AuthGate';
import { GroupsPage } from './GroupsPage';
import { MainCourante } from './MainCourante';
import { MeetingRoomsPage } from './MeetingRoomsPage';
import { RestaurantPlanningPage } from './RestaurantPlanningPage';
import { RoomingListImportPage } from './RoomingListImportPage';
import { TicketsPage } from './TicketsPage';

function CurrentPage() {
  const path = window.location.pathname;

  if (path.startsWith('/main-courante')) return <MainCourante />;
  if (path.startsWith('/restaurant')) return <RestaurantPlanningPage />;
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
