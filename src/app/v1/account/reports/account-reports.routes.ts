import { ReportsDashboardComponent } from '@app/v1/shared/reports/reports-dashboard/reports-dashboard.component';
import { Routes } from '@angular/router';
import { flushPendingChangesGuard, unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { AccountReportWorkbenchComponent, accountReportLeaveGuard } from './account-report-workbench/account-report-workbench.component';
import { AccountReportSetupComponent } from './account-report-workbench/setup/account-report-setup.component';
import { AccountReportDataChecksComponent } from './account-report-workbench/data-checks/account-report-data-checks.component';
import { AccountReportPreviewComponent } from './account-report-workbench/preview/account-report-preview.component';

export const ACCOUNT_REPORT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: ReportsDashboardComponent, canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsOrQueryParamsChange' },
  { path: 'workbench/:reportGuid', component: AccountReportWorkbenchComponent,
    canActivate: [flushPendingChangesGuard], canActivateChild: [flushPendingChangesGuard], canDeactivate: [accountReportLeaveGuard], runGuardsAndResolvers: 'always', children: [
      { path: '', pathMatch: 'full', redirectTo: 'setup' },
      { path: 'setup', component: AccountReportSetupComponent },
      { path: 'data-checks', component: AccountReportDataChecksComponent },
      { path: 'report', component: AccountReportPreviewComponent },
      { path: '**', redirectTo: 'setup' }
    ] },
  { path: '**', redirectTo: 'dashboard' }
];
