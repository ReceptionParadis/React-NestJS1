import { App } from './App';
import { MainCourante } from './MainCourante';
import { RoomsPage } from './RoomsPage';
import { TicketsPage } from './TicketsPage';

export function AppRouter() {
  const path = window.location.pathname;

  if (path.startsWith('/main-courante')) return <MainCourante />;
  if (path.startsWith('/chambres')) return <RoomsPage />;
  if (path.startsWith('/tickets')) return <TicketsPage />;

  return <App />;
}
