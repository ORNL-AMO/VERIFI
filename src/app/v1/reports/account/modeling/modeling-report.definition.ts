import { inject } from '@angular/core';
import { ReportFeatureDefinition, REPORT_RUNTIME } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { ReportPresentationController } from '@app/v1/reports/shared/presentation/report-presentation-controller';
import { ACCOUNT_ANALYSIS_EDITOR } from '../workbench/editing/account-report-editor.service';
import { AccountModelingReportEditor } from './editing/modeling-report-editor.service';
import { AccountModelingReportService } from './modeling-report.service';
import { AccountModelingReportSetupComponent } from './setup/modeling-report-setup.component';
import { AccountModelingReportPreviewComponent } from './preview/modeling-report-preview.component';
import { AccountModelingReportOutputService } from './output/modeling-report-output.service';

export const ACCOUNT_MODELING_REPORT: ReportFeatureDefinition = {
  type: 'analysis', providers: [AccountModelingReportEditor, AccountModelingReportService, AccountModelingReportOutputService, ReportPresentationController,
    { provide: ACCOUNT_ANALYSIS_EDITOR, useExisting: AccountModelingReportEditor },
    { provide: REPORT_RUNTIME, useFactory: () => ({ editor: inject(AccountModelingReportEditor), gateSetup: true,
      output: inject(AccountModelingReportOutputService).output, presentation: inject(ReportPresentationController) }) }],
  stages: { setup: AccountModelingReportSetupComponent, report: AccountModelingReportPreviewComponent }
};
