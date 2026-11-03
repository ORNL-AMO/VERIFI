import { ReportsInventoryComponent } from '@app/v1/reports/inventory/reports-inventory.component';
import { Routes } from '@angular/router';
import { flushPendingChangesGuard, unsavedChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { AccountReportWorkbenchComponent, accountReportLeaveGuard } from './workbench/account-report-workbench.component';
import { ReportStageOutletComponent } from '@app/v1/reports/shared/workbench/stage-outlet/report-stage-outlet.component';

export const ACCOUNT_REPORT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: ReportsInventoryComponent, canDeactivate: [unsavedChangesGuard], runGuardsAndResolvers: 'paramsOrQueryParamsChange' },
  { path: 'workbench/:reportGuid', component: AccountReportWorkbenchComponent,
    canActivate: [flushPendingChangesGuard], canActivateChild: [flushPendingChangesGuard], canDeactivate: [accountReportLeaveGuard], runGuardsAndResolvers: 'always', children: [
      { path: '', pathMatch: 'full', redirectTo: 'setup' },
      { path: 'setup', component: ReportStageOutletComponent },
      { path: 'data-checks', component: ReportStageOutletComponent },
      { path: 'report', component: ReportStageOutletComponent },
      { path: '**', redirectTo: 'setup' }
    ] },
  { path: '**', redirectTo: 'dashboard' }
];
