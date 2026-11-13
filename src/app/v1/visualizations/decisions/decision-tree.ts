import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { createVisualizationDefinition, type ResourceSelection, type UtilityVisualizationSource,
  type VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { utilityUnit } from '@domain/visualizations/utility/utility-catalog';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { resolveUtilitySelection, utilityMeasureKey, utilitySeriesId } from '@domain/visualizations/utility/utility-selection';
import { resolveVisualizationFacilities, sameVisualizationFacilitySelection } from '@domain/visualizations/visualization-facilities';
import { prepareVisualizationFacilityChange } from '@domain/visualizations/visualization-facility-change';
import { visualizationIntentEqual } from '../editing/visualization-reconciliation';
import { meterResourceChoices, nativeObservationAvailable, projectMeterItems, itemKey, overrideMatches, sourceSeries, isCustomized } from '../utility/utility-items';
export { meterSelectionChoices, meterResourceChoices, nativeObservationAvailable, projectMeterItems, configuredChartSummary } from '../utility/utility-items';
import type { DecisionChangeContext, DecisionChangeResult, DecisionItemIdentity, DecisionItemPatch,
  DecisionRef, VisualizationDecisionAction } from './decision-types';

export function decisionNodeId(ref: DecisionRef): string {
  return [ref.kind, ref.sourceId, ref.itemKey].filter(value => value !== undefined).map(value => encodeURIComponent(value!)).join(':');
}

function hasSourcePresentation(definition: VisualizationDefinition, sourceId: string): boolean {
  return definition.series.some(series => series.sourceId === sourceId
    && (isCustomized(series) || series.overrides?.some(override => isCustomized(override, true))));
}
function compatiblePinnedUnit(definition: VisualizationDefinition, source: UtilityVisualizationSource,
  target: UtilityVisualizationSource, snapshot: AccountWorkspaceSnapshot): boolean {
  const unit = source.settings?.unit;
  if (unit?.kind !== 'pinned' || target.measure === 'cost' || target.measure === 'charge') return false;
  if (target.measure.endsWith('emissions')) return unit.value === 'tonne CO2e';
  if (target.measure === 'energy') return new ConvertValue(undefined, '', '').getUnit(unit.value)?.measure === 'energy';
  const meters = resolveUtilitySelection(snapshot, resolveVisualizationFacilities(definition, snapshot.facilities).scope, target).meters;
  return meters.length > 0 && meters.every(meter => {
    const from = utilityUnit(snapshot, resolveVisualizationFacilities(definition, snapshot.facilities).scope, target, meter);
    const conversion = new ConvertValue(1, from, unit.value);
    return !!from && !conversion.hasError && Number.isFinite(conversion.convertedValue);
  });
}

function ensureSeries(definition: VisualizationDefinition, source: UtilityVisualizationSource): VisualizationDefinition {
  if (!source.selection) return definition;
  const metric = utilityMeasureKey(source);
  const declared = definition.series.filter(series => series.sourceId === source.id && series.metric === metric);
  if (declared.some(series => !series.resourceGuid)) return definition;
  if (source.selection.kind === 'fixed' && source.selection.guids.every(guid => declared.some(series => series.resourceGuid === guid))) return definition;
  let id = `${source.id}-series`, index = 1;
  while (definition.series.some(series => series.id === id)) id = `${source.id}-series-${index++}`;
  return { ...definition, series: [...definition.series, { id, sourceId: source.id, metric, axis: 'left' }] };
}
function replaceSource(definition: VisualizationDefinition, source: UtilityVisualizationSource): VisualizationDefinition {
  return ensureSeries({ ...definition, sources: definition.sources.map(item => item.id === source.id ? source : item) }, source);
}
function pruneChart(definition: VisualizationDefinition): VisualizationDefinition {
  const chart = definition.chart;
  if (chart?.kind !== 'scatter') return definition;
  const next = { ...chart };
  if (next.xSeriesId && !definition.series.some(series => series.id === next.xSeriesId)) delete next.xSeriesId;
  if (next.ySeriesId && !definition.series.some(series => series.id === next.ySeriesId)) delete next.ySeriesId;
  return { ...definition, chart: next };
}
function cleanJson<T>(value: T): T {
  if (Array.isArray(value)) return value.map(entry => cleanJson(entry)) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([, entry]) => entry !== undefined).map(([key, entry]) => [key, cleanJson(entry)])) as T;
  return value;
}
function patchItem(definition: VisualizationDefinition, source: UtilityVisualizationSource, identity: DecisionItemIdentity, changes: DecisionItemPatch): VisualizationDefinition {
  const prepared = ensureSeries(definition, source), selected = sourceSeries(prepared, source, identity);
  if (!selected) return definition;
  const apply = <T extends object>(value: T): T => {
    const result = { ...value } as Record<string, unknown>;
    for (const [key, entry] of Object.entries(changes)) { if (entry === null || entry === '') delete result[key]; else if (entry !== undefined) result[key] = entry; }
    return result as T;
  };
  return { ...prepared, series: prepared.series.map(series => {
    if (series.id !== selected.id) return series;
    if (series.resourceGuid && series.resourceGuid === identity.resourceGuid && changes.order === undefined) {
      const result = apply(series);
      return result.axis ? result : { ...result, axis: 'left' };
    }
    const overrides = [...series.overrides ?? []], index = overrides.findIndex(entry => overrideMatches(entry, identity, definition.accountGuid));
    const provider = identity.resourceGuid !== undefined ? overrides.find(entry => entry.seriesId === utilitySeriesId(source.id, identity.resourceGuid!)
      && (entry.accountGuid ?? definition.accountGuid) === definition.accountGuid) : undefined;
    const { seriesId: _providerId, resourceGuid: _providerResource, ...retained } = provider ?? {};
    const override = apply(index >= 0 ? overrides[index] : { ...retained, ...identity, accountGuid: definition.accountGuid });
    const hasValues = Object.keys(override).some(key => !['resourceGuid', 'seriesId', 'accountGuid'].includes(key));
    if (index >= 0) { if (hasValues) overrides[index] = override; else overrides.splice(index, 1); }
    else if (hasValues) overrides.push(override);
    const { overrides: _old, ...base } = series;
    return { ...base, ...(overrides.length ? { overrides } : {}) };
  }) };
}
function withoutItem(definition: VisualizationDefinition, source: UtilityVisualizationSource, identity: DecisionItemIdentity): VisualizationDefinition {
  const providerIdentity: DecisionItemIdentity = identity.resourceGuid !== undefined ? { seriesId: utilitySeriesId(source.id, identity.resourceGuid) } : identity;
  return pruneChart({ ...definition, series: definition.series.filter(series => !(series.sourceId === source.id && identity.resourceGuid !== undefined && series.resourceGuid === identity.resourceGuid))
    .map(series => {
      if (series.sourceId !== source.id || !series.overrides) return series;
      const overrides = series.overrides.filter(entry => !overrideMatches(entry, identity, definition.accountGuid) && !overrideMatches(entry, providerIdentity, definition.accountGuid));
      const { overrides: _old, ...base } = series;
      return { ...base, ...(overrides.length ? { overrides } : {}) };
    }) });
}

