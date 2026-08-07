import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './AppRouter';
import { OperationalToastHost } from './OperationalToastHost';
import './styles.css';
import './executive-dashboard.css';
import './shift-log.css';
import './tickets.css';
import './maintenance-v2.css';
import './groups.css';
import './rooming-import.css';
import './auth.css';
import './meeting-rooms.css';
import './weekly-planning.css';
import './interservice-control.css';
import './operations-center.css';
import './general-instructions.css';
import './activity-journal.css';
import './tasks.css';
import './administration.css';
import './diagnostic.css';
import './hospicore-live.css';
import './command-center.css';
import './command-maintenance-widget.css';
import './commercial-hub.css';
import './function-sheet-notice.css';
import './daily-group-board.css';
import './operational-planning.css';
import './reception-group-control.css';
import './group-control-workflow.css';
import './reception-control-uniform.css';
import './group-control-print-fix.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
    <OperationalToastHost />
  </React.StrictMode>,
);
