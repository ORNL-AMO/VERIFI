import { Component, DestroyRef, Input, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { UtilitySelectionMode, UtilityVisualizationSource } from '@domain/visualizations/visualization-definition';
import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { isCompositionChart } from '@domain/visualizations/visualization-composition';
import type { IconName } from '@app/v1/shared/icons/icon-registry';
import type { VisualizationSourceEditorContext } from '../../../shared/source-editor-context';
import { decisionNodeId, meterResourceChoices, meterSelectionChoices } from '../../../decisions/decision-tree';
import type { VisualizationDecisionAction } from '../../../decisions/decision-types';

@Component({ selector: 'app-utility-source-editor', standalone: false, templateUrl: './utility-source-editor.component.html',
  styleUrls: ['./utility-source-editor.component.css', '../../../shared/compact-controls.css'] })
export class UtilitySourceEditorComponent {
  private readonly store = inject(AccountWorkspaceStore);
  readonly contextState = signal<VisualizationSourceEditorContext | undefined>(undefined);
  readonly sources = computed(() => this.contextState()?.definition.sources.filter((source): source is UtilityVisualizationSource => source.kind === 'utility') ?? []);
  readonly selectedSource = computed(() => this.sources()[0]);
  readonly patterns = computed(() => this.contextState()?.definition.chart?.kind === 'monthly-patterns');
  readonly disabled = computed(() => this.contextState()?.disabled ?? true);
  readonly modes = meterSelectionChoices();
  readonly selectedMeasures = computed(() => this.sources().map(source => source.measure));
  readonly measures = [
    { value: 'energy', label: 'Energy', icon: 'energy' }, { value: 'consumption', label: 'Consumption / water', icon: 'droplet' },
    { value: 'cost', label: 'Cost', icon: 'piggyBank' }, { value: 'location-emissions', label: 'Location emissions', icon: 'location' },
    { value: 'market-emissions', label: 'Market emissions', icon: 'earth' }, { value: 'charge', label: 'Bill charge', icon: 'invoice' }
  ] as const satisfies readonly { value: UtilityVisualizationSource['measure']; label: string; icon: IconName }[];
  readonly visibleMeasures = computed(() => this.measures.filter(option => (!this.patterns() || ['energy', 'consumption', 'cost'].includes(option.value)) && ( this.store.account()?.displayEmissions
    || option.value !== 'location-emissions' && option.value !== 'market-emissions')).map(option => ({ ...option,
      selected: this.selectedMeasures().includes(option.value), disabled: this.disabled() || option.value === 'charge' && !this.chargeAvailable(),
      reason: option.value === 'charge' && !this.chargeAvailable() ? 'Bill charges require one selected meter and use bill dates separately from monthly measures.' : '' })));
  readonly measureLabel = computed(() => this.measures.filter(option => this.selectedMeasures().includes(option.value)).map(option => option.label).join(', '));
  readonly nodes = computed(() => {
    const sourceId = this.selectedSource()?.id;
    const id = (kind: 'measure' | 'selection-mode' | 'resources' | 'data-settings') => decisionNodeId({ kind, sourceId });
    return { measure: id('measure'), mode: id('selection-mode'), resources: id('resources'), settings: id('data-settings') };
  });
  readonly selected = new FormControl<string[]>([], { nonNullable: true });
  readonly aggregateByFacility = new FormControl(false, { nonNullable: true });
  readonly chargeForm = new FormGroup({ guid: new FormControl('', { nonNullable: true }), measure: new FormControl<'cost' | 'usage'>('cost', { nonNullable: true }) });
  readonly chargeSource = computed(() => this.sources().find(source => source.measure === 'charge'));
  readonly chargeMeter = computed(() => {
    const selection = this.selectedSource()?.selection;
    return selection?.kind === 'fixed' && selection.resource === 'meter' && selection.guids.length === 1
      ? this.store.meters().find(meter => meter.guid === selection.guids[0]) : undefined;
  });
  readonly chargeAvailable = computed(() => !!this.chargeMeter());
  readonly chargeOptions = computed(() => this.chargeMeter()?.charges ?? []);
  readonly choices = computed(() => {
    const source = this.selectedSource(), context = this.contextState(), snapshot = this.store.snapshot();
    return source?.selectionMode && context && snapshot ? meterResourceChoices(snapshot,
      resolveVisualizationFacilities(context.definition, snapshot.facilities).scope, source.selectionMode, source.measure)
      .map(option => ({ guid: option.value, label: option.label, icon: option.icon, detail: option.detail || (!option.available ? 'No usable readings yet' : '') })) : [];
  });
  readonly resourceLabel = computed(() => ({ source: 'Sources', group: 'Meter groups', meter: 'Meters', facility: 'Facilities', rule: 'Resources' })[this.selectedSource()?.selectionMode ?? 'meter']);
  readonly selectionLabel = computed(() => this.modes.find(mode => mode.value === this.selectedSource()?.selectionMode)?.label ?? 'Choose selection method');

  @Input({ required: true }) set context(context: VisualizationSourceEditorContext) {
    this.contextState.set(context);
    const source = this.selectedSource(); if (!source) return;
    const ids = source.selection?.kind === 'fixed' ? source.selection.guids : source.selection?.kind === 'rule' ? source.selection.filter.utilitySources ?? [] : [];
    this.selected.setValue([...ids], { emitEvent: false });
    this.aggregateByFacility.setValue(source.aggregation === 'sum' && source.groupBy === 'facility', { emitEvent: false });
    this.chargeForm.reset({ guid: this.chargeSource()?.charge?.chargeGuid ?? '', measure: this.chargeSource()?.charge?.measure ?? 'cost' }, { emitEvent: false });
    context.disabled || source.dataMode !== 'calendarized' ? this.aggregateByFacility.disable({ emitEvent: false }) : this.aggregateByFacility.enable({ emitEvent: false });
    context.disabled ? this.chargeForm.disable({ emitEvent: false }) : this.chargeForm.enable({ emitEvent: false });
  }
  constructor() {
    const destroy = inject(DestroyRef);
    this.aggregateByFacility.valueChanges.pipe(takeUntilDestroyed(destroy)).subscribe(enabled => {
      const source = this.selectedSource(); if (!source || source.dataMode !== 'calendarized') return;
      this.request({ kind: 'source-settings', sourceId: source.id, settings: { aggregation: 'sum', groupBy: enabled ? 'facility' : source.selectionMode === 'source' ? 'source' : source.selectionMode === 'group' ? 'group' : 'meter' } });
    });
    this.chargeForm.valueChanges.pipe(takeUntilDestroyed(destroy)).subscribe(() => {
      const source = this.chargeSource(), meter = this.chargeMeter(), value = this.chargeForm.getRawValue();
      if (this.contextState()) this.context = this.contextState()!;
      if (source && meter) this.request({ kind: 'source-settings', sourceId: source.id, settings: { charge: value.guid ? { meterGuid: meter.guid, chargeGuid: value.guid, measure: value.measure } : undefined } });
    });
  }
  request(action: VisualizationDecisionAction): void { if (!this.disabled()) this.contextState()?.request?.(action); }
  selectMode(mode: UtilitySelectionMode): void { const source = this.selectedSource(); if (source) this.request({ kind: 'selection-mode', sourceId: source.id, mode }); }
  selectMeasure(measure: UtilityVisualizationSource['measure']): void {
    const selected = this.selectedMeasures(), chart = this.contextState()?.definition.chart;
    const measures = this.patterns() ? measure === 'cost' ? selected.includes('cost') ? selected.filter(value => value !== 'cost') : [...selected, 'cost'] : [measure, ...selected.filter(value => value === 'cost')] : isCompositionChart(chart) || measure === 'charge' || selected.includes('charge') ? [measure] : selected.includes(measure) ? selected.filter(value => value !== measure) : [...selected, measure];
    if (measures.length) this.request({ kind: 'source-measures', sourceKind: 'utility', measures });
  }
  toggleResource(change: { readonly guid: string; readonly selected: boolean }): void {
    const source = this.selectedSource(); if (source) this.request({ kind: 'toggle-resource', sourceId: source.id, resourceId: change.guid, selected: change.selected });
  }
  setResources(resourceIds: readonly string[]): void { const source = this.selectedSource(); if (source) this.request({ kind: 'set-resources', sourceId: source.id, resourceIds }); }
  setSection(id: string, expanded: boolean): void { this.contextState()?.sectionChanged?.(id, expanded); }
}