export function prepareDecisionChange(definition: VisualizationDefinition, action: VisualizationDecisionAction, context: DecisionChangeContext): DecisionChangeResult {
  let next = definition;
  const cleared: string[] = [], affected = new Set<string>();
  let nextSection: DecisionRef | undefined;
  const affect = (ref: DecisionRef) => affected.add(decisionNodeId(ref));
  const clearItems = (sourceId: string, allBindings = false) => {
    const items = projectMeterItems(definition, sourceId, context.snapshot);
    if (allBindings && items.length) cleared.push(`${items.length} selected item${items.length === 1 ? '' : 's'}`);
    if (items.some(item => item.customized) || hasSourcePresentation(definition, sourceId)) cleared.push('Customized item presentation');
    affect({ kind: 'resources', sourceId });
    for (const item of items) affect({ kind: 'item', sourceId, itemKey: item.key });
  };
  if (action.kind === 'facilities') {
    if (sameVisualizationFacilitySelection(definition.facilitySelection, action.selection)) return { state: 'unchanged' };
    const review = prepareVisualizationFacilityChange(definition, action.selection, context.snapshot, context.preservedReferences);
    next = review.definition; cleared.push(...review.cleared); affect({ kind: 'facilities' });
    for (const source of definition.sources) {
      const changed = next.sources.find(item => item.id === source.id);
      if (!visualizationIntentEqual('selection' in source ? source.selection : undefined, changed && 'selection' in changed ? changed.selection : undefined)) affect({ kind: 'resources', sourceId: source.id });
      if (source.kind === 'utility' && changed?.kind === 'utility' && !visualizationIntentEqual(source.charge, changed.charge)) affect({ kind: 'data-settings', sourceId: source.id });
      const retained = new Set(projectMeterItems(next, source.id, context.snapshot).map(item => item.key));
      for (const item of projectMeterItems(definition, source.id, context.snapshot)) if (!retained.has(item.key)) {
        affect({ kind: 'item', sourceId: source.id, itemKey: item.key });
      }
    }
    nextSection = { kind: 'sources' };
  } else if (action.kind === 'chart-type') {
    if (definition.chart?.kind !== 'time-series') return { state: 'unchanged' };
    next = { ...definition, chart: { ...definition.chart, defaultTraceType: action.traceType }, series: definition.series.map(series => {
      const { traceType: _type, overrides: prior, ...base } = series;
      const overrides = prior?.map(override => {
        if ((override.accountGuid ?? definition.accountGuid) !== definition.accountGuid) return override;
        const { traceType: _overrideType, ...kept } = override; return kept;
      });
      return { ...base, ...(overrides?.length ? { overrides } : {}) };
    }) };
    if (!visualizationIntentEqual(next, definition)) {
      if (definition.series.some(series => series.traceType !== undefined && series.traceType !== action.traceType
        || series.overrides?.some(override => (override.accountGuid ?? definition.accountGuid) === definition.accountGuid
          && override.traceType !== undefined && override.traceType !== action.traceType))) cleared.push('Individual trace-type choices');
    }
    nextSection = { kind: 'sources' };
  } else if (action.kind === 'chart') {
    next = { ...definition, chart: action.chart };
    if (definition.chart?.kind !== action.chart.kind) for (const source of definition.sources) {
      const ownSeries = definition.series.filter(series => series.sourceId === source.id);
      if (ownSeries.some(series => series.traceType !== undefined || series.overrides?.some(override => (override.accountGuid ?? definition.accountGuid) === definition.accountGuid && override.traceType !== undefined))) cleared.push('Per-item trace types');
      for (const item of projectMeterItems(definition, source.id, context.snapshot)) affect({ kind: 'item', sourceId: source.id, itemKey: item.key });
      next = { ...next, series: next.series.map(series => {
        if (series.sourceId !== source.id) return series;
        const { traceType: _type, overrides: prior, ...base } = series;
        const overrides = prior?.map(override => { if ((override.accountGuid ?? definition.accountGuid) !== definition.accountGuid) return override;
          const { traceType: _overrideType, ...kept } = override; return kept; });
        return { ...base, ...(overrides?.length ? { overrides } : {}) };
      }) };
    }
    nextSection = { kind: 'sources' };
  } else if (action.kind === 'add-source') {
    let index = 1; while (definition.sources.some(source => source.id === `${action.sourceKind}-${index}`)) index++;
    const source = { ...createVisualizationDefinition('', definition.accountGuid, definition.facilitySelection, action.sourceKind).sources[0], id: `${action.sourceKind}-${index}` };
    next = { ...definition, sources: [...definition.sources, source] };
    nextSection = { kind: source.kind === 'utility' ? 'selection-mode' : 'source', sourceId: source.id };
  } else if (action.kind === 'remove-source-kind') {
    const removed = definition.sources.filter(source => source.kind === action.sourceKind);
    if (!removed.length || removed.length === definition.sources.length) return { state: 'unchanged' };
    const ids = new Set(removed.map(source => source.id));
    for (const source of removed) { clearItems(source.id, true); affect({ kind: 'source', sourceId: source.id }); }
    next = pruneChart({ ...definition, sources: definition.sources.filter(source => !ids.has(source.id)), series: definition.series.filter(series => !ids.has(series.sourceId)) });
    nextSection = { kind: 'sources' };
  } else {
    const source = definition.sources.find(source => source.id === action.sourceId);
    if (source?.kind !== 'utility') return { state: 'unchanged' };
    if (action.kind === 'selection-mode') {
      if (source.selectionMode === action.mode) return { state: 'unchanged' };
      clearItems(source.id, true);
      const { selection: _selection, charge: _charge, ...base } = source;
      const groupBy = source.groupBy === 'facility' && source.selectionMode !== 'facility' ? 'facility'
        : action.mode === 'source' ? 'source' : action.mode === 'group' ? 'group' : action.mode === 'facility' ? 'facility' : 'meter';
      const native = (action.mode === 'meter' || action.mode === 'rule') && source.dataMode === 'billing-period';
      const selected: UtilityVisualizationSource = { ...base, selectionMode: action.mode, groupBy, aggregation: native ? 'none' : 'sum',
        dataMode: action.mode === 'meter' || action.mode === 'rule' ? source.dataMode : 'calendarized',
        ...(action.mode === 'rule' ? { selection: { kind: 'rule', resource: 'meter', filter: {} } as const } : {}) };
      next = pruneChart(replaceSource({ ...definition, series: definition.series.filter(series => series.sourceId !== source.id) }, selected));
      if (source.dataMode === 'billing-period' && !native && next.chart?.kind === 'time-series') next = { ...next, chart: { ...next.chart, interval: 'monthly' } };
      nextSection = { kind: 'resources', sourceId: source.id };
    } else if (action.kind === 'toggle-resource' || action.kind === 'set-resources') {
      const mode = source.selectionMode;
      if (!mode || mode === 'rule') return { state: 'unchanged' };
      const selected = mode === 'source' ? source.selection?.kind === 'rule' ? source.selection.filter.utilitySources ?? [] : []
        : source.selection?.kind === 'fixed' ? source.selection.guids : [];
      const ids = action.kind === 'set-resources' ? [...new Set(action.resourceIds)]
        : action.selected ? [...new Set([...selected, action.resourceId])] : selected.filter(id => id !== action.resourceId);
      if (ids.length === selected.length && ids.every(id => selected.includes(id))) return { state: 'unchanged' };
      const added = ids.filter(id => !selected.includes(id)), removed = selected.filter(id => !ids.includes(id));
      const available = new Set(meterResourceChoices(context.snapshot, resolveVisualizationFacilities(definition, context.snapshot.facilities).scope, mode, source.measure).map(choice => choice.value));
      if (added.some(id => !available.has(id))) return { state: 'unchanged' };
      const items = removed.length ? projectMeterItems(definition, source.id, context.snapshot) : [];
      for (const resourceId of removed) {
        const identity: DecisionItemIdentity = mode === 'source' ? { seriesId: utilitySeriesId(source.id, `source:${resourceId}`) } : { resourceGuid: resourceId };
        const item = items.find(item => item.key === itemKey(identity));
        if (item?.customized) cleared.push(`${item.label} presentation`);
        affect({ kind: 'item', sourceId: source.id, itemKey: itemKey(identity) });
        next = withoutItem(next, source, identity);
      }
      if (removed.length && !ids.length && hasSourcePresentation(definition, source.id)) cleared.push('Customized item presentation');
      const { selection: _selection, ...base } = source;
      const selection: ResourceSelection | undefined = ids.length ? mode === 'source' ? { kind: 'rule', resource: 'meter', filter: { utilitySources: ids } }
        : { kind: 'fixed', resource: mode === 'group' ? 'meter-group' : mode === 'facility' ? 'facility' : 'meter', guids: ids } : undefined;
      next = replaceSource(next, { ...base, ...(selection ? { selection } : {}) });
      if (!ids.length) next = pruneChart({ ...next, series: next.series.filter(series => series.sourceId !== source.id) });
      nextSection = { kind: 'data-settings', sourceId: source.id };
    } else if (action.kind === 'measure') {
      if (source.measure === action.measure) return { state: 'unchanged' };
      const { charge: _charge, ...base } = source;
      let changed: UtilityVisualizationSource = { ...base, measure: action.measure,
        settings: action.measure === 'energy' ? { unit: { kind: 'owner' }, energyTreatment: { kind: 'owner' } }
          : action.measure === 'cost' || action.measure === 'charge' ? {} : { unit: { kind: 'owner' } } };
      if (compatiblePinnedUnit(definition, source, changed, context.snapshot)) changed = { ...changed, settings: { ...changed.settings, unit: source.settings!.unit } };
      if (source.settings?.unit?.kind === 'pinned' && !visualizationIntentEqual(source.settings.unit, changed.settings?.unit)) cleared.push('Pinned unit');
      if (source.settings?.energyTreatment?.kind === 'pinned' && !visualizationIntentEqual(source.settings.energyTreatment, changed.settings?.energyTreatment)) cleared.push('Pinned energy treatment');
      if (source.charge) cleared.push('Named charge settings');
      if (action.measure === 'charge') {
        clearItems(source.id, true); const { selection: _selection, ...unbound } = changed;
        changed = { ...unbound, selectionMode: 'meter', dataMode: 'billing-period', aggregation: 'none', groupBy: 'meter' };
      }
      next = pruneChart(replaceSource({ ...definition, series: action.measure === 'charge'
        ? definition.series.filter(series => series.sourceId !== source.id)
        : definition.series.map(series => series.sourceId === source.id ? { ...series, metric: utilityMeasureKey(changed) } : series) }, changed));
      if (changed.dataMode === 'billing-period' && next.comparison.kind !== 'none') {
        cleared.push('Comparison settings'); affect({ kind: 'period' }); next = { ...next, comparison: { kind: 'none' } };
      }
      if (next.chart?.kind === 'time-series') next = { ...next, chart: { ...next.chart, interval: changed.dataMode === 'billing-period' ? 'native' : next.chart.interval === 'native' ? 'monthly' : next.chart.interval } };
      affect({ kind: 'data-settings', sourceId: source.id }); nextSection = { kind: 'data-settings', sourceId: source.id };
    } else if (action.kind === 'source-settings') {
      if (action.settings.dataMode === 'billing-period' && !nativeObservationAvailable(definition, source.id, context.snapshot)) return { state: 'unchanged' };
      const changed: UtilityVisualizationSource = { ...source, ...action.settings };
      if (changed.measure === 'charge' && Object.hasOwn(action.settings, 'charge')) {
        if (!visualizationIntentEqual(source.charge, changed.charge)) {
          clearItems(source.id, true); next = { ...next, series: next.series.filter(series => series.sourceId !== source.id) };
        }
        const { selection: _selection, ...base } = changed;
        Object.assign(changed, base, { selectionMode: 'meter' });
        if (changed.charge) Object.assign(changed, { selection: { kind: 'fixed', resource: 'meter', guids: [changed.charge.meterGuid] } });
        else delete (changed as { selection?: ResourceSelection }).selection;
      }
      if (changed.dataMode === 'billing-period') {
        Object.assign(changed, { aggregation: 'none', groupBy: 'meter' });
        if (definition.comparison.kind !== 'none') { cleared.push('Comparison settings'); affect({ kind: 'period' }); }
        next = { ...next, comparison: { kind: 'none' }, ...(next.chart?.kind === 'time-series' ? { chart: { ...next.chart, interval: 'native' } } : {}) };
      } else if (source.dataMode === 'billing-period' && definition.chart?.kind === 'time-series') next = { ...definition, chart: { ...definition.chart, interval: 'monthly' } };
      if ((changed.aggregation === 'none' ? 'meter' : changed.groupBy) !== (source.aggregation === 'none' ? 'meter' : source.groupBy)) {
        clearItems(source.id); next = { ...next, series: next.series.filter(series => series.sourceId !== source.id) };
      }
      next = replaceSource(next, changed);
      const firstItem = projectMeterItems(next, source.id, context.snapshot)[0];
      nextSection = firstItem ? { kind: 'item', sourceId: source.id, itemKey: firstItem.key } : { kind: 'data-settings', sourceId: source.id };
    } else if (action.kind === 'item-style') {
      next = patchItem(definition, source, action.item, action.changes);
    }
  }
  if ('sourceId' in action && ['toggle-resource', 'set-resources', 'selection-mode'].includes(action.kind) && !visualizationIntentEqual(next, definition)) {
    const source = next.sources.find(source => source.id === action.sourceId);
    if (source?.kind === 'utility' && source.dataMode === 'billing-period' && !nativeObservationAvailable(next, source.id, context.snapshot)) {
      next = replaceSource(next, { ...source, dataMode: 'calendarized' });
      if (next.chart?.kind === 'time-series' && next.chart.interval === 'native') next = { ...next, chart: { ...next.chart, interval: 'monthly' } };
      cleared.push('Native bill observation view'); nextSection = { kind: 'data-settings', sourceId: source.id };
    }
  }
  next = cleanJson(next);
  if (visualizationIntentEqual(next, definition)) return { state: 'unchanged' };
  const invalidated = context.invalidNodeIds?.filter(id => affected.has(id)
    || !!id.split(':')[1] && affected.has(`source:${id.split(':')[1]}`)) ?? [];
  if (invalidated.length) cleared.push('Incomplete input in the affected sections');
  return { state: cleared.length ? 'confirm' : 'apply', definition: next, cleared: [...new Set(cleared)], affectedNodeIds: [...affected], ...(nextSection ? { next: nextSection } : {}) };
}
