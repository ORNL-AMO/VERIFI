import { Routes } from '@angular/router';
import { flushPendingChangesGuard, unsavedChangesGuard } from '@app/v1/account/data/unsaved-changes.guard';
import { FacilityReportsDashboardComponent } from './facility-reports-dashboard/facility-reports-dashboard.component';
import { FacilityReportWorkbenchComponent, facilityReportLeaveGuard } from './facility-report-workbench/facility-report-workbench.component';
import { FacilityReportSetupComponent } from './facility-report-workbench/setup/facility-report-setup.component';
import { FacilityReportDataChecksComponent } from './facility-report-workbench/data-checks/facility-report-data-checks.component';
import { FacilityReportPreviewComponent } from './facility-report-workbench/preview/facility-report-preview.component';

export const FACILITY_REPORT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: 'dashboard', component: FacilityReportsDashboardComponent, canDeactivate: [unsavedChangesGuard] },
  { path: 'workbench/:reportGuid', component: FacilityReportWorkbenchComponent,
    canActivate: [flushPendingChangesGuard], canDeactivate: [facilityReportLeaveGuard], children: [
      { path: '', pathMatch: 'full', redirectTo: 'setup' },
      { path: 'setup', component: FacilityReportSetupComponent },
      { path: 'data-checks', component: FacilityReportDataChecksComponent },
      { path: 'report', component: FacilityReportPreviewComponent },
      { path: '**', redirectTo: 'setup' }
    ] },
  { path: '**', redirectTo: 'dashboard' }
];
