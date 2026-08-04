import { App } from './App';
import { MainCourante } from './MainCourante';
import { RoomsPage } from './RoomsPage';

export function AppRouter() {
  const path = window.location.pathname;

  if (path.startsWith('/main-courante')) return <MainCourante />;
  if (path.startsWith('/chambres')) return <RoomsPage />;

  return <App />;
}
