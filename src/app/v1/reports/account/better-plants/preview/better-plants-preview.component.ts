import { Component, computed, inject } from '@angular/core';
import { AccountReportWorkbenchContext } from '../../workbench/account-report-workbench-context.service';
import { BetterPlantsReportService } from '../better-plants-report.service';
import { buildBetterPlantsDocument } from '../better-plants-report.view';

@Component({ selector: 'app-better-plants-preview', standalone: false,
  templateUrl: './better-plants-preview.component.html', styleUrls: ['./better-plants-preview.component.css'] })
export class BetterPlantsPreviewComponent {
  readonly context = inject(AccountReportWorkbenchContext);
  readonly report = inject(BetterPlantsReportService);
  readonly document = computed(() => {
    const result = this.report.state(), report = this.context.report(), account = this.context.workspace.account();
    return result.state === 'ready' && result.value?.summaries && report && account
      ? buildBetterPlantsDocument(report, account, result.value.inputs.analysis.baselineYear, result.value.inputs.analysis.analysisCategory,
        result.value.summaries, this.context.workspace.facilities()) : undefined;
  });
  readonly company = computed(() => this.document()?.company);
  readonly pages = computed(() => this.document()?.pages ?? []);
}
