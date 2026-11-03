import { inject } from '@angular/core';
import { ReportFeatureDefinition, REPORT_RUNTIME } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { PendingReportStageComponent } from '@app/v1/reports/shared/workbench/pending-stage/pending-report-stage.component';
import { BETTER_PLANTS_REPORT } from './better-plants/better-plants-report.definition';
import { ACCOUNT_ANALYSIS_EDITOR, AccountReportEditor } from './workbench/editing/account-report-editor.service';
import { AccountReportSetupComponent } from './workbench/setup/account-report-setup.component';

export const ACCOUNT_REPORT_FEATURES: readonly ReportFeatureDefinition[] = [BETTER_PLANTS_REPORT];
export const PENDING_ACCOUNT_REPORT: ReportFeatureDefinition = {
  type: 'pending', providers: [AccountReportEditor,
    { provide: ACCOUNT_ANALYSIS_EDITOR, useExisting: AccountReportEditor },
    { provide: REPORT_RUNTIME, useFactory: () => ({ editor: inject(AccountReportEditor), gateSetup: true, showOutputActions: true }) }],
  stages: { setup: AccountReportSetupComponent, 'data-checks': PendingReportStageComponent, report: PendingReportStageComponent }
};
