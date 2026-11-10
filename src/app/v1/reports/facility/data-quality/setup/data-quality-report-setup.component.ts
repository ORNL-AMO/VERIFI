import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormControl, FormRecord } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AnalysisInventoryWorkspaceService } from '@app/v1/analysis/inventory/analysis-inventory-workspace.service';
import { reportAnalysisSelectionCard } from '@app/v1/reports/shared/analysis-selection/report-analysis-selection.models';
import { DataQualityReportEditor } from '../editing/data-quality-report-editor.service';
import { DATA_QUALITY_CONTENT_GROUPS, DATA_QUALITY_CONTENT_PRESETS, DataQualityContentPresetId,
  dataQualityContentPresetChanges, matchingDataQualityContentPreset } from './data-quality-report-content';

interface SourceChoice { readonly guid: string; readonly name: string; readonly control: FormControl<boolean>; }

@Component({
  selector: 'app-data-quality-report-setup', standalone: false,
  templateUrl: './data-quality-report-setup.component.html', styleUrls: ['./data-quality-report-setup.component.css']
})
export class DataQualityReportSetupComponent {
  readonly editor = inject(DataQualityReportEditor);
  readonly context = this.editor.context;
  private readonly inventories = inject(AnalysisInventoryWorkspaceService);
  readonly analysisCards = computed(() => this.inventories.entries().filter(entry => entry.scope === 'facility'
    && entry.facility.guid === this.context.report()?.facilityId && ['energy', 'water'].includes(entry.card.analysis.analysisCategory))
    .map(entry => reportAnalysisSelectionCard(entry.card.analysis.guid, entry.card.analysis, entry.card.status, this.inventories.statusState())));
  readonly showTypeFilter = computed(() => new Set(this.analysisCards().map(card => card.categoryValue)).size > 1);
  readonly meterForm = new FormRecord<FormControl<boolean>>({});
  readonly predictorForm = new FormRecord<FormControl<boolean>>({});
  readonly meterChoices = signal<readonly SourceChoice[]>([]);
  readonly predictorChoices = signal<readonly SourceChoice[]>([]);
  readonly contentGroups = DATA_QUALITY_CONTENT_GROUPS;
  readonly contentPresets = DATA_QUALITY_CONTENT_PRESETS;
  readonly presetControl = new FormControl<DataQualityContentPresetId | 'custom'>('custom', { nonNullable: true });
  readonly selectedPreset = computed(() => matchingDataQualityContentPreset(this.editor.draft().settings));
  readonly unavailableAnalysis = computed(() => this.editor.draft().settings.selectedMode === 'analysis'
    && !!this.editor.draft().settings.selectedAnalysisItemId && !this.editor.selection().analysis);

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
    effect(() => {
      const report = this.context.report(), draft = this.editor.draft().settings, canEdit = this.editor.canEdit();
      const owned = (item: { accountId: string; facilityId: string }) => item.accountId === report?.accountId && item.facilityId === report?.facilityId;
      this.meterChoices.set(this.syncChoices(this.meterForm, this.context.workspace.meters().filter(owned), draft.selectedMeterIds, canEdit));
      this.predictorChoices.set(this.syncChoices(this.predictorForm, this.context.workspace.predictors().filter(owned), draft.selectedPredictorIds, canEdit));
    });
    this.meterForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(values => {
      if (!this.editor.canEdit()) return;
      this.editor.form.controls.settings.controls.selectedMeterIds.setValue([
        ...Object.keys(values).filter(id => values[id]), ...this.editor.selection().missingMeterIds
      ]);
    });
    this.predictorForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(values => {
      if (!this.editor.canEdit()) return;
      this.editor.form.controls.settings.controls.selectedPredictorIds.setValue([
        ...Object.keys(values).filter(id => values[id]), ...this.editor.selection().missingPredictorIds
      ]);
    });
  }
  toggleSource(choice: SourceChoice): void {
    if (!this.editor.canEdit() || choice.control.disabled) return;
    choice.control.setValue(!choice.control.value);
  }
  private syncChoices(form: FormRecord<FormControl<boolean>>, items: readonly { guid: string; name: string }[], selected: readonly string[], enabled: boolean): SourceChoice[] {
    const ids = new Set(items.map(item => item.guid));
    for (const id of Object.keys(form.controls)) if (!ids.has(id)) form.removeControl(id, { emitEvent: false });
    for (const item of items) {
      if (!form.controls[item.guid]) form.addControl(item.guid, new FormControl(false, { nonNullable: true }), { emitEvent: false });
      form.controls[item.guid].setValue(selected.includes(item.guid), { emitEvent: false });
    }
    if (enabled) form.enable({ emitEvent: false }); else form.disable({ emitEvent: false });
    return [...items].sort((first, second) => first.name.localeCompare(second.name) || first.guid.localeCompare(second.guid))
      .map(item => ({ guid: item.guid, name: item.name, control: form.controls[item.guid] }));
  }
}
