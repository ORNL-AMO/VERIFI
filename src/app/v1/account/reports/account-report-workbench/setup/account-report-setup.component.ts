import { Component, computed, effect, inject, signal } from '@angular/core';
import { AccountAnalysisWorkspaceService } from '@app/v1/account/analysis/account-analysis-dashboard/account-analysis-workspace.service';
import { AccountAnalysisDashboardResultsService } from '@app/v1/account/analysis/account-analysis-dashboard/account-analysis-dashboard-results.service';
import { analysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { AccountReportWorkbenchContext } from '../account-report-workbench-context.service';
import { AccountReportAutosaveService } from '../account-report-autosave.service';

@Component({ selector: 'app-account-report-setup', standalone: false,
  templateUrl: './account-report-setup.component.html', styleUrls: ['./account-report-setup.component.css'],
  providers: [AccountAnalysisDashboardResultsService] })
export class AccountReportSetupComponent {
  readonly context = inject(AccountReportWorkbenchContext);
  readonly editor = inject(AccountReportAutosaveService);
  readonly analyses = inject(AccountAnalysisWorkspaceService);
  private readonly results = inject(AccountAnalysisDashboardResultsService);
  private readonly inspection = signal<{ key: string; value: string } | undefined>(undefined);
  private readonly inspectionEntry = computed(() => {
    const target = this.inspection();
    if (!target || target.key !== this.context.key()) return undefined;
    const choice = this.context.analysisOptions().find(option => option.value === target.value && !option.unavailable)?.selection;
    return choice ? this.analyses.entries().find(entry => entry.scope === choice.scope && entry.card.analysis.guid === choice.analysisGuid
      && (choice.scope !== 'facility' || (entry.scope === 'facility' && entry.facility.guid === choice.facilityGuid))) : undefined;
  });
  readonly inspectedAnalysis = computed(() => {
    const entry = this.inspectionEntry();
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
      return {
        value: option.value,
        name: analysis?.name || 'Untitled analysis',
        category: analysis?.analysisCategory === 'water' ? 'Water' : 'Energy',
        baseline: analysis?.baselineYear ?? 'Not set'
      };
    }));

  constructor() {
    effect(() => {
      const entry = this.inspectionEntry();
      this.results.setDemand(entry ? [entry] : []);
    });
  }

  inspectAnalysis(value: string): void {
    if (this.context.analysisOptions().some(option => option.value === value && !option.unavailable)) {
      this.inspection.set({ key: this.context.key(), value });
    }
  }

  closeInspection(): void { this.inspection.set(undefined); }

  selectInspectedAnalysis(): void {
    const target = this.inspection();
    if (!this.editor.canEdit() || !target || !this.inspectionEntry()) return;
    this.editor.form.controls.analysis.setValue(target.value);
    this.closeInspection();
  }
}
