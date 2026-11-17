import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AnalysisInventoryWorkspaceService } from '@app/v1/analysis/inventory/analysis-inventory-workspace.service';
import { AnalysisInventoryResultsService } from '@app/v1/analysis/inventory/analysis-inventory-results.service';
import { analysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { reportAnalysisSelectionCard } from '@app/v1/reports/shared/analysis-selection/report-analysis-selection.models';
import { ReportAnalysisInspectionController } from '@app/v1/reports/shared/analysis-inspection/report-analysis-inspection-controller';
import { REPORT_ANALYSIS_ORIGIN_QUERY } from '@app/v1/reports/shared/analysis-inspection/report-analysis-origin';
import { ModelingReportEditor } from '../editing/modeling-report-editor.service';

@Component({ selector: 'app-modeling-report-setup', standalone: false,
  templateUrl: './modeling-report-setup.component.html', styleUrls: ['./modeling-report-setup.component.css'],
  providers: [AnalysisInventoryResultsService] })
export class ModelingReportSetupComponent {
  readonly editor = inject(ModelingReportEditor);
  readonly context = this.editor.context;
  readonly inventories = inject(AnalysisInventoryWorkspaceService);
  private readonly outcomes = inject(AnalysisInventoryResultsService);
  private readonly router = inject(Router);
  readonly entries = computed(() => this.inventories.entries().filter(entry => entry.scope === 'facility'
    && entry.facility.guid === this.context.facility()?.guid));
  readonly cards = computed(() => this.entries().map(entry => reportAnalysisSelectionCard(
    entry.card.analysis.guid, entry.card.analysis, entry.card.status, this.inventories.statusState())));
  readonly showCategory = computed(() => new Set(this.entries().map(entry => entry.card.analysis.analysisCategory)).size > 1);
  readonly unavailableSelection = computed(() => !!this.editor.draft().analysis && !this.editor.selectedAnalysis());
  readonly retainedYear = computed(() => this.editor.draft().settings.reportYear !== null
    && !this.editor.periods().includes(this.editor.draft().settings.reportYear!));
  readonly unavailableYear = computed(() => this.editor.periodsCurrent() && this.retainedYear());
  readonly content = [
    { key: 'includeIssuesSummary', label: 'Issues Summary' },
    { key: 'includeExecutiveSummary', label: 'Executive Summary' },
    { key: 'includeDataValidationTables', label: 'Data Validation Tables' }
  ] as const;
  private readonly inspection = new ReportAnalysisInspectionController({
    key: this.context.key, canSelect: this.editor.canEdit,
    find: guid => this.entries().find(entry => entry.card.analysis.guid === guid),
    setDemand: entries => this.outcomes.setDemand(entries),
    select: (_value, entry) => this.editor.form.controls.analysis.setValue(entry.card.analysis.guid),
    flush: () => this.editor.flush(),
    navigate: async entry => {
      const report = this.context.report();
      if (!report || entry.scope !== 'facility') return;
      await this.router.navigate(this.context.navigation.facilityAnalysisWorkbenchRoute(entry.facility.guid, entry.card.analysis.guid), { queryParams: {
        [REPORT_ANALYSIS_ORIGIN_QUERY.accountGuid]: report.accountId, [REPORT_ANALYSIS_ORIGIN_QUERY.reportGuid]: report.guid,
        [REPORT_ANALYSIS_ORIGIN_QUERY.scope]: 'facility', [REPORT_ANALYSIS_ORIGIN_QUERY.facilityGuid]: report.facilityId
      } });
    }
  });
  readonly openingAnalysis = this.inspection.opening;
  readonly inspected = computed(() => {
    const entry = this.inspection.entry();
    return entry ? { ...entry, outcomeDisplay: analysisOutcomeDisplay(this.outcomes.states()[entry.key]
      ?? { state: 'loading', message: 'Results not loaded' }, entry.card.category) } : undefined;
  });
  inspect(guid: string): void { this.inspection.inspect(guid); }
  closeInspection(): void { this.inspection.close(); }
  selectInspected(): void { this.inspection.select(); }
  goToAnalysis(): Promise<void> { return this.inspection.goToAnalysis(); }
}
