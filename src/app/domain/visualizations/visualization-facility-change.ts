import { visualizationSeriesReference } from './visualization-references';
import type { ResourceSelection, VisualizationDefinition, VisualizationFacilitySelection, VisualizationSeries, VisualizationSource } from './visualization-definition';
import { resolveVisualizationFacilities, sameVisualizationFacilitySelection, type VisualizationFacilityCatalog, type VisualizationFacilityResource } from './visualization-facilities';

/** Shared review/commit policy. Unknown identities remain exact repairable intent. */
export function prepareVisualizationFacilityChange(definition: VisualizationDefinition, targetFacilities: VisualizationFacilitySelection,
  catalog: VisualizationFacilityCatalog): { readonly definition: VisualizationDefinition; readonly cleared: readonly string[] } {
  if (sameVisualizationFacilitySelection(definition.facilitySelection, targetFacilities)) return { definition, cleared: [] };
  targetFacilities = targetFacilities.kind === 'fixed' ? { kind: 'fixed', facilityGuids: [...targetFacilities.facilityGuids].sort() } : targetFacilities;
  const scope = resolveVisualizationFacilities({ ...definition, facilitySelection: targetFacilities }, catalog.facilities).scope;
  const included = new Set(targetFacilities.kind === 'fixed' ? targetFacilities.facilityGuids : scope.facilityGuids), cleared = new Set<string>(), resetSources = new Set<string>();
  const knownExcluded = (resource: VisualizationFacilityResource | undefined, isFacility = false) => !!resource
    && resource.accountId === definition.accountGuid && !!(isFacility ? resource.guid : resource.facilityId)
    && !included.has(isFacility ? resource.guid : resource.facilityId!);
  const resources = (kind: string) => kind === 'facility' ? catalog.facilities : kind === 'meter' ? catalog.meters
    : kind === 'meter-group' ? catalog.meterGroups : kind === 'predictor' ? catalog.predictors
    : kind === 'equipment' ? catalog.energyUseEquipment : kind === 'energy-use-group' ? catalog.energyUseGroups : [];
  const excluded = (kind: string, guid: string) => knownExcluded(resources(kind).find(item => item.guid === guid), kind === 'facility');
  const pruneSelection = (selection: ResourceSelection, source: VisualizationSource): ResourceSelection | undefined => {
    if (selection.kind === 'fixed') {
      const guids = selection.guids.filter(guid => !excluded(selection.resource, guid));
      if (guids.length === selection.guids.length) return selection;
      cleared.add('Excluded resource selections');
      return guids.length ? { ...selection, guids } : undefined;
    }
    const filter = { ...selection.filter };
    const facilities = filter.facilityGuids?.filter(guid => !excluded('facility', guid));
    const groups = filter.groupGuids?.filter(guid => !excluded(source.kind === 'energy-use' ? 'energy-use-group' : 'meter-group', guid));
    const lostFacilities = !!filter.facilityGuids?.length && facilities?.length !== filter.facilityGuids.length;
    const lostGroups = !!filter.groupGuids?.length && groups?.length !== filter.groupGuids.length;
    if (lostFacilities || lostGroups) cleared.add('Selections outside the included facilities');
    // Removing the final anchor must not convert a restrictive rule into All.
    if (lostFacilities && !facilities?.length || lostGroups && !groups?.length) return undefined;
    if (facilities) filter.facilityGuids = facilities;
    if (groups) filter.groupGuids = groups;
    return { ...selection, filter };
  };
  const sources = definition.sources.map(source => {
    if (source.kind === 'analysis') {
      const analysis = [...catalog.facilityAnalyses, ...catalog.accountAnalyses].find(item => item.guid === source.analysisGuid);
      if (!knownExcluded(analysis)) return source;
      cleared.add('Excluded analysis bindings'); resetSources.add(source.id);
      const { analysisGuid: _analysis, groupGuid: _group, ...base } = source;
      if (base.mode === 'model') { const { modelId: _model, comparisonModelId: _comparison, ...unbound } = base; return unbound; }
      return base;
    }
    const { selection: _selection, ...base } = source;
    const selection = source.selection ? pruneSelection(source.selection, source) : undefined;
    if (source.selection && !selection) resetSources.add(source.id);
    if (source.kind === 'utility' && source.charge && excluded('meter', source.charge.meterGuid)) {
      cleared.add('Excluded named charge'); resetSources.add(source.id);
      const { charge: _charge, ...unbound } = base as Extract<VisualizationSource, { kind: 'utility' }>;
      return unbound;
    }
    return { ...base, ...(selection ? { selection } : {}) };
  });
  const itemExcluded = (source: VisualizationSource | undefined, guid: string) => {
    if (!source) return false;
    const kind = visualizationSeriesReference(source, guid, definition.facilitySelection).kind;
    return !!kind && excluded(kind, guid);
  };
  const custom = (series: VisualizationSeries) => !!series.label || !!series.color || series.axis === 'right'
    || series.lineStyle !== undefined || series.visible === false || !!series.overrides?.length;
  const series = definition.series.flatMap(series => {
    const source = definition.sources.find(source => source.id === series.sourceId);
    if (resetSources.has(series.sourceId) || series.resourceGuid && itemExcluded(source, series.resourceGuid)) {
      if (custom(series)) cleared.add('Excluded item presentation');
      return [];
    }
    const overrides = series.overrides?.filter(override => {
      if (override.accountGuid && override.accountGuid !== definition.accountGuid) return true;
      const providerResource = source?.kind === 'utility' && override.seriesId?.startsWith(`${source.id}:`) ? override.seriesId.slice(`${source.id}:`.length) : undefined;
      const excludedIdentity = override.resourceGuid !== undefined ? itemExcluded(source, override.resourceGuid)
        : providerResource && itemExcluded(source, providerResource) || source?.kind === 'utility' && source.groupBy === 'group' && override.seriesId.startsWith(`${source.id}:unassigned:`)
          && excluded('facility', override.seriesId.slice(`${source.id}:unassigned:`.length));
      if (excludedIdentity) cleared.add('Excluded item presentation');
      return !excludedIdentity;
    });
    const { overrides: _overrides, ...base } = series;
    return [{ ...base, ...(overrides?.length ? { overrides } : {}) }];
  });
  let chart = definition.chart;
  if (chart?.kind === 'time-series' && chart.seriesTypes) {
    chart = { ...chart, seriesTypes: chart.seriesTypes.filter(item => series.some(selected => selected.id === item.seriesId)) };
  }
  if (chart?.kind === 'scatter') {
    const { xSeriesId, ySeriesId, ...base } = chart;
    chart = { ...base, ...(series.some(item => item.id === xSeriesId) ? { xSeriesId } : {}), ...(series.some(item => item.id === ySeriesId) ? { ySeriesId } : {}) };
  }
  const { chart: _chart, ...base } = definition;
  return { definition: structuredClone({ ...base, facilitySelection: targetFacilities, sources, series, ...(chart ? { chart } : {}) }), cleared: [...cleared] };
}
