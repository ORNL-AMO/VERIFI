import { Routes } from '@angular/router';
import { flushPendingChangesGuard } from '@app/v1/shared/navigation/unsaved-changes.guard';
import { FacilityReportWorkbenchComponent, facilityReportLeaveGuard } from './workbench/facility-report-workbench.component';
import { ReportStageOutletComponent } from '@app/v1/reports/shared/workbench/stage-outlet/report-stage-outlet.component';

export const FACILITY_REPORT_ROUTES: Routes = [
  { path: 'workbench/:reportGuid', component: FacilityReportWorkbenchComponent,
    canActivate: [flushPendingChangesGuard], canActivateChild: [flushPendingChangesGuard], runGuardsAndResolvers: 'always', canDeactivate: [facilityReportLeaveGuard], children: [
      { path: '', pathMatch: 'full', redirectTo: 'setup' },
      { path: 'setup', component: ReportStageOutletComponent },
      { path: 'data-checks', component: ReportStageOutletComponent },
      { path: 'report', component: ReportStageOutletComponent },
      { path: '**', redirectTo: 'setup' }
    ] },
  { path: '**', redirectTo: '/v1' }
];
