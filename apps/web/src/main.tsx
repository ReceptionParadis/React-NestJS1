import React from 'react';
import ReactDOM from 'react-dom/client';
import { AppRouter } from './AppRouter';
import { OperationalToastHost } from './OperationalToastHost';
import { ReceptionMealNav } from './ReceptionMealNav';
import { ReceptionComplaintsNav } from './ReceptionComplaintsNav';
import { DirectionReportsNav } from './DirectionReportsNav';
import { UserAccountMenu } from './UserAccountMenu';
import { UnifiedNotificationHost } from './UnifiedNotificationHost';
import { DashboardJournalBridge } from './DashboardJournalBridge';
import { CommandCenterButton } from './CommandCenterButton';
import { CommandKpiNavigationBridge } from './CommandKpiNavigationBridge';
import { CommandGroupFlowSyncBridge } from './CommandGroupFlowSyncBridge';
import { CommandCenterTimeExpiryBridge } from './CommandCenterTimeExpiryBridge';
import { HousekeepingTypeDisplayBridge } from './HousekeepingTypeDisplayBridge';
import { StaleOperationalDataCleanup } from './StaleOperationalDataCleanup';
import { NightAuditorNav } from './NightAuditorNav';
import { NightRouteGroupRequestsBridge } from './NightRouteGroupRequestsBridge';
import { GroupControlPrintRecovery } from './GroupControlPrintRecovery';
import { GroupControlUnlockPermissionBridge } from './GroupControlUnlockPermissionBridge';
import { AdministrationRoleProfileBridge } from './AdministrationRoleProfileBridge';
import { MaintenanceExperienceBridge } from './MaintenanceExperienceBridge';
import { RoleAwareCommandCenter } from './RoleAwareCommandCenter';
import { FunctionSheetPrintCleanup } from './FunctionSheetPrintCleanup';
import { FunctionSheetSourceSync } from './FunctionSheetSourceSync';
import { MealOrderAutoSync } from './MealOrderAutoSync';
import { PdjBoxMealRow } from './PdjBoxMealRow';
import { MealTransmissionDashboard } from './MealTransmissionDashboard';
import { Group360PendingInfoHelper } from './Group360PendingInfoHelper';
import { Group360DeleteAction } from './Group360DeleteAction';
import { GroupCreateExperience } from './GroupCreateExperience';
import { Group360ArchiveFilter } from './Group360ArchiveFilter';
import { IndividualRequestsCommandDashboard } from './IndividualRequestsCommandDashboard';
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

const cashFocusedRoute = window.location.pathname.startsWith('/reception/caisse');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppRouter />
    {cashFocusedRoute ? (
      <>
        <DirectionCashUnlockBridge />
        <CashValidatedBannerScopeBridge />
        <OperationalPrintRecovery />
        <OperationalToastHost />
      </>
    ) : (
      <>
        <StaleOperationalDataCleanup />
        <RoleAwareCommandCenter />
        <CommandKpiNavigationBridge />
        <CommandGroupFlowSyncBridge />
        <CommandCenterTimeExpiryBridge />
        <HousekeepingTypeDisplayBridge />
        <FunctionSheetSourceSync />
        <FunctionSheetPrintCleanup />
        <MealOrderAutoSync />
        <PdjBoxMealRow />
        <MealTransmissionDashboard />
        <IndividualRequestsCommandDashboard />
        <OperationalArchiveAdditions />
        <Group360PendingInfoHelper />
        <Group360DeleteAction />
        <GroupCreateExperience />
        <Group360ArchiveFilter />
        <DirectionCashUnlockBridge />
        <CashValidatedBannerScopeBridge />
        <ComplaintsPrintBridge />
        <OperationalPrintRecovery />
        <OperationalToastHost />
        <ReceptionMealNav />
        <ReceptionComplaintsNav />
        <DirectionReportsNav />
        <UserAccountMenu />
        <UnifiedNotificationHost />
        <DashboardJournalBridge />
        <CommandCenterButton />
        <NightAuditorNav />
        <NightRouteGroupRequestsBridge />
        <GroupControlPrintRecovery />
        <GroupControlUnlockPermissionBridge />
        <AdministrationRoleProfileBridge />
        <MaintenanceExperienceBridge />
      </>
    )}
  </React.StrictMode>,
);
