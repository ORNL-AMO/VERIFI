import { energyUseSelectionMode, selectedEnergyUseIds } from '@domain/visualizations/energy-use/equipment-selection';
import type { EnergyUseSelectionMode } from '@domain/visualizations/visualization-definition';
import { Component, Input, computed, effect, inject, signal, DestroyRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { energy } from '@domain/calculations/conversions/definitions/energy';
import { equipmentChartSupport, useEquipmentHistorySettings } from '@domain/visualizations/energy-use/equipment-source';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { decisionNodeId } from '../../decisions/decision-tree';
import { energyUseSelectionChoices, equipmentResourceChoices, projectEquipmentItems } from '../equipment-items';
import type { VisualizationSourceEditorContext } from '../../shared/source-editor-context';
import { visualizationIntentEqual } from '../../editing/visualization-reconciliation';

@Component({ selector: 'app-equipment-source-editor', standalone: false,
  templateUrl: './equipment-source-editor.component.html', styleUrls: ['../../shared/compact-controls.css', './equipment-source-editor.component.css'] })
export class EquipmentSourceEditorComponent {
  readonly contextState = signal<VisualizationSourceEditorContext | undefined>(undefined);
  readonly selected = new FormControl<string[]>([], { nonNullable: true });
  readonly unit = new FormControl('', { nonNullable: true });
  readonly historySettings = new FormControl(false, { nonNullable: true });
  private manualSettings = false;
  private historyIdentity = '';
  readonly units = [...Object.keys(energy.metric), ...Object.keys(energy.imperial)];
  readonly modes = energyUseSelectionChoices();
  readonly mode = computed(() => this.source() ? energyUseSelectionMode(this.source()!) : undefined);
  readonly modeLabel = computed(() => this.modes.find(mode => mode.value === this.mode())?.label ?? 'Choose a selection method');
  readonly nodes = computed(() => { const sourceId = this.contextState()?.sourceId; return { mode: decisionNodeId({ kind: 'selection-mode', sourceId }), resources: decisionNodeId({ kind: 'resources', sourceId }), settings: decisionNodeId({ kind: 'data-settings', sourceId }) }; });
  readonly emptyNodes: ReadonlySet<string> = new Set();
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly destroy = inject(DestroyRef);
  @Input({ required: true }) set context(context: VisualizationSourceEditorContext) {
    this.contextState.set(context);
    for (const control of [this.selected, this.unit, this.historySettings]) context.disabled ? control.disable({ emitEvent: false }) : control.enable({ emitEvent: false });
  }
  readonly source = computed(() => {
    const context = this.contextState(), source = context?.definition.sources.find(s => s.id === context.sourceId);
    return source?.kind === 'energy-use' ? source : undefined;
  });
  readonly unsupported = computed(() => {
    const context = this.contextState(), source = this.source();
    return source && context?.definition.chart ? equipmentChartSupport(source, context.definition.chart).state === 'unsupported' : true;
  });
  readonly historySettingsApplied = computed(() => {
    const context = this.contextState();
    return !!context && !!this.source() && visualizationIntentEqual(context.definition, useEquipmentHistorySettings(context.definition, context.sourceId));
  });
  readonly savedUnit = computed(() => this.source()?.settings?.unit);
  readonly items = computed(() => {
    const snapshot = this.workspace.snapshot(), context = this.contextState();
    return snapshot && context ? projectEquipmentItems(context.definition, context.sourceId, snapshot).map(item => ({ ...item,
      resetKey: context.nodeResetKeys?.[decisionNodeId({ kind: 'item', sourceId: context.sourceId, itemKey: item.key })] ?? 0 })) : [];
  });
  readonly choices = computed(() => {
    const snapshot = this.workspace.snapshot(), context = this.contextState();
    if (!snapshot || !context || !this.mode()) return [];
    return equipmentResourceChoices(snapshot, resolveVisualizationFacilities(context.definition, snapshot.facilities).scope, this.mode())
      .map(choice => ({ guid: choice.value, label: choice.label, icon: choice.icon, detail: choice.detail }));
  });
  constructor() {
    effect(() => {
      const source = this.source();
      this.selected.setValue(source ? [...selectedEnergyUseIds(source)] : []);
      this.unit.setValue(source?.settings?.unit?.kind === 'pinned' ? source.settings.unit.value : '', { emitEvent: false });
      const context = this.contextState();
      const identity = JSON.stringify([context?.editorKey, context?.sourceId, context?.resetKey]);
      if (identity !== this.historyIdentity) { this.historyIdentity = identity; this.manualSettings = false; }
      this.historySettings.setValue(this.historySettingsApplied() && !this.manualSettings, { emitEvent: false });
    });
    this.historySettings.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(enabled => {
      const context = this.contextState();
      if (!context || context.disabled) return;
      this.manualSettings = !enabled;
      // Stay with the current configuration while the host reviews a preset change.
      this.historySettings.setValue(enabled && this.historySettingsApplied(), { emitEvent: false });
      if (enabled && !this.historySettingsApplied()) this.useDefaults();
    });
    this.unit.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(value => {
      const context = this.contextState();
      if (context && !context.disabled) context.request?.({ kind: 'equipment-unit', sourceId: context.sourceId,
        unit: value ? { kind: 'pinned', value } : { kind: 'owner' } });
    });
  }
  setSelection(equipmentGuids: readonly string[]): void {
    const context = this.contextState();
    if (context && !context.disabled) context.request?.({ kind: 'energy-use-resources', sourceId: context.sourceId, ids: equipmentGuids });
  }
  toggleSelection(change: { readonly guid: string; readonly selected: boolean }): void {
    this.setSelection(change.selected ? [...this.selected.value, change.guid] : this.selected.value.filter(guid => guid !== change.guid));
  }
  selectMode(mode: EnergyUseSelectionMode): void {
    const context = this.contextState();
    if (context && !context.disabled) context.request?.({ kind: 'energy-use-selection-mode', sourceId: context.sourceId, mode });
  }
  setSection(id: string, expanded: boolean): void { this.contextState()?.sectionChanged?.(id, expanded); }
  useDefaults(): void {
    const context = this.contextState();
    if (context && !context.disabled) context.request?.({ kind: 'equipment-defaults', sourceId: context.sourceId });
  }
}
