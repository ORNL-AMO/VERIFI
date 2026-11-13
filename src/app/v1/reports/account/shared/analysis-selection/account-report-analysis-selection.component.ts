import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AnalysisInventoryWorkspaceService } from '@app/v1/analysis/inventory/analysis-inventory-workspace.service';
import { AnalysisInventoryResultsService } from '@app/v1/analysis/inventory/analysis-inventory-results.service';
import { analysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { reportAnalysisSelectionCard } from '@app/v1/reports/shared/analysis-selection/report-analysis-selection.models';
import { REPORT_ANALYSIS_ORIGIN_QUERY } from '@app/v1/reports/shared/analysis-inspection/report-analysis-origin';
import { ReportAnalysisInspectionController } from '@app/v1/reports/shared/analysis-inspection/report-analysis-inspection-controller';
import { AccountReportWorkbenchContext } from '../../workbench/account-report-workbench-context.service';
import { ACCOUNT_ANALYSIS_EDITOR } from '../../workbench/editing/account-report-editor.service';

@Component({ selector: 'app-account-report-analysis-selection', standalone: false,
  templateUrl: './account-report-analysis-selection.component.html', styleUrls: ['./account-report-analysis-selection.component.css'],
  providers: [AnalysisInventoryResultsService] })
export class AccountReportAnalysisSelectionComponent {
  readonly sectioned = input(false);
  readonly context = inject(AccountReportWorkbenchContext);
  readonly editor = inject(ACCOUNT_ANALYSIS_EDITOR);
  readonly analyses = inject(AnalysisInventoryWorkspaceService);
  private readonly results = inject(AnalysisInventoryResultsService);
  private readonly router = inject(Router);
  private readonly selectionChanges = toSignal(this.editor.form.controls.analysis.valueChanges, { initialValue: this.editor.form.controls.analysis.value });
  readonly selectedValue = computed(() => {
    this.selectionChanges(); this.context.report(); this.editor.state();
    return this.editor.form.controls.analysis.value;
  });
  readonly showTypeFilter = computed(() => this.analyses.categories().length > 1);
  private readonly inspection = new ReportAnalysisInspectionController({
    key: this.context.key, canSelect: this.editor.canEdit,
    find: value => {
      const choice = this.context.analysisOptions().find(option => option.value === value && !option.unavailable)?.selection;
      return choice ? this.analyses.entries().find(entry => entry.scope === choice.scope && entry.card.analysis.guid === choice.analysisGuid
        && (choice.scope !== 'facility' || (entry.scope === 'facility' && entry.facility.guid === choice.facilityGuid))) : undefined;
    },
    setDemand: entries => this.results.setDemand(entries),
    select: value => this.editor.form.controls.analysis.setValue(value),
    flush: () => this.editor.flush(),
    navigate: async entry => {
      const report = this.context.report();
      if (!report) return;
      const route = entry.scope === 'facility'
        ? this.context.navigation.facilityAnalysisWorkbenchRoute(entry.facility.guid, entry.card.analysis.guid)
        : this.context.navigation.accountAnalysisWorkbenchRoute(report.accountId, entry.card.analysis.guid);
      await this.router.navigate(route, { queryParams: {
        [REPORT_ANALYSIS_ORIGIN_QUERY.accountGuid]: report.accountId,
        [REPORT_ANALYSIS_ORIGIN_QUERY.reportGuid]: report.guid
      } });
    }
  });
  readonly openingAnalysis = this.inspection.opening;
  readonly inspectedAnalysis = computed(() => {
    const entry = this.inspection.entry();
    if (!entry) return undefined;
    const outcome = this.results.states()[entry.key] ?? { state: 'loading' as const, message: 'Results not loaded' };
    return { ...entry, outcomeDisplay: analysisOutcomeDisplay(outcome, entry.card.category) };
  });
  readonly analysisCards = computed(() => this.context.analysisOptions()
    .filter(option => !option.unavailable)
    .map(option => {
      const selection = option.selection;
      const analysis = selection.scope === 'facility'
        ? this.context.workspace.facilityAnalyses().find(item => item.guid === selection.analysisGuid && item.facilityId === selection.facilityGuid)
        : this.context.workspace.accountAnalyses().find(item => item.guid === selection.analysisGuid);
      const entry = this.analyses.entries().find(item => item.scope === selection.scope && item.card.analysis.guid === selection.analysisGuid
        && (selection.scope !== 'facility' || (item.scope === 'facility' && item.facility.guid === selection.facilityGuid)));
      return reportAnalysisSelectionCard(option.value, analysis, entry?.card.status, this.analyses.statusState());
    }));
  inspectAnalysis(value: string): void { this.inspection.inspect(value); }
  closeInspection(): void { this.inspection.close(); }
  goToAnalysis(): Promise<void> { return this.inspection.goToAnalysis(); }
  selectInspectedAnalysis(): void { this.inspection.select(); }
}
