import { inject } from '@angular/core';
import { ReportFeatureDefinition, REPORT_RUNTIME } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { AnalysisReportEditor } from './editing/analysis-report-editor.service';
import { FacilityAnalysisReportService } from './analysis-report.service';
import { AnalysisReportSetupComponent } from './setup/analysis-report-setup.component';
import { AnalysisReportDataChecksComponent } from './data-checks/analysis-report-data-checks.component';
import { AnalysisReportPreviewComponent } from './preview/analysis-report-preview.component';

export const FACILITY_ANALYSIS_REPORT: ReportFeatureDefinition = {
  type: 'analysis',
  providers: [AnalysisReportEditor, FacilityAnalysisReportService,
    { provide: REPORT_RUNTIME, useFactory: () => ({ editor: inject(AnalysisReportEditor), checks: inject(FacilityAnalysisReportService), gateSetup: true, showOutputActions: true }) }],
  stages: { setup: AnalysisReportSetupComponent, 'data-checks': AnalysisReportDataChecksComponent, report: AnalysisReportPreviewComponent }
};
