import { AllocationReviewPage } from './AllocationReviewPage';
import { App } from './App';
import { AuthGate } from './AuthGate';
import { GroupsPage } from './GroupsPage';
import { MainCourante } from './MainCourante';
import { RoomingListImportPage } from './RoomingListImportPage';
import { RoomsPage } from './RoomsPage';
import { TicketsPage } from './TicketsPage';

function CurrentPage() {
  const path = window.location.pathname;

  if (path.startsWith('/main-courante')) return <MainCourante />;
  if (path.startsWith('/chambres')) return <RoomsPage />;
  if (path.startsWith('/tickets')) return <TicketsPage />;
  if (path.startsWith('/groupes/import-rooming-list')) return <RoomingListImportPage />;
  if (path.startsWith('/groupes/allocation')) return <AllocationReviewPage />;
  if (path.startsWith('/groupes')) return <GroupsPage />;

  return <App />;
}

export function AppRouter() {
  return <AuthGate><CurrentPage /></AuthGate>;
}
