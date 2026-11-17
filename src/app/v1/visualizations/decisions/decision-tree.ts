import { isExplorationChart } from '@domain/visualizations/visualization-interval';
import { replaceAnalysisBinding } from '../analysis/analysis-binding';
import { analysisMeasureLabels, analysisSeriesId, analysisPeriodIssue } from '@domain/visualizations/analysis/facility-analysis-source';
import { projectAnalysisItems, analysisChoices, analysisGroupChoices } from '../analysis/analysis-items';
import { energyUseSelectionMode, energyUseResourceKind, energyUseSeriesId, selectedEnergyUseIds } from '@domain/visualizations/energy-use/equipment-selection';
import type { EquipmentType } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { useEquipmentHistorySettings } from '@domain/visualizations/energy-use/equipment-source';
import { equipmentResourceChoices, projectEquipmentItems } from '../energy-use/equipment-items';
import { predictorSeriesId, isAllPredictors, resolvePredictorSelection } from '@domain/visualizations/predictor/predictor-source';
import { predictorResourceChoices, projectPredictorItems } from '../predictor/predictor-items';
import type { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { createVisualizationDefinition, type ResourceSelection, type UtilityVisualizationSource, type PredictorVisualizationSource,
  type EnergyUseVisualizationSource, type AnalysisResultVisualizationSource, type VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { utilityUnit } from '@domain/visualizations/utility/utility-catalog';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { resolveUtilitySelection, utilityMeasureKey, utilitySeriesId } from '@domain/visualizations/utility/utility-selection';
import { resolveVisualizationFacilities, sameVisualizationFacilitySelection } from '@domain/visualizations/visualization-facilities';
import { prepareVisualizationFacilityChange } from '@domain/visualizations/visualization-facility-change';
import { visualizationIntentEqual } from '../editing/visualization-reconciliation';
import { meterResourceChoices, nativeObservationAvailable } from '../utility/utility-items';
import { itemKey, overrideMatches, findItemSeries, isCustomized } from '../shared/item-appearance';
import { projectDecisionItems } from '../shared/configured-items';
export { meterSelectionChoices, meterResourceChoices, nativeObservationAvailable, projectMeterItems } from '../utility/utility-items';
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

function ensureSeries(definition: VisualizationDefinition, source: UtilityVisualizationSource | PredictorVisualizationSource | EnergyUseVisualizationSource | AnalysisResultVisualizationSource): VisualizationDefinition {
  if (source.kind === 'analysis') {
    if (!source.analysisGuid || definition.series.some(series => series.sourceId === source.id && series.metric === source.measure)) return definition;
    let id = `${source.id}-series`, index = 1;
    while (definition.series.some(series => series.id === id)) id = `${source.id}-series-${index++}`;
    return { ...definition, series: [...definition.series, { id, sourceId: source.id, metric: source.measure, resourceGuid: source.groupGuid ?? source.analysisGuid, axis: 'left' }] };
  }
  if (!source.selection && !(source.kind === 'energy-use' && source.equipmentTypes?.length)) return definition;
  const metric = source.kind === 'predictor' ? 'value' : source.kind === 'energy-use' ? 'consumption' : utilityMeasureKey(source);
  const declared = definition.series.filter(series => series.sourceId === source.id && series.metric === metric);
  if (declared.some(series => !series.resourceGuid)) return definition;
  if (source.selection?.kind === 'fixed' && source.selection.guids.every(guid => declared.some(series => series.resourceGuid === guid))) return definition;
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
function patchItem(definition: VisualizationDefinition, source: UtilityVisualizationSource | PredictorVisualizationSource | EnergyUseVisualizationSource | AnalysisResultVisualizationSource, identity: DecisionItemIdentity, changes: DecisionItemPatch): VisualizationDefinition {
  const prepared = ensureSeries(definition, source);
  const metric = source.kind === 'analysis' ? source.measure : source.kind === 'predictor' ? 'value' : source.kind === 'energy-use' ? 'consumption' : utilityMeasureKey(source);
  const selected = findItemSeries(prepared, source.id, metric, identity);
  if (!selected) return definition;
  const apply = <T extends object>(value: T): T => {
    const result = { ...value } as Record<string, unknown>;
    for (const [key, entry] of Object.entries(changes)) { if (entry === null || entry === '') delete result[key]; else if (entry !== undefined) result[key] = entry; }
    return result as T;
  };
  return { ...prepared, series: prepared.series.map(series => {
    if (series.id !== selected.id) return series;
    const overrides = [...series.overrides ?? []], index = overrides.findIndex(entry => overrideMatches(entry, identity, definition.accountGuid));
    const provider = source.kind !== 'analysis' && identity.resourceGuid !== undefined ? overrides.find(entry => entry.seriesId === (source.kind === 'predictor' ? predictorSeriesId : source.kind === 'energy-use' ? (id: string, key: string) => energyUseSeriesId(source, key) : utilitySeriesId)(source.id, identity.resourceGuid!)
      && (entry.accountGuid ?? definition.accountGuid) === definition.accountGuid) : undefined;
    if (series.resourceGuid && series.resourceGuid === identity.resourceGuid && changes.order === undefined) {
      const { overrides: _old, ...result } = apply(series);
      const retained = overrides.flatMap(entry => {
        if (entry !== provider && !overrideMatches(entry, identity, definition.accountGuid)) return [entry];
        const preference = { ...entry } as Record<string, unknown>;
        for (const [key, value] of Object.entries(changes)) if (value !== undefined) delete preference[key];
        return Object.keys(preference).some(key => !['resourceGuid', 'seriesId', 'accountGuid'].includes(key)) ? [preference as typeof entry] : [];
      });
      return { ...result, axis: result.axis ?? 'left', ...(retained.length ? { overrides: retained } : {}) };
    }
    const { seriesId: _providerId, resourceGuid: _providerResource, ...retained } = provider ?? {};
    const override = apply(index >= 0 ? overrides[index] : { ...retained, ...identity, accountGuid: definition.accountGuid });
    const hasValues = Object.keys(override).some(key => !['resourceGuid', 'seriesId', 'accountGuid'].includes(key));
    if (index >= 0) { if (hasValues) overrides[index] = override; else overrides.splice(index, 1); }
    else if (hasValues) overrides.push(override);
    // A cleared preference must not return through the weaker provider selector.
    const retainedOverrides = overrides.flatMap(entry => {
      if (entry !== provider) return [entry];
      const retained = { ...entry };
      for (const [key, value] of Object.entries(changes)) if (value === null || value === '') delete (retained as Record<string, unknown>)[key];
      return Object.keys(retained).some(key => !['resourceGuid', 'seriesId', 'accountGuid'].includes(key)) ? [retained] : [];
    });
    const { overrides: _old, ...base } = series;
    return { ...base, ...(retainedOverrides.length ? { overrides: retainedOverrides } : {}) };
  }) };
}
function withoutItem(definition: VisualizationDefinition, source: UtilityVisualizationSource | PredictorVisualizationSource | EnergyUseVisualizationSource | AnalysisResultVisualizationSource, identity: DecisionItemIdentity): VisualizationDefinition {
  const providerIdentity: DecisionItemIdentity = identity.resourceGuid !== undefined ? { seriesId: (source.kind === 'analysis' ? analysisSeriesId : source.kind === 'predictor' ? predictorSeriesId : source.kind === 'energy-use' ? (id: string, key: string) => energyUseSeriesId(source, key) : utilitySeriesId)(source.id, identity.resourceGuid) } : identity;
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
    const items = projectDecisionItems(definition, sourceId, context.snapshot);
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
      const retained = new Set(projectDecisionItems(next, source.id, context.snapshot).map(item => item.key));
      for (const item of projectDecisionItems(definition, source.id, context.snapshot)) if (!retained.has(item.key)) {
        affect({ kind: 'item', sourceId: source.id, itemKey: item.key });
      }
    }
    nextSection = { kind: 'sources' };
  } else if (action.kind === 'chart-stack') {
    if (definition.chart?.kind !== 'time-series') return { state: 'unchanged' };
    next = { ...definition, chart: { ...definition.chart, stack: action.stack } };
  } else if (action.kind === 'item-order' || action.kind === 'reset-order') {
    const source = definition.sources.find(source => source.id === action.sourceId);
    if (!source || source.kind === 'analysis' && source.mode !== 'result') return { state: 'unchanged' };
    if (action.kind === 'reset-order') {
      next = { ...definition, series: definition.series.map(series => series.sourceId !== source.id ? series : { ...series,
        overrides: series.overrides?.map(override => {
          if ((override.accountGuid ?? definition.accountGuid) !== definition.accountGuid) return override;
          const { order: _order, ...retained } = override; return retained;
        }) }) };
    } else {
      const items = [...projectDecisionItems(definition, source.id, context.snapshot)];
      const index = items.findIndex(item => item.key === itemKey(action.item));
      const target = index + (action.direction === 'up' ? -1 : 1);
      if (index < 0 || target < 0 || target >= items.length) return { state: 'unchanged' };
      [items[index], items[target]] = [items[target], items[index]];
      items.forEach((item, order) => { next = patchItem(next, source, item.identity, { order }); });
    }
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
    if (source?.kind === 'analysis') {
      if (action.kind === 'analysis-binding') {
        const scope = resolveVisualizationFacilities(definition, context.snapshot.facilities).scope;
        if (action.analysisGuid && !analysisChoices(context.snapshot, scope, definition.facilitySelection.kind === 'all').some(item => item.value === action.analysisGuid)) return { state: 'unchanged' };
        if (action.groupGuid && !analysisGroupChoices(context.snapshot, action.analysisGuid).some(item => item.value === action.groupGuid)) return { state: 'unchanged' };
        if (source.mode === 'result' && source.analysisGuid === action.analysisGuid && source.groupGuid === action.groupGuid) return { state: 'unchanged' };
        clearItems(source.id, true); affect({ kind: 'source', sourceId: source.id });
        next = replaceAnalysisBinding(definition, source.id, action);
      } else if (source.mode === 'result' && action.kind === 'analysis-measure') {
        if (!Object.hasOwn(analysisMeasureLabels, action.measure)) return { state: 'unchanged' };
        const changed = { ...source, measure: action.measure };
        next = ensureSeries({ ...definition, sources: definition.sources.map(item => item.id === source.id ? changed : item), series: definition.series.map(item => item.sourceId === source.id ? { ...item, metric: action.measure } : item) }, changed);
        affect({ kind: 'data-settings', sourceId: source.id });
      } else if (source.mode === 'result' && (action.kind === 'analysis-interval' || action.kind === 'analysis-defaults')) {
        const interval = action.kind === 'analysis-interval' ? action.interval : 'monthly';
        const measure = action.kind === 'analysis-defaults' || interval === 'yearly' && !['actual', 'calculated', 'annual-improvement', 'total-improvement'].includes(source.measure)
          || interval === 'monthly' && ['annual-improvement', 'total-improvement'].includes(source.measure) ? 'actual' : source.measure;
        if (measure !== source.measure) cleared.push('Incompatible analysis measure');
        const accountTarget = context.snapshot.accountAnalyses.some(item => item.guid === source.analysisGuid && item.accountId === definition.accountGuid);
        const { groupGuid, ...accountSource } = source;
        const repairAccountGroup = action.kind === 'analysis-defaults' && accountTarget && !!groupGuid;
        if (repairAccountGroup) { clearItems(source.id, true); cleared.push('Unsupported account group target'); }
        const changed = { ...(repairAccountGroup ? accountSource : source), measure, ...(action.kind === 'analysis-defaults' ? { settings: { unit: { kind: 'owner' as const } } } : {}) };
        next = { ...definition, chart: isExplorationChart(definition.chart) ? { ...definition.chart, interval } : { kind: 'time-series', defaultTraceType: definition.chart?.kind === 'time-series' ? definition.chart.defaultTraceType : 'line', interval, stack: 'none' },
          sources: definition.sources.map(item => item.id === source.id ? changed : item), series: definition.series.filter(item => !repairAccountGroup || item.sourceId !== source.id).map(item => item.sourceId === source.id ? { ...item, metric: measure } : item) };
        if (action.kind === 'analysis-defaults' || analysisPeriodIssue({ chart: next.chart!, period: next.period, comparison: next.comparison })) {
          if (next.period.kind !== 'all-history' || next.comparison.kind !== 'none') cleared.push('Incompatible period or comparison');
          next = { ...next, period: { kind: 'all-history' }, comparison: { kind: 'none' } };
        }
        if (action.kind === 'analysis-defaults' && (source.settings?.unit?.kind === 'pinned' || source.settings?.energyTreatment?.kind === 'pinned')) cleared.push('Pinned analysis display settings');
        affect({ kind: 'period' }); affect({ kind: 'source', sourceId: source.id });
        next = ensureSeries(next, changed);
      } else if (source.mode === 'result' && action.kind === 'item-style' && projectAnalysisItems(definition, source.id, context.snapshot).some(item => item.key === itemKey(action.item))) {
        next = patchItem(definition, source, action.item, action.changes);
      } else return { state: 'unchanged' };
      nextSection = { kind: 'source', sourceId: source.id };
    } else if (source?.kind === 'energy-use') {
      if (action.kind === 'energy-use-selection-mode') {
        if (energyUseSelectionMode(source) === action.mode) return { state: 'unchanged' };
        clearItems(source.id, true);
        if (source.selection || source.equipmentTypes?.length) cleared.push('Previous Energy Use selections');
        affect({ kind: 'source', sourceId: source.id });
        const { selection: _selection, equipmentTypes: _types, ...base } = source;
        next = { ...definition, sources: definition.sources.map(item => item.id === source.id ? { ...base, selectionMode: action.mode, aggregation: action.mode === 'equipment' ? 'none' : 'sum' } : item), series: definition.series.filter(series => series.sourceId !== source.id) };
      } else if (action.kind === 'equipment-selection' || action.kind === 'energy-use-resources') {
        const mode = action.kind === 'equipment-selection' ? 'equipment' : energyUseSelectionMode(source);
        if (!mode) return { state: 'unchanged' };
        const guids = [...new Set(action.kind === 'equipment-selection' ? action.equipmentGuids : action.ids)];
        const previous = selectedEnergyUseIds(source);
        const choices = equipmentResourceChoices(context.snapshot, resolveVisualizationFacilities(definition, context.snapshot.facilities).scope, mode);
        if (guids.some(guid => !previous.includes(guid) && !choices.some(choice => choice.value === guid))) return { state: 'unchanged' };
        if (energyUseSelectionMode(source) === mode && guids.length === previous.length && guids.every(guid => previous.includes(guid))) return { state: 'unchanged' };
        if (energyUseSelectionMode(source) !== mode) {
          clearItems(source.id, true); if (previous.length || source.selection) cleared.push('Previous Energy Use selection');
          next = { ...next, series: next.series.filter(series => series.sourceId !== source.id) };
          affect({ kind: 'source', sourceId: source.id });
        }
        for (const guid of previous.filter(guid => !guids.includes(guid))) {
          const identity: DecisionItemIdentity = mode === 'equipment-type' ? { seriesId: energyUseSeriesId(source, guid) } : { resourceGuid: guid };
          const item = projectEquipmentItems(definition, source.id, context.snapshot).find(item => item.key === itemKey(identity));
          if (item?.customized) cleared.push(`${item.label} presentation`);
          next = withoutItem(next, source, identity);
          affect({ kind: 'item', sourceId: source.id, itemKey: itemKey(identity) });
        }
        const { selection: _selection, equipmentTypes: _types, ...base } = source;
        const changed: EnergyUseVisualizationSource = { ...base, selectionMode: mode, aggregation: mode === 'equipment' ? 'none' : 'sum',
          ...(guids.length ? mode === 'equipment-type' ? { equipmentTypes: guids as EquipmentType[] } : { selection: { kind: 'fixed', resource: energyUseResourceKind(mode), guids } } : {}) };
        next = { ...next, sources: next.sources.map(item => item.id === source.id ? changed : item) };
        if (guids.length) next = ensureSeries(next, changed);
        else {
          if (hasSourcePresentation(definition, source.id)) cleared.push('Customized item presentation');
          next = { ...next, series: next.series.filter(series => series.sourceId !== source.id) };
        }
        affect({ kind: 'resources', sourceId: source.id });
      } else if (action.kind === 'equipment-defaults') {
        next = ensureSeries(useEquipmentHistorySettings(definition, source.id), { ...source, measure: 'consumption' });
        affect({ kind: 'period' }); affect({ kind: 'source', sourceId: source.id });
        if (!visualizationIntentEqual(next, definition)) cleared.push('Unsupported chart, period or Energy Use settings');
      } else if (action.kind === 'equipment-unit') {
        next = { ...definition, sources: definition.sources.map(item => item.id === source.id ? { ...source, settings: { ...source.settings, unit: action.unit } } : item) };
      } else if (action.kind === 'item-style' && projectEquipmentItems(definition, source.id, context.snapshot).some(item => item.key === itemKey(action.item))) {
        next = patchItem(definition, source, action.item, action.changes);
      } else return { state: 'unchanged' };
      nextSection = { kind: action.kind === 'energy-use-selection-mode' ? 'resources' : action.kind === 'energy-use-resources' || action.kind === 'equipment-selection' ? 'data-settings' : 'source', sourceId: source.id };
    } else if (source?.kind === 'predictor') {
      if (action.kind === 'predictor-selection') {
        const choices = predictorResourceChoices(context.snapshot, resolveVisualizationFacilities(definition, context.snapshot.facilities).scope);
        const previous = resolvePredictorSelection(context.snapshot, resolveVisualizationFacilities(definition, context.snapshot.facilities).scope, source);
        const guids = action.all ? choices.map(choice => choice.value) : [...new Set(action.predictorGuids)], added = guids.filter(guid => !previous.includes(guid)), removed = previous.filter(guid => !guids.includes(guid));
        if (added.some(guid => !choices.some(choice => choice.value === guid))) return { state: 'unchanged' };
        const selection: ResourceSelection | undefined = action.all ? { kind: 'rule', resource: 'predictor', filter: {} } : guids.length ? { kind: 'fixed', resource: 'predictor', guids } : undefined;
        if (visualizationIntentEqual(source.selection, selection)) return { state: 'unchanged' };
        if (source.selection && !isAllPredictors(source) && !(source.selection.kind === 'fixed' && source.selection.resource === 'predictor')) {
          clearItems(source.id, true); cleared.push('Previous predictor selection'); affect({ kind: 'source', sourceId: source.id });
          next = pruneChart({ ...next, series: next.series.filter(series => series.sourceId !== source.id) });
        }
        const items = projectPredictorItems(definition, source.id, context.snapshot);
        for (const guid of removed) {
          const item = items.find(item => item.identity.resourceGuid === guid);
          if (item?.customized) cleared.push(`${item.label} presentation`);
          affect({ kind: 'item', sourceId: source.id, itemKey: itemKey({ resourceGuid: guid }) });
          next = withoutItem(next, source, { resourceGuid: guid });
        }
        if (!selection) {
          if (hasSourcePresentation(definition, source.id)) cleared.push('Customized item presentation');
          next = pruneChart({ ...next, series: next.series.filter(series => series.sourceId !== source.id) });
        }
        const { selection: _selection, ...base } = source;
        next = { ...next, sources: next.sources.map(item => item.id === source.id ? { ...base, ...(selection ? { selection } : {}) } : item) };
        if (selection) next = ensureSeries(next, { ...base, selection });
        if (action.all) {
          // Exact declarations become dormant-capable overrides under the live declaration.
          const live = next.series.find(series => series.sourceId === source.id && series.metric === 'value' && !series.resourceGuid)!;
          const exact = next.series.filter(series => series.sourceId === source.id && series.metric === 'value' && series.resourceGuid);
          const overrides = [...live.overrides ?? []];
          for (const series of exact) {
            const { id: _id, sourceId: _source, metric: _metric, overrides: own, ...appearance } = series;
            for (const item of own ?? []) {
              if (!overrides.some(existing => (existing.accountGuid ?? definition.accountGuid) === (item.accountGuid ?? definition.accountGuid)
                && (item.resourceGuid !== undefined ? existing.resourceGuid === item.resourceGuid : existing.seriesId === item.seriesId))) overrides.push(item);
            }
            const override = own?.find(item => overrideMatches(item, { resourceGuid: series.resourceGuid! }, definition.accountGuid))
              ?? own?.find(item => overrideMatches(item, { seriesId: predictorSeriesId(source.id, series.resourceGuid!) }, definition.accountGuid));
            const { seriesId: _seriesId, resourceGuid: _resourceGuid, accountGuid: _accountGuid, ...custom } = override ?? {};
            const index = overrides.findIndex(item => overrideMatches(item, { resourceGuid: series.resourceGuid! }, definition.accountGuid));
            const retained = { ...appearance, ...custom, resourceGuid: series.resourceGuid!, accountGuid: definition.accountGuid };
            if (index < 0) overrides.push(retained); else overrides[index] = retained;
          }
          next = { ...next, series: next.series.filter(series => !exact.includes(series)).map(series => series.id === live.id ? { ...series, ...(overrides.length ? { overrides } : {}) } : series) };
        }
        affect({ kind: 'resources', sourceId: source.id });
        nextSection = { kind: 'source', sourceId: source.id };
      } else if (action.kind === 'item-style' && projectPredictorItems(definition, source.id, context.snapshot)
        .some(item => item.identity.resourceGuid === action.item.resourceGuid && action.item.resourceGuid !== undefined)) {
        next = patchItem(definition, source, action.item, action.changes);
      } else return { state: 'unchanged' };
    } else {
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
      const items = removed.length ? projectDecisionItems(definition, source.id, context.snapshot) : [];
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
      const firstItem = projectDecisionItems(next, source.id, context.snapshot)[0];
      nextSection = firstItem ? { kind: 'item', sourceId: source.id, itemKey: firstItem.key } : { kind: 'data-settings', sourceId: source.id };
    } else if (action.kind === 'item-style') {
      next = patchItem(definition, source, action.item, action.changes);
    }
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
  if (next.chart?.kind === 'scatter' && ['selection-mode', 'toggle-resource', 'set-resources', 'source-settings', 'analysis-binding', 'remove-source-kind', 'energy-use-selection-mode', 'energy-use-resources', 'predictor-selection', 'equipment-selection', 'equipment-defaults', 'analysis-defaults'].includes(action.kind)) {
    const chart = { ...next.chart };
    for (const axis of ['x', 'y'] as const) {
      const selector = chart[axis]; if (!selector) continue;
      const items = projectDecisionItems(next, selector.sourceId, context.snapshot);
      const retained = items.some(item => selector.resourceGuid !== undefined ? item.identity.resourceGuid === selector.resourceGuid : item.identity.seriesId === selector.seriesId);
      if (!retained) { delete chart[axis]; cleared.push(`Scatter ${axis.toUpperCase()} series binding`); affect({ kind: 'chart' }); }
    }
    next = { ...next, chart };
  }
  next = cleanJson(next);
  if (visualizationIntentEqual(next, definition)) return { state: 'unchanged' };
  const invalidated = context.invalidNodeIds?.filter(id => affected.has(id)
    || !!id.split(':')[1] && affected.has(`source:${id.split(':')[1]}`)) ?? [];
  if (invalidated.length) cleared.push('Incomplete input in the affected sections');
  return { state: cleared.length ? 'confirm' : 'apply', definition: next, cleared: [...new Set(cleared)], affectedNodeIds: [...affected], ...(nextSection ? { next: nextSection } : {}) };
}
