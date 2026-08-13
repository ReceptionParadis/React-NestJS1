import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './AppRouter';
import { OperationalToastHost } from './OperationalToastHost';
import { ReceptionMealNav } from './ReceptionMealNav';
import { ReceptionComplaintsNav } from './ReceptionComplaintsNav';
import { DirectionReportsNav } from './DirectionReportsNav';
import { UserAccountMenu } from './UserAccountMenu';
import { UnifiedNotificationHost } from './UnifiedNotificationHost';
import { CommandCenterButton } from './CommandCenterButton';
import { DashboardNativeConsistencyBridge } from './DashboardNativeConsistencyBridge';
import { HousekeepingTypeDisplayBridge } from './HousekeepingTypeDisplayBridge';
import { NightRouteGroupRequestsBridge } from './NightRouteGroupRequestsBridge';
import { GroupControlPrintRecovery } from './GroupControlPrintRecovery';
import { GroupControlUnlockPermissionBridge } from './GroupControlUnlockPermissionBridge';
import { GroupControlCompletionRecovery } from './GroupControlCompletionRecovery';
import { AdministrationRoleProfileBridge } from './AdministrationRoleProfileBridge';
import { MaintenanceExperienceBridge } from './MaintenanceExperienceBridge';
import { FunctionSheetPrintCleanup } from './FunctionSheetPrintCleanup';
import { FunctionSheetPrintBridge } from './FunctionSheetPrintBridge';
import { FunctionSheetSourceSync } from './FunctionSheetSourceSync';
import { MealOrderAutoSync } from './MealOrderAutoSync';
import { MealOrdersPrintBridge } from './MealOrdersPrintBridge';
import { PdjBoxMealRow } from './PdjBoxMealRow';
import { Group360PendingInfoHelper } from './Group360PendingInfoHelper';
import { Group360DeleteAction } from './Group360DeleteAction';
import { GroupCreateExperience } from './GroupCreateExperience';
import { Group360ArchiveFilter } from './Group360ArchiveFilter';
import { OperationalArchiveAdditions } from './OperationalArchiveAdditions';
import { DirectionCashUnlockBridge } from './DirectionCashUnlockBridge';
import { CashValidatedBannerScopeBridge } from './CashValidatedBannerScopeBridge';
import { ComplaintsPrintBridge } from './ComplaintsPrintBridge';
import { OperationalPrintRecovery } from './OperationalPrintRecovery';
import { cleanupLegacyLocalData } from './legacy-cleanup';
import './styles.css';
import './executive-dashboard.css';
import './tickets.css';
import './maintenance-v2.css';
import './maintenance-readability.css';
import './groups.css';
import './group-delete-action.css';
import './group-meal-highlights.css';
import './rooming-import.css';
import './auth.css';
import './meeting-rooms.css';
import './weekly-planning.css';
import './function-sheet-auto-print.css';
import './operations-center.css';
import './general-instructions.css';
import './activity-journal.css';
import './tasks.css';
import './administration.css';
import './administration-security.css';
import './diagnostic.css';
import './hospicore-live.css';
import './command-center.css';
import './command-journal-readability.css';
import './dashboard-journal-sync.css';
import './command-role-filter.css';
import './command-maintenance-widget.css';
import './role-aware-command-center.css';
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
import './reception-operations-readability.css';
import './reception-archives-tree.css';
import './complaints.css';
import './direction-reports.css';
import './user-account-menu.css';
import './command-center-button.css';
import './hospicore-consistency.css';
import './unified-notifications.css';
import './individual-requests-command.css';
import './operational-archive-additions.css';

cleanupLegacyLocalData();

const path = window.location.pathname;
const dashboardRoute = path === '/' || path === '';
const receptionRoute = path.startsWith('/reception');
const cashRoute = path.startsWith('/reception/caisse');
const controlsRoute = path.startsWith('/reception/controles');
const groupsRoute = path.startsWith('/reception/groupes');
const archivesRoute = path.startsWith('/reception/archives');
const functionSheetRoute = path.startsWith('/reception/fiche-fonction');
const nightRoute = path.startsWith('/reception/feuille-route-veilleur');
const complaintsRoute = path.startsWith('/reception/plaintes');
const mealRoute = path.includes('panier') || path.includes('pdj') || path.includes('repas');
const adminRoute = path.startsWith('/administration');
const maintenanceRoute = path.startsWith('/tickets') || path.startsWith('/maintenance');

function RouteScopedBridges() {
  if (dashboardRoute) {
    return <>
      <OperationalToastHost />
      <UserAccountMenu />
      <DashboardNativeConsistencyBridge />
    </>;
  }
  if (cashRoute) {
    return <>
      <DirectionCashUnlockBridge />
      <CashValidatedBannerScopeBridge />
      <OperationalPrintRecovery />
      <OperationalToastHost />
      <UserAccountMenu />
    </>;
  }
  return <>
    <OperationalToastHost />
    <UserAccountMenu />
    <UnifiedNotificationHost />
    <CommandCenterButton />
    {receptionRoute && <><ReceptionMealNav /><ReceptionComplaintsNav /></>}
    {controlsRoute && <><GroupControlCompletionRecovery /><GroupControlPrintRecovery /><GroupControlUnlockPermissionBridge /></>}
    {groupsRoute && <><Group360PendingInfoHelper /><Group360DeleteAction /><GroupCreateExperience /></>}
    {archivesRoute && <><Group360ArchiveFilter /><OperationalArchiveAdditions /></>}
    {functionSheetRoute && <><FunctionSheetSourceSync /><FunctionSheetPrintCleanup /><FunctionSheetPrintBridge /></>}
    {nightRoute && <NightRouteGroupRequestsBridge />}
    {complaintsRoute && <ComplaintsPrintBridge />}
    {mealRoute && <><MealOrderAutoSync /><MealOrdersPrintBridge /><PdjBoxMealRow /></>}
    {adminRoute && <AdministrationRoleProfileBridge />}
    {maintenanceRoute && <MaintenanceExperienceBridge />}
    {path.startsWith('/rapports-direction') && <DirectionReportsNav />}
    {path.startsWith('/menage') && <HousekeepingTypeDisplayBridge />}
    {(nightRoute || complaintsRoute) && <OperationalPrintRecovery />}
  </>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
    <RouteScopedBridges />
  </React.StrictMode>,
);
