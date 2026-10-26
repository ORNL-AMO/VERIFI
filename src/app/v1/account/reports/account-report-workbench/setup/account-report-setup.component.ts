import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup } from '@angular/forms';
import { AccountAnalysisWorkspaceService } from '@app/v1/account/analysis/account-analysis-dashboard/account-analysis-workspace.service';
import { AccountAnalysisDashboardResultsService } from '@app/v1/account/analysis/account-analysis-dashboard/account-analysis-dashboard-results.service';
import { analysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { analysisInventoryStatusLabel } from '@app/v1/shared/analysis-inventory/analysis-inventory.models';
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
  readonly analysisFilters = new FormGroup({
    category: new FormControl<'all' | 'energy' | 'water'>('all', { nonNullable: true }),
    baselineYear: new FormControl<number | null>(null)
  });
  private readonly filterChanges = toSignal(this.analysisFilters.valueChanges, { initialValue: this.analysisFilters.getRawValue() });
  private readonly selectionChanges = toSignal(this.editor.form.controls.analysis.valueChanges, { initialValue: this.editor.form.controls.analysis.value });
  readonly showTypeFilter = computed(() => this.analyses.categories().length > 1);
  private readonly filters = computed(() => {
    const filters = this.filterChanges();
    return { category: this.showTypeFilter() ? filters.category ?? 'all' : 'all', baselineYear: filters.baselineYear ?? null };
  });
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
      const entry = this.analyses.entries().find(item => item.scope === selection.scope && item.card.analysis.guid === selection.analysisGuid
        && (selection.scope !== 'facility' || (item.scope === 'facility' && item.facility.guid === selection.facilityGuid)));
      const evaluation = this.analyses.statusState();
      const status = evaluation === 'ready' ? entry?.card.status ?? 'evaluating' : 'evaluating';
      return {
        value: option.value,
        name: analysis?.name || 'Untitled analysis',
        category: analysis?.analysisCategory === 'water' ? 'Water' : 'Energy',
        categoryValue: analysis?.analysisCategory,
        baselineYear: analysis?.baselineYear,
        baseline: analysis?.baselineYear ?? 'Not set',
        statusLabel: analysisInventoryStatusLabel(status, evaluation),
        statusTone: status === 'ready' ? 'success' : status === 'error' ? 'danger' : status === 'warning' ? 'warning' : 'neutral',
        statusIcon: status === 'evaluating' ? evaluation === 'error' ? 'info' as const : 'loading' as const
          : status === 'ready' ? 'success' as const : 'warning' as const
      };
    }));
  readonly baselineYears = computed(() => [...new Set(this.analysisCards().flatMap(card =>
    Number.isInteger(card.baselineYear) ? [card.baselineYear!] : []))].sort((a, b) => b - a));
  readonly filteredAnalysisCards = computed(() => {
    const filters = this.filters();
    return this.analysisCards().filter(card => (filters.category === 'all' || card.categoryValue === filters.category)
      && (filters.baselineYear === null || card.baselineYear === filters.baselineYear));
  });
  readonly filtersActive = computed(() => this.filters().category !== 'all' || this.filters().baselineYear !== null);
  readonly hiddenSelectedAnalysis = computed(() => {
    this.selectionChanges(); this.context.report(); this.editor.state();
    const selected = this.analysisCards().find(card => card.value === this.editor.form.controls.analysis.value);
    return selected && !this.filteredAnalysisCards().some(card => card.value === selected.value) ? selected : undefined;
  });

  constructor() {
    effect(() => {
      this.context.key();
      this.clearAnalysisFilters();
    });
    effect(() => {
      const entry = this.inspectionEntry();
      this.results.setDemand(entry ? [entry] : []);
    });
  }

  clearAnalysisFilters(): void { this.analysisFilters.reset({ category: 'all', baselineYear: null }); }

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
