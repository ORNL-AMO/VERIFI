import { inject } from '@angular/core';
import { ReportFeatureDefinition, REPORT_RUNTIME } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { ACCOUNT_ANALYSIS_EDITOR } from '../workbench/editing/account-report-editor.service';
import { BetterPlantsEditor } from './editing/better-plants-editor.service';
import { BetterPlantsReportService } from './better-plants-report.service';
import { BetterPlantsSetupPageComponent } from './setup/page/better-plants-setup-page.component';
import { BetterPlantsDataChecksComponent } from './data-checks/better-plants-data-checks.component';
import { BetterPlantsPreviewComponent } from './preview/better-plants-preview.component';
import { BetterPlantsOutputService } from './output/better-plants-output.service';

export const BETTER_PLANTS_REPORT: ReportFeatureDefinition = {
  type: 'betterPlants',
  providers: [BetterPlantsEditor, BetterPlantsReportService, BetterPlantsOutputService,
    { provide: ACCOUNT_ANALYSIS_EDITOR, useExisting: BetterPlantsEditor },
    { provide: REPORT_RUNTIME, useFactory: () => ({ editor: inject(BetterPlantsEditor), checks: inject(BetterPlantsReportService), gateSetup: true, output: inject(BetterPlantsOutputService).output }) }],
  stages: { setup: BetterPlantsSetupPageComponent, 'data-checks': BetterPlantsDataChecksComponent, report: BetterPlantsPreviewComponent }
};
