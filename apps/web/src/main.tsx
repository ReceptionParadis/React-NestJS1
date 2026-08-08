import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './AppRouter';
import { OperationalToastHost } from './OperationalToastHost';
import { ReceptionMealNav } from './ReceptionMealNav';
import { UserAccountMenu } from './UserAccountMenu';
import { TaskNotificationHost } from './TaskNotificationHost';
import { HandrailNotificationHost } from './HandrailNotificationHost';
import { DashboardJournalBridge } from './DashboardJournalBridge';
import { CommandCenterButton } from './CommandCenterButton';
import { cleanupLegacyLocalData } from './legacy-cleanup';
import './styles.css';
import './executive-dashboard.css';
import './tickets.css';
import './maintenance-v2.css';
import './groups.css';
import './rooming-import.css';
import './auth.css';
import './meeting-rooms.css';
import './weekly-planning.css';
import './operations-center.css';
import './general-instructions.css';
import './handrail-notifications.css';
import './activity-journal.css';
import './tasks.css';
import './task-notifications.css';
import './administration.css';
import './administration-security.css';
import './diagnostic.css';
import './hospicore-live.css';
import './command-center.css';
import './command-journal-readability.css';
import './dashboard-journal-sync.css';
import './command-role-filter.css';
import './command-maintenance-widget.css';
import './commercial-hub.css';
import './function-sheet-notice.css';
import './daily-group-board.css';
import './operational-planning.css';
import './reception-group-control.css';
import './group-control-workflow.css';
import './reception-control-uniform.css';
import './group-control-print-fix.css';
import './operational-group-buckets.css';
import './reception-hub.css';
import './reception-nav.css';
import './reception-night.css';
import './reception-workspace.css';
import './user-account-menu.css';
import './command-center-button.css';

cleanupLegacyLocalData();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
    <OperationalToastHost />
    <ReceptionMealNav />
    <UserAccountMenu />
    <TaskNotificationHost />
    <HandrailNotificationHost />
    <DashboardJournalBridge />
    <CommandCenterButton />
  </React.StrictMode>,
);
