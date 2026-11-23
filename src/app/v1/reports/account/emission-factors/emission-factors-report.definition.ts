import { inject } from '@angular/core';
import { ReportFeatureDefinition, REPORT_RUNTIME } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { AccountEmissionFactorsReportEditor } from './editing/emission-factors-report-editor.service';
import { AccountEmissionFactorsReportService } from './emission-factors-report.service';
import { AccountEmissionFactorsReportSetupComponent } from './setup/emission-factors-report-setup.component';
import { AccountEmissionFactorsReportPreviewComponent } from './preview/emission-factors-report-preview.component';
import { AccountEmissionFactorsReportOutputService } from './output/emission-factors-report-output.service';
import { ReportPresentationController } from '@app/v1/reports/shared/presentation/report-presentation-controller';

export const ACCOUNT_EMISSION_FACTORS_REPORT: ReportFeatureDefinition = {
  type: 'accountEmissionFactors', providers: [AccountEmissionFactorsReportEditor, AccountEmissionFactorsReportService, AccountEmissionFactorsReportOutputService, ReportPresentationController, {
    provide: REPORT_RUNTIME, useFactory: () => ({ editor: inject(AccountEmissionFactorsReportEditor), gateSetup: true,
      output: inject(AccountEmissionFactorsReportOutputService).output, presentation: inject(ReportPresentationController) })
  }],
  stages: { setup: AccountEmissionFactorsReportSetupComponent, report: AccountEmissionFactorsReportPreviewComponent }
};
