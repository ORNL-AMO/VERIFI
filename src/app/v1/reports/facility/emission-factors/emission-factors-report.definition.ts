import { inject } from '@angular/core';
import { ReportFeatureDefinition, REPORT_RUNTIME } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { EmissionFactorsReportEditor } from './editing/emission-factors-report-editor.service';
import { EmissionFactorsReportService } from './emission-factors-report.service';
import { EmissionFactorsReportSetupComponent } from './setup/emission-factors-report-setup.component';
import { EmissionFactorsReportPreviewComponent } from './preview/emission-factors-report-preview.component';
import { EmissionFactorsReportOutputService } from './output/emission-factors-report-output.service';
import { ReportPresentationController } from '@app/v1/reports/shared/presentation/report-presentation-controller';

export const FACILITY_EMISSION_FACTORS_REPORT: ReportFeatureDefinition = {
  type: 'emissionFactors', providers: [EmissionFactorsReportEditor, EmissionFactorsReportService, EmissionFactorsReportOutputService, ReportPresentationController, {
    provide: REPORT_RUNTIME, useFactory: () => ({ editor: inject(EmissionFactorsReportEditor), gateSetup: true,
      output: inject(EmissionFactorsReportOutputService).output, presentation: inject(ReportPresentationController) })
  }],
  stages: { setup: EmissionFactorsReportSetupComponent, report: EmissionFactorsReportPreviewComponent }
};
