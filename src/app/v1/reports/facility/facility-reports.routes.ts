import { Routes } from '@angular/router';
import { flushPendingChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { FacilityReportWorkbenchComponent, facilityReportLeaveGuard } from './workbench/facility-report-workbench.component';
import { FacilityReportSetupComponent } from './workbench/setup/facility-report-setup.component';
import { FacilityReportDataChecksComponent } from './workbench/data-checks/facility-report-data-checks.component';
import { FacilityReportPreviewComponent } from './workbench/preview/facility-report-preview.component';

export const FACILITY_REPORT_ROUTES: Routes = [
  { path: 'workbench/:reportGuid', component: FacilityReportWorkbenchComponent,
    canActivate: [flushPendingChangesGuard], canDeactivate: [facilityReportLeaveGuard], children: [
      { path: '', pathMatch: 'full', redirectTo: 'setup' },
      { path: 'setup', component: FacilityReportSetupComponent },
      { path: 'data-checks', component: FacilityReportDataChecksComponent },
      { path: 'report', component: FacilityReportPreviewComponent },
      { path: '**', redirectTo: 'setup' }
    ] },
  { path: '**', redirectTo: '/v1' }
];
