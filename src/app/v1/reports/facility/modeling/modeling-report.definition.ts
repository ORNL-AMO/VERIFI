import { inject } from '@angular/core';
import { ReportFeatureDefinition, REPORT_RUNTIME } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { ModelingReportEditor } from './editing/modeling-report-editor.service';
import { FacilityModelingReportService } from './modeling-report.service';
import { ModelingReportSetupComponent } from './setup/modeling-report-setup.component';
import { ModelingReportPreviewComponent } from './preview/modeling-report-preview.component';
import { ModelingReportOutputService } from './output/modeling-report-output.service';

export const FACILITY_MODELING_REPORT: ReportFeatureDefinition = {
  type: 'modeling', providers: [ModelingReportEditor, FacilityModelingReportService, ModelingReportOutputService,
    { provide: REPORT_RUNTIME, useFactory: () => ({ editor: inject(ModelingReportEditor), gateSetup: true,
      output: inject(ModelingReportOutputService).output }) }],
  stages: { setup: ModelingReportSetupComponent, report: ModelingReportPreviewComponent }
};
