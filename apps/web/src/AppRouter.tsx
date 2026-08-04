import { App } from './App';
import { MainCourantePage } from './MainCourantePage';
import { RoomsPage } from './RoomsPage';

export function AppRouter() {
  const path = window.location.pathname;

  if (path.startsWith('/main-courante')) return <MainCourantePage />;
  if (path.startsWith('/chambres')) return <RoomsPage />;

  return <App />;
}
