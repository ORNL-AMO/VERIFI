import { Component, computed, effect, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { AnalysisInventoryWorkspaceService } from '@app/v1/analysis/inventory/analysis-inventory-workspace.service';
import { AnalysisInventoryResultsService } from '@app/v1/analysis/inventory/analysis-inventory-results.service';
import { analysisOutcomeDisplay } from '@app/v1/shared/analysis-results/analysis-outcome-summary';
import { reportAnalysisSelectionCard } from '@app/v1/reports/shared/analysis-selection/report-analysis-selection.models';
import { ReportAnalysisInspectionController } from '@app/v1/reports/shared/analysis-inspection/report-analysis-inspection-controller';
import { REPORT_ANALYSIS_ORIGIN_QUERY } from '@app/v1/reports/shared/analysis-inspection/report-analysis-origin';
import { DataQualityReportEditor } from '../editing/data-quality-report-editor.service';
import { DATA_QUALITY_CONTENT_GROUPS, DATA_QUALITY_CONTENT_PRESETS, DataQualityContentPresetId,
  dataQualityContentPresetChanges, matchingDataQualityContentPreset } from './data-quality-report-content';

type SourceKind = 'meter' | 'predictor';
interface SourceChoice { readonly guid: string; readonly name: string; readonly selected: boolean; }

@Component({
  selector: 'app-data-quality-report-setup', standalone: false,
  templateUrl: './data-quality-report-setup.component.html', styleUrls: ['./data-quality-report-setup.component.css'],
  providers: [AnalysisInventoryResultsService]
})
export class DataQualityReportSetupComponent {
  readonly editor = inject(DataQualityReportEditor);
  readonly context = this.editor.context;
  readonly inventories = inject(AnalysisInventoryWorkspaceService);
  private readonly outcomes = inject(AnalysisInventoryResultsService);
  private readonly router = inject(Router);
  readonly entries = computed(() => this.inventories.entries().filter(entry => entry.scope === 'facility'
    && entry.facility.guid === this.context.report()?.facilityId && ['energy', 'water'].includes(entry.card.analysis.analysisCategory)));
  readonly analysisCards = computed(() => this.entries()
    .map(entry => reportAnalysisSelectionCard(entry.card.analysis.guid, entry.card.analysis, entry.card.status, this.inventories.statusState())));
  readonly showTypeFilter = computed(() => new Set(this.analysisCards().map(card => card.categoryValue)).size > 1);
  readonly meterChoices = computed(() => this.sourceChoices('meter'));
  readonly predictorChoices = computed(() => this.sourceChoices('predictor'));
  readonly contentGroups = DATA_QUALITY_CONTENT_GROUPS;
  readonly contentPresets = DATA_QUALITY_CONTENT_PRESETS;
  readonly presetControl = new FormControl<DataQualityContentPresetId | 'custom'>('custom', { nonNullable: true });
  readonly selectedPreset = computed(() => matchingDataQualityContentPreset(this.editor.draft().settings));
  readonly unavailableAnalysis = computed(() => this.editor.draft().settings.selectedMode === 'analysis'
    && !!this.editor.draft().settings.selectedAnalysisItemId && !this.editor.selection().analysis);
  private readonly inspection = new ReportAnalysisInspectionController({
    key: this.context.key, canSelect: this.editor.canEdit,
    find: guid => this.editor.draft().settings.selectedMode === 'analysis'
      ? this.entries().find(entry => entry.card.analysis.guid === guid) : undefined,
    setDemand: entries => this.outcomes.setDemand(entries),
    select: guid => this.editor.form.controls.settings.controls.selectedAnalysisItemId.setValue(guid),
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

  constructor() {
    effect(() => {
      this.context.key();
      this.presetControl.setValue(this.selectedPreset()?.id ?? 'custom', { emitEvent: false });
    });
    effect(() => {
      if (this.editor.canEdit()) this.presetControl.enable({ emitEvent: false });
      else this.presetControl.disable({ emitEvent: false });
    });
    this.presetControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(preset => {
      if (preset === 'custom' || !this.editor.canEdit()) return;
      const settings = this.editor.form.controls.settings;
      // Apply summary switches and their children together, bypassing individual parent-toggle handlers.
      settings.patchValue(dataQualityContentPresetChanges(preset), { emitEvent: false });
      settings.updateValueAndValidity();
    });
  }
  inspect(guid: string): void { this.inspection.inspect(guid); }
  closeInspection(): void { this.inspection.close(); }
  selectInspected(): void { this.inspection.select(); }
  goToAnalysis(): Promise<void> { return this.inspection.goToAnalysis(); }
  toggleSource(kind: SourceKind, guid: string): void {
    if (!this.editor.canEdit() || this.editor.draft().settings.selectedMode !== 'manual') return;
    const choices = kind === 'meter' ? this.meterChoices() : this.predictorChoices();
    if (!choices.some(choice => choice.guid === guid)) return;
    const fields = this.editor.form.controls.settings.controls;
    const control = kind === 'meter' ? fields.selectedMeterIds : fields.selectedPredictorIds;
    if (control.disabled) return;
    const available = new Set(choices.map(choice => choice.guid));
    const selected = control.value.filter(id => available.has(id));
    control.setValue(selected.includes(guid) ? selected.filter(id => id !== guid) : [...selected, guid]);
  }
  private sourceChoices(kind: SourceKind): SourceChoice[] {
    const report = this.context.report(), settings = this.editor.draft().settings;
    const items = kind === 'meter' ? this.context.workspace.meters() : this.context.workspace.predictors();
    const selected = new Set(kind === 'meter' ? settings.selectedMeterIds : settings.selectedPredictorIds);
    return items.filter(item => item.accountId === report?.accountId && item.facilityId === report?.facilityId)
      .sort((first, second) => first.name.localeCompare(second.name) || first.guid.localeCompare(second.guid))
      .map(item => ({ guid: item.guid, name: item.name, selected: selected.has(item.guid) }));
  }
}
