import { inject } from '@angular/core';
import { ReportFeatureDefinition, REPORT_RUNTIME } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { PendingReportStageComponent } from '@app/v1/reports/shared/workbench/pending-stage/pending-report-stage.component';
import { FACILITY_ANALYSIS_REPORT } from './analysis/analysis-report.definition';
import { FacilityReportEditor } from './workbench/editing/facility-report-editor.service';
import { FacilityReportSetupComponent } from './workbench/setup/facility-report-setup.component';

export const FACILITY_REPORT_FEATURES: readonly ReportFeatureDefinition[] = [FACILITY_ANALYSIS_REPORT];
export const PENDING_FACILITY_REPORT: ReportFeatureDefinition = {
  type: 'pending', providers: [FacilityReportEditor,
    { provide: REPORT_RUNTIME, useFactory: () => ({ editor: inject(FacilityReportEditor), gateSetup: false }) }],
  stages: { setup: FacilityReportSetupComponent, 'data-checks': PendingReportStageComponent, report: PendingReportStageComponent }
};
