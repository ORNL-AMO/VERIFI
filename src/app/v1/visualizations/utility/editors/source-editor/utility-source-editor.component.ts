import { resolveVisualizationFacilities } from '@domain/visualizations/visualization-facilities';
import { Component, DestroyRef, Input, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { UtilityVisualizationSource, VisualizationDefinition, VisualizationSeries, VisualizationSeriesOverride } from '@domain/visualizations/visualization-definition';
import { utilityMeasureKey } from '@domain/visualizations/utility/utility-selection';
import type { UtilityEditorContext } from '../utility-editor-context';
import { EnergyUnitOptions, VolumeLiquidOptions, VolumeGasOptions, MassUnitOptions } from '@shared/unitOptions';

export interface UtilitySourceFormValue {
  measure: UtilityVisualizationSource['measure'];
  mode: 'sources' | 'meters' | 'groups' | 'facilities' | 'rule';
  guids: string[];
  facilityGuids: string[];
  groupGuids: string[];
  utilitySources: string[];
  search: string;
  includeRetired: boolean;
  dataMode: UtilityVisualizationSource['dataMode'];
  aggregation: UtilityVisualizationSource['aggregation'];
  groupBy: UtilityVisualizationSource['groupBy'];
  unitBinding: 'owner' | 'pinned';
  unit: string;
  treatmentBinding: 'owner' | 'pinned';
  treatment: 'site' | 'source';
  chargeMeter: string;
  chargeGuid: string;
  chargeMeasure: 'cost' | 'usage';
}

export function utilitySourceFormValue(source: UtilityVisualizationSource): UtilitySourceFormValue {
  const selection = source.selection;
  return { measure: source.measure, mode: source.selectionMode === 'source' ? 'sources' : selection?.kind === 'rule' ? 'rule' : selection?.resource === 'meter-group' ? 'groups'
    : selection?.resource === 'facility' ? 'facilities' : 'meters', guids: selection?.kind === 'fixed' ? [...selection.guids] : [],
    facilityGuids: selection?.kind === 'rule' ? [...selection.filter.facilityGuids ?? []] : [],
    groupGuids: selection?.kind === 'rule' ? [...selection.filter.groupGuids ?? []] : [],
    utilitySources: selection?.kind === 'rule' ? [...selection.filter.utilitySources ?? []] : [],
    search: selection?.kind === 'rule' ? selection.filter.search ?? '' : '',
    includeRetired: selection?.kind !== 'rule' || selection.filter.includeRetired !== false,
    dataMode: source.dataMode, aggregation: source.aggregation, groupBy: source.groupBy,
    unitBinding: source.settings?.unit?.kind ?? 'owner', unit: source.settings?.unit?.kind === 'pinned' ? source.settings.unit.value : '',
    treatmentBinding: source.settings?.energyTreatment?.kind ?? 'owner',
    treatment: source.settings?.energyTreatment?.kind === 'pinned' ? source.settings.energyTreatment.value : 'site',
    chargeMeter: source.charge?.meterGuid ?? '', chargeGuid: source.charge?.chargeGuid ?? '', chargeMeasure: source.charge?.measure ?? 'cost' };
}

export function utilitySourceFormIssue(value: UtilitySourceFormValue): string | undefined {
  if (['energy', 'consumption', 'location-emissions', 'market-emissions'].includes(value.measure)
    && value.unitBinding === 'pinned' && !value.unit.trim()) return 'Enter a pinned unit or follow the owner setting.';
  if (value.measure === 'charge' && (!!value.chargeMeter !== !!value.chargeGuid)) return 'Choose both the owning meter and a named charge, or clear both to leave setup incomplete.';
  return undefined;
}

/** Only explicit user edits normalize mode-dependent settings; hydration retains saved intent. */
export function applyUtilitySourceForm(definition: VisualizationDefinition, sourceId: string, value: UtilitySourceFormValue): VisualizationDefinition {
  const original = definition.sources.find(source => source.id === sourceId);
  if (original?.kind !== 'utility' || utilitySourceFormIssue(value)) return definition;
  const measureChanged = original.measure !== value.measure;
  const modeChanged = original.dataMode !== value.dataMode || measureChanged && value.measure === 'charge';
  const native = value.measure === 'charge' || value.dataMode === 'billing-period';
  const settings = measureChanged ? {} : { ...original.settings };
  if (['energy', 'consumption', 'location-emissions', 'market-emissions'].includes(value.measure)) {
    settings.unit = value.unitBinding === 'owner' ? { kind: 'owner' } : { kind: 'pinned', value: value.unit.trim() };
  } else if (measureChanged) delete settings.unit;
  if (value.measure === 'energy') settings.energyTreatment = value.treatmentBinding === 'owner' ? { kind: 'owner' }
    : { kind: 'pinned', value: value.treatment };
  else if (measureChanged) delete settings.energyTreatment;
  const { charge: _charge, selection: _selection, ...base } = original;
  const charge = value.measure === 'charge' && value.chargeMeter && value.chargeGuid
    ? { meterGuid: value.chargeMeter, chargeGuid: value.chargeGuid, measure: value.chargeMeasure } : undefined;
  const selection: UtilityVisualizationSource['selection'] = charge ? { kind: 'fixed', resource: 'meter', guids: [charge.meterGuid] }
    : value.mode === 'sources' ? value.utilitySources.length ? { kind: 'rule', resource: 'meter', filter: { utilitySources: value.utilitySources } } : undefined
    : value.mode === 'rule' ? { kind: 'rule', resource: 'meter', filter: {
      ...(value.facilityGuids.length ? { facilityGuids: value.facilityGuids } : {}),
      ...(value.groupGuids.length ? { groupGuids: value.groupGuids } : {}),
      ...(value.utilitySources.length ? { utilitySources: value.utilitySources } : {}),
      ...(value.search.trim() ? { search: value.search.trim() } : {}), includeRetired: value.includeRetired } }
    : { kind: 'fixed', resource: value.mode === 'groups' ? 'meter-group' : value.mode === 'facilities' ? 'facility' : 'meter', guids: value.guids };
  const source: UtilityVisualizationSource = { ...base, measure: value.measure, ...(selection ? { selection } : {}), selectionMode: charge ? 'meter' : value.mode === 'sources' ? 'source' : value.mode === 'rule' ? 'rule' : value.mode === 'groups' ? 'group' : value.mode === 'facilities' ? 'facility' : 'meter',
    dataMode: native ? 'billing-period' : 'calendarized', aggregation: native ? 'none' : value.aggregation,
    groupBy: native || value.aggregation === 'none' ? 'meter' : value.groupBy, settings, ...(charge ? { charge } : {}) };
  const metric = utilityMeasureKey(source);
  let series = definition.series.filter(item => item.sourceId !== sourceId || item.metric === metric);
  const groupingChanged = original.groupBy !== source.groupBy;
  const selectionChanged = JSON.stringify(original.selection) !== JSON.stringify(source.selection);
  const ownSeries = series.filter(item => item.sourceId === sourceId);
  if (ownSeries.length && (groupingChanged || selectionChanged)) {
    // Explicitly selecting a new resource set must not leave an old exact-series
    // anchor impossible to edit. Preserve same-kind appearance as dormant overrides.
    const wildcard = ownSeries.find(item => !item.resourceGuid);
    const basis: VisualizationSeries = wildcard ?? { id: ownSeries[0].id, sourceId, metric, axis: ownSeries[0].axis };
    const { overrides: priorOverrides, ...shared } = basis;
    const overrides: readonly VisualizationSeriesOverride[] = groupingChanged ? [] : [...priorOverrides ?? [], ...ownSeries.filter(item => !!item.resourceGuid).map((item, index) => ({
      resourceGuid: item.resourceGuid!, accountGuid: definition.accountGuid, axis: item.axis, ...(wildcard ? {} : { order: index }),
      ...(item.label ? { label: item.label } : {}), ...(item.color ? { color: item.color } : {}),
      ...(item.lineStyle ? { lineStyle: item.lineStyle } : {}), ...(item.visible !== undefined ? { visible: item.visible } : {})
    }))];
    const unique = [...new Map(overrides.map(item => [JSON.stringify([item.accountGuid ?? definition.accountGuid, item.resourceGuid !== undefined ? 'resource' : 'series', item.resourceGuid ?? item.seriesId]), item])).values()];
    const replacement = { ...shared, ...(unique.length ? { overrides: unique } : {}) };
    const firstIndex = series.findIndex(item => item.sourceId === sourceId);
    series = series.filter(item => item.sourceId !== sourceId); series.splice(firstIndex, 0, replacement);
  }
  if (!series.some(item => item.sourceId === sourceId)) {
    let id = `${sourceId}-series`, suffix = 1;
    while (series.some(item => item.id === id)) id = `${sourceId}-series-${suffix++}`;
    series.push({ id, sourceId, metric, axis: 'left' });
  }
  const chart = modeChanged && definition.chart?.kind === 'time-series'
    ? { ...definition.chart, interval: native ? 'native' as const : 'monthly' as const } : definition.chart;
  return { ...definition, sources: definition.sources.map(item => item.id === sourceId ? source : item), series, ...(chart ? { chart } : {}) };
}

@Component({ selector: 'app-utility-source-editor', standalone: false, templateUrl: './utility-source-editor.component.html',
  styleUrls: ['./utility-source-editor.component.css'] })
export class UtilitySourceEditorComponent {
  private readonly store = inject(AccountWorkspaceStore);
  private readonly destroy = inject(DestroyRef);
  private readonly contextValue = signal<UtilityEditorContext | undefined>(undefined);
  private identity = '';
  private savedFingerprint = '';
  private previous?: UtilitySourceFormValue;
  readonly conflict = signal(false);
  readonly disabled = computed(() => this.contextValue()?.disabled ?? true);
  readonly form = new FormGroup({
    measure: new FormControl<UtilitySourceFormValue['measure']>('energy', { nonNullable: true }),
    mode: new FormControl<UtilitySourceFormValue['mode']>('meters', { nonNullable: true }),
    guids: new FormControl<string[]>([], { nonNullable: true }), facilityGuids: new FormControl<string[]>([], { nonNullable: true }),
    groupGuids: new FormControl<string[]>([], { nonNullable: true }), utilitySources: new FormControl<string[]>([], { nonNullable: true }),
    search: new FormControl('', { nonNullable: true }), includeRetired: new FormControl(true, { nonNullable: true }),
    dataMode: new FormControl<UtilitySourceFormValue['dataMode']>('calendarized', { nonNullable: true }),
    aggregation: new FormControl<UtilitySourceFormValue['aggregation']>('sum', { nonNullable: true }),
    groupBy: new FormControl<UtilitySourceFormValue['groupBy']>('meter', { nonNullable: true }),
    unitBinding: new FormControl<'owner' | 'pinned'>('owner', { nonNullable: true }), unit: new FormControl('', { nonNullable: true }),
    treatmentBinding: new FormControl<'owner' | 'pinned'>('owner', { nonNullable: true }),
    treatment: new FormControl<'site' | 'source'>('site', { nonNullable: true }),
    chargeMeter: new FormControl('', { nonNullable: true }), chargeGuid: new FormControl('', { nonNullable: true }),
    chargeMeasure: new FormControl<'cost' | 'usage'>('cost', { nonNullable: true })
  }, { validators: control => utilitySourceFormIssue(control.getRawValue() as UtilitySourceFormValue) ? { utilitySetup: true } : null });
  readonly value = signal(this.form.getRawValue());
  readonly issue = computed(() => utilitySourceFormIssue(this.value()));
  readonly selectedSource = computed(() => this.contextValue()?.definition.sources.find(source => source.id === this.contextValue()?.sourceId));
  readonly ownerResources = computed(() => {
    const context = this.contextValue();
    const scope = context ? resolveVisualizationFacilities(context.definition, this.store.facilities()).scope : undefined;
    const accountGuid = context?.definition.accountGuid;
    const eligible = (item: { accountId: string; facilityId?: string }) => item.accountId === accountGuid
      && !!item.facilityId && !!scope?.facilityGuids.includes(item.facilityId);
    return { meters: this.store.meters().filter(eligible), groups: this.store.meterGroups().filter(eligible),
      facilities: this.store.facilities().filter(item => item.accountId === accountGuid && !!scope?.facilityGuids.includes(item.guid)) };
  });
  readonly options = computed(() => {
    const value = this.value(), resources = this.ownerResources();
    const owners = new Map(resources.facilities.map(item => [item.guid, item.name]));
    const records = value.mode === 'groups' ? resources.groups : value.mode === 'facilities' ? resources.facilities : resources.meters;
    return withMissing(records.map(item => ({ guid: item.guid, label: ('facilityId' in item ? `${owners.get(item.facilityId) ?? 'Facility'} / ` : '')
      + item.name + ('source' in item ? ` · ${item.source}` : '') + ('noLongerInUse' in item && item.noLongerInUse ? ' (retired)' : '') })), value.guids);
  });
  readonly facilityOptions = computed(() => withMissing(this.ownerResources().facilities.map(item => ({ guid: item.guid, label: item.name })), this.value().facilityGuids));
  readonly groupOptions = computed(() => withMissing(this.ownerResources().groups.map(item => ({ guid: item.guid,
    label: `${this.ownerResources().facilities.find(f => f.guid === item.facilityId)?.name ?? 'Facility'} / ${item.name}` })), this.value().groupGuids));
  readonly meterOptions = computed(() => withMissing(this.ownerResources().meters.map(item => ({ guid: item.guid,
    label: `${this.ownerResources().facilities.find(f => f.guid === item.facilityId)?.name ?? 'Facility'} / ${item.name} · ${item.source}` })), this.value().chargeMeter ? [this.value().chargeMeter] : []));
  readonly pinnedUnitOptions = computed(() => this.value().measure.endsWith('emissions') ? [{ value: 'tonne CO2e', display: 'tonne CO2e' }]
    : [...new Map([...EnergyUnitOptions, ...VolumeLiquidOptions, ...VolumeGasOptions, ...MassUnitOptions].map(option => [option.value, option])).values()]);
  readonly sourceOptions = computed(() => [...new Set([...this.ownerResources().meters.map(item => item.source), ...this.value().utilitySources])].sort());
  readonly chargeOptions = computed(() => withMissing((this.ownerResources().meters.find(meter => meter.guid === this.value().chargeMeter)?.charges ?? [])
    .map(item => ({ guid: item.guid, label: `${item.name} (${item.chargeType})` })), this.value().chargeGuid ? [this.value().chargeGuid] : []));

  @Input({ required: true }) set context(context: UtilityEditorContext) {
    const source = context.definition.sources.find(item => item.id === context.sourceId);
    this.contextValue.set(context);
    if (source?.kind !== 'utility') return;
    const identity = JSON.stringify([context.editorKey, context.resetKey, context.definition.accountGuid, context.sourceId]);
    const fingerprint = JSON.stringify(source);
    if (identity !== this.identity) {
      this.identity = identity; this.hydrate(source);
    } else if (fingerprint !== this.savedFingerprint) {
      if (this.conflict() || utilitySourceFormIssue(this.form.getRawValue())) this.conflict.set(true);
      else this.hydrate(source);
    }
    context.disabled ? this.form.disable({ emitEvent: false }) : this.form.enable({ emitEvent: false });
    context.validityChanged?.(this.conflict() || !!utilitySourceFormIssue(this.form.getRawValue()));
  }

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroy)).subscribe(() => {
      const raw = this.form.getRawValue();
      const changes: Partial<UtilitySourceFormValue> = {};
      if (this.previous && raw.mode !== this.previous.mode) changes.guids = [];
      if (this.previous && raw.measure !== this.previous.measure) {
        changes.unitBinding = 'owner'; changes.unit = ''; changes.treatmentBinding = 'owner';
      }
      if (this.previous && raw.chargeMeter !== this.previous.chargeMeter) changes.chargeGuid = '';
      if (raw.measure === 'charge' || raw.dataMode === 'billing-period') {
        changes.dataMode = 'billing-period'; changes.aggregation = 'none'; changes.groupBy = 'meter';
      }
      if (Object.keys(changes).length) this.form.patchValue(changes, { emitEvent: false });
      const value = this.form.getRawValue(); this.previous = value;
      this.value.set(value);
      this.publish();
    });
    this.destroy.onDestroy(() => this.contextValue()?.validityChanged?.(false));
  }

  useSaved(): void {
    const context = this.contextValue(), source = context?.definition.sources.find(item => item.id === context.sourceId);
    if (!context || context.disabled || source?.kind !== 'utility') return;
    this.hydrate(source); context.validityChanged?.(false);
  }

  keepLocal(): void {
    const context = this.contextValue(), source = context?.definition.sources.find(item => item.id === context.sourceId);
    if (!context || context.disabled || source?.kind !== 'utility') return;
    this.savedFingerprint = JSON.stringify(source); this.conflict.set(false); this.publish();
  }

  private hydrate(source: UtilityVisualizationSource): void {
    this.savedFingerprint = JSON.stringify(source); this.conflict.set(false);
    this.form.reset(utilitySourceFormValue(source), { emitEvent: false });
    this.previous = this.form.getRawValue(); this.value.set(this.previous);
  }

  private publish(): void {
    const context = this.contextValue(), value = this.form.getRawValue();
    const invalid = !!utilitySourceFormIssue(value);
    context?.validityChanged?.(this.conflict() || invalid);
    if (!context || context.disabled || invalid || this.conflict()) return;
    const next = applyUtilitySourceForm(context.definition, context.sourceId, value);
    this.savedFingerprint = JSON.stringify(next.sources.find(source => source.id === context.sourceId));
    context.changed(next);
  }
}

function withMissing(options: readonly { guid: string; label: string }[], selected: readonly string[]) {
  return [...options, ...selected.filter(guid => !options.some(option => option.guid === guid)).map(guid => ({ guid, label: `Unavailable: ${guid}` }))];
}
