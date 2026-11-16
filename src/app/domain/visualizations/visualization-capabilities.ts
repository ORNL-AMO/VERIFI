import { resolveVisualizationSeries } from './visualization-series';
import type { VisualizationChart, VisualizationDefinition, VisualizationScope, VisualizationSource } from './visualization-definition';
import { decodeVisualizationDefinition } from './visualization-validation';
import {
  isCurrentVisualizationResponse, sameVisualizationScope, VisualizationControl, VisualizationDataShape,
  VisualizationObservation, VisualizationResolvedData, VisualizationResolvedReference, VisualizationSourceEvidence
} from './visualization-source-provider';

export interface ChartCapability {
  readonly kind: VisualizationChart['kind'];
  readonly shapes: readonly VisualizationDataShape[];
  readonly controls: readonly VisualizationControl[];
  readonly allowDateOverride: boolean;
}

/** Rendering registrations alone never grant a source permission to use a chart. */
export const CHART_CAPABILITIES: Readonly<Record<VisualizationChart['kind'], ChartCapability>> = {
  'time-series': { kind: 'time-series', shapes: ['time-series'], controls: ['series', 'appearance', 'axes', 'stacking'], allowDateOverride: true },
  scatter: { kind: 'scatter', shapes: ['pairs', 'time-series'], controls: ['series', 'appearance', 'axes', 'fit'], allowDateOverride: true },
  correlation: { kind: 'correlation', shapes: ['matrix', 'pairs', 'time-series'], controls: ['series', 'appearance', 'normalization'], allowDateOverride: true },
  heatmap: { kind: 'heatmap', shapes: ['matrix', 'time-series'], controls: ['series', 'appearance'], allowDateOverride: true },
  breakdown: { kind: 'breakdown', shapes: ['breakdown'], controls: ['series', 'appearance', 'denominator'], allowDateOverride: true },
  treemap: { kind: 'treemap', shapes: ['hierarchy'], controls: ['series', 'appearance', 'hierarchy', 'denominator'], allowDateOverride: true },
  sankey: { kind: 'sankey', shapes: ['flow'], controls: ['series', 'appearance', 'denominator'], allowDateOverride: true }
};

export interface VisualizationCompatibilityReason {
  readonly code: 'definition' | 'capability' | 'missing-source' | 'ownership' | 'stale' | 'series' | 'period' | 'units' | 'data';
  readonly message: string;
  readonly sourceId?: string;
}
export type VisualizationCompatibilityResult =
  | { readonly state: 'compatible'; readonly controls: readonly VisualizationControl[]; readonly allowDateOverride: boolean }
  | { readonly state: 'unavailable'; readonly reasons: readonly VisualizationCompatibilityReason[] };

type RequiredReference = Pick<VisualizationResolvedReference, 'kind' | 'id'>;

/** JSON intent has unordered object keys and ordered arrays; no serialization callbacks are used. */
function sameIntent(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    for (let index = 0; index < left.length; index++)
      if (!Object.hasOwn(left, index) || !Object.hasOwn(right, index) || !sameIntent(left[index], right[index])) return false;
    return true;
  }
  if (![Object.prototype, null].includes(Object.getPrototypeOf(left)) || ![Object.prototype, null].includes(Object.getPrototypeOf(right))) return false;
  const a = left as Record<string, unknown>, b = right as Record<string, unknown>;
  const keys = Object.keys(a).filter(key => a[key] !== undefined);
  return keys.length === Object.keys(b).filter(key => b[key] !== undefined).length
    && keys.every(key => Object.hasOwn(b, key) && sameIntent(a[key], b[key]));
}

function civilDate(value: string | undefined): boolean {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function requiredReferences(source: VisualizationSource): RequiredReference[] {
  const required: RequiredReference[] = [];
  if ('selection' in source && source.selection) {
    const selection = source.selection;
    if (selection.kind === 'fixed') required.push(...selection.guids.map(id => ({ kind: selection.resource, id })));
    else {
      required.push(...(selection.filter.facilityGuids ?? []).map(id => ({ kind: 'facility' as const, id })));
      const groupKind = source.kind === 'energy-use' ? 'energy-use-group' as const : 'meter-group' as const;
      required.push(...(selection.filter.groupGuids ?? []).map(id => ({ kind: groupKind, id })));
    }
  }
  if (source.kind === 'utility' && source.charge) required.push({ kind: 'meter', id: source.charge.meterGuid }, { kind: 'charge', id: source.charge.chargeGuid });
  if (source.kind === 'analysis') {
    if (source.analysisGuid) required.push({ kind: 'analysis', id: source.analysisGuid });
    if (source.groupGuid) required.push({ kind: 'analysis-group', id: source.groupGuid });
    if (source.mode === 'model') {
      if (source.modelId) required.push({ kind: 'model', id: source.modelId });
      if (source.comparisonModelId) required.push({ kind: 'model', id: source.comparisonModelId });
    }
  }
  return required;
}

function observations(data: VisualizationResolvedData['data']): readonly VisualizationObservation[] {
  switch (data.kind) {
    case 'time-series': return data.rows.flatMap(row => Object.values(row.values));
    case 'pairs': return data.pairs.flatMap(pair => [pair.x, pair.y]);
    case 'matrix': return data.cells.map(cell => cell.observation);
    case 'breakdown': return data.items.map(item => item.observation);
    case 'hierarchy': return data.nodes.map(node => node.observation);
    case 'flow': return data.links.map(link => link.observation);
  }
}

function explicitSourceFacilities(source: VisualizationSource): readonly string[] | undefined {
  const selection = 'selection' in source ? source.selection : undefined;
  return selection?.kind === 'rule' ? selection.filter.facilityGuids?.length ? selection.filter.facilityGuids : undefined
    : selection?.kind === 'fixed' && selection.resource === 'facility' ? selection.guids : undefined;
}

/** Applies to named source identities and plotted/expanded resource identities alike. */
function referenceSelectionReasons(source: VisualizationSource, reference: VisualizationResolvedReference): VisualizationCompatibilityReason[] {
  const reasons: VisualizationCompatibilityReason[] = [];
  const selection = 'selection' in source ? source.selection : undefined;
  if (selection?.kind === 'fixed' && reference.kind === selection.resource && !selection.guids.includes(reference.id))
    reasons.push({ code: 'series', message: `Resolved resource ${reference.id} is outside the saved fixed selection.`, sourceId: source.id });
  const facilities = explicitSourceFacilities(source);
  const facility = reference.kind === 'facility' ? reference.id : reference.facilityGuid;
  if (facilities !== undefined && facility !== undefined && !facilities.includes(facility))
    reasons.push({ code: 'ownership', message: `Resolved resource ${reference.id} contradicts the saved facility selection.`, sourceId: source.id });
  return reasons;
}

/** A GUID must resolve in the source's resource namespace, including rule-derived series. */
function seriesReferenceKinds(source: VisualizationSource, guid: string): readonly VisualizationResolvedReference['kind'][] {
  if (source.kind === 'utility') {
    const grouping = { facility: 'facility', group: 'meter-group', meter: 'meter' } as const;
    return source.groupBy === 'facility' || source.groupBy === 'group' || source.groupBy === 'meter'
      ? [grouping[source.groupBy]] : source.selection ? [source.selection.resource] : [];
  }
  if (source.kind === 'predictor') return ['predictor'];
  if (source.kind === 'energy-use') return source.selection ? [source.selection.resource] : [];
  if (source.kind === 'analysis') {
    if (guid === source.analysisGuid) return ['analysis'];
    if (guid === source.groupGuid) return ['analysis-group'];
    if (source.mode === 'model' && (guid === source.modelId || guid === source.comparisonModelId)) return ['model'];
    return ['facility', 'analysis-group'];
  }
  return [];
}

/**
 * Providers own relative/fiscal date math. Native intervals may overlap a fixed/custom request
 * at its edges, but rows retain original dates, fit declared role intervals, and overlap that
 * role's requested dates. Sparse coverage is valid; substituting another period is not.
 */
function resolvedDataReasons(definition: VisualizationDefinition, source: VisualizationSource,
  resolved: VisualizationResolvedData, scope: VisualizationScope): VisualizationCompatibilityReason[] {
  const reasons: VisualizationCompatibilityReason[] = [];
  const add = (code: 'period' | 'data' | 'series' | 'ownership', message: string) => reasons.push({ code, message, sourceId: source.id });
  const validRange = (range: { start: string; end: string }) => civilDate(range.start) && civilDate(range.end) && range.start <= range.end;
  const overlaps = (left: { start: string; end: string }, right: { start: string; end: string }) => left.start <= right.end && right.start <= left.end;
  const requestedRange = (role: 'primary' | 'comparison') => role === 'primary'
    ? definition.period.kind === 'fixed' ? definition.period : undefined
    : definition.comparison.kind === 'custom' ? definition.comparison : undefined;
  const requiredRoles: readonly ('primary' | 'comparison')[] = definition.comparison.kind === 'none' ? ['primary'] : ['primary', 'comparison'];
  for (const role of requiredRoles) if (!resolved.periods.some(period => period.role === role))
    add('period', `Resolve the requested ${role} period before rendering.`);
  if (definition.comparison.kind === 'none' && resolved.periods.some(period => period.role === 'comparison'))
    add('period', 'Comparison periods cannot be returned when no comparison was requested.');
  for (const period of resolved.periods) {
    if (!validRange(period)) add('period', 'Resolved periods require real civil dates in start/end order.');
    const requested = requestedRange(period.role);
    if (requested && !overlaps(period, requested)) add('period', 'Resolved native periods must overlap their requested fixed/custom dates.');
    if (period.role === 'primary' && definition.period.kind === 'fiscal-year' && period.fiscalYear !== definition.period.year)
      add('period', 'Resolve the explicitly selected fiscal year.');
    const facilities = explicitSourceFacilities(source);
    if (period.facilityGuid !== undefined && (!period.facilityGuid.trim()
      || !scope.facilityGuids.includes(period.facilityGuid)
      || facilities !== undefined && !facilities.includes(period.facilityGuid)))
      add('ownership', 'Resolved period ownership contradicts the saved facility scope or selection.');
  }
  const metadataIds = new Set(resolved.series.map(series => series.id));
  if (metadataIds.size !== resolved.series.length || resolved.series.some(series => !series.id.trim()))
    add('series', 'Resolved series IDs must be nonempty and unique.');
  const selectedMetadata = resolveVisualizationSeries(definition, resolved.series).map(entry => entry.metadata);
  const data = resolved.data;
  if (!observations(data).length) add('data', 'Use an empty source resolution when no explicit observations are available.');
  if (data.kind === 'time-series') {
    for (const row of data.rows) {
      const role = row.role ?? 'primary';
      const requested = requestedRange(role);
      if (!validRange(row) || !resolved.periods.some(period => period.role === role && period.start <= row.start && period.end >= row.end)
        || requested && !overlaps(row, requested))
        add('period', 'Rows must retain valid native dates inside declared intervals and overlap the requested dates for their role.');
      if (Object.keys(row.values).some(id => !metadataIds.has(id))) add('series', 'Observation keys must identify declared resolved series.');
    }
    for (const series of selectedMetadata) for (const role of requiredRoles) {
      if (!data.rows.some(row => (row.role ?? 'primary') === role && Object.hasOwn(row.values, series.id)))
        add('series', `Supply observed or explicit missing/excluded/padding values for ${series.id} in the ${role} period.`);
    }
  } else if (data.kind === 'matrix' && definition.chart?.kind === 'heatmap' && definition.chart.dimension === 'series-period') {
    if (data.cells.some(cell => !metadataIds.has(cell.row))) add('series', 'Series-period matrix rows must identify declared resolved series.');
    for (const series of selectedMetadata) if (!data.cells.some(cell => cell.row === series.id))
      add('series', `Supply explicit cells for the selected series ${series.id}.`);
  }
  return reasons;
}

/** Runtime inclusion is resolved once from the current account catalog, never inferred from source output. */
function scopeMatchesSelection(definition: VisualizationDefinition, scope: VisualizationScope): boolean {
  const ids = scope.facilityGuids;
  if (!ids.length || new Set(ids).size !== ids.length || ids.some(id => !id.trim())) return false;
  const selected = definition.facilitySelection;
  if (selected.kind === 'fixed' && (ids.length !== selected.facilityGuids.length || ids.some(id => !selected.facilityGuids.includes(id)))) return false;
  const owner = selected.kind === 'fixed' ? selected.facilityGuids : ids;
  return owner.length === 1 ? scope.kind === 'facility' && scope.facilityGuid === owner[0] : scope.kind === 'portfolio';
}

/** Pure eligibility decision. It neither alters intent nor implements provider calculations or alignment. */
export function checkVisualizationCompatibility(definition: VisualizationDefinition,
  evidence: readonly VisualizationSourceEvidence[]): VisualizationCompatibilityResult {
  const validation = decodeVisualizationDefinition(definition);
  if (validation.state !== 'valid') return { state: 'unavailable', reasons: validation.issues.map(entry => ({ code: 'definition', message: entry.message })) };
  const chart = definition.chart!;
  const chartCapability = CHART_CAPABILITIES[chart.kind];
  const reasons: VisualizationCompatibilityReason[] = [];
  const add = (code: VisualizationCompatibilityReason['code'], message: string, sourceId?: string) => reasons.push({ code, message, ...(sourceId ? { sourceId } : {}) });
  const resolvedSources: { source: VisualizationSource; resolved: VisualizationResolvedData }[] = [];
  if (evidence.some(entry => !definition.sources.some(source => source.id === entry.request.identity.sourceId)))
    add('missing-source', 'Remove evidence that does not belong to a declared source.');
  const firstRequest = evidence[0]?.request.identity;
  for (const source of definition.sources) {
    const matches = evidence.filter(entry => entry.request.identity.sourceId === source.id);
    if (matches.length !== 1) { add('missing-source', 'Resolve this source exactly once before rendering.', source.id); continue; }
    const { request, capabilities, chartSupport, resolution } = matches[0];
    if (!isCurrentVisualizationResponse(request.identity, resolution)
      || request.identity.accountGuid !== definition.accountGuid || !scopeMatchesSelection(definition, request.identity.scope)
      || request.identity.sourceId !== source.id || !sameIntent(source, request.source)
      || !sameIntent(chart, request.chart)
      || !sameIntent(definition.period, request.period) || !sameIntent(definition.comparison, request.comparison)
      || !sameIntent(definition.series.filter(series => series.sourceId === source.id), request.series)
      || firstRequest && (request.identity.workspaceRevision !== firstRequest.workspaceRevision || request.identity.definitionGuid !== firstRequest.definitionGuid
        || request.identity.definitionRevision !== firstRequest.definitionRevision || request.identity.requestId !== firstRequest.requestId)
      || firstRequest && !sameVisualizationScope(request.identity.scope, firstRequest.scope)
      || !sameIntent(request.dateContext, evidence[0]?.request.dateContext)) {
      add('stale', 'Resolve the current definition against one current workspace revision.', source.id); continue;
    }
    if (!civilDate(request.dateContext.calendarDate)
      || request.dateContext.latestDataDate !== undefined && !civilDate(request.dateContext.latestDataDate)
      || definition.period.kind === 'rolling' && definition.period.anchor === 'latest-data' && !request.dateContext.latestDataDate)
      add('period', 'Resolve one calendar date and the newest eligible observation across all selected sources before requesting data.', source.id);
    if (capabilities.kind !== source.kind || !capabilities.measures.includes(source.measure)
      || !capabilities.aggregations.includes(source.aggregation) || !capabilities.periods.includes(definition.period.kind)
      || !capabilities.comparisons.includes(definition.comparison.kind) || !capabilities.chartKinds.includes(chart.kind))
      add('capability', 'This source does not support the requested measure, aggregation, period, comparison, or chart.', source.id);
    if (!sameIntent(chart, chartSupport.chart) || chartSupport.state !== 'supported')
      add('capability', chartSupport.state === 'unsupported' ? chartSupport.reasons.join(' ') : 'Review support for these exact chart settings.', source.id);
    if (Object.keys(source.settings ?? {}).some(key => !capabilities.settings.includes(key as 'unit' | 'energyTreatment')))
      add('capability', 'This source cannot preserve the requested setting binding.', source.id);
    if (chart.kind === 'time-series' && chart.stack !== 'none' && !capabilities.controls.includes('stacking')
      || definition.series.some(series => series.sourceId === source.id && series.axis === 'right') && !capabilities.controls.includes('axes')
      || chart.kind === 'scatter' && chart.showFit && !capabilities.controls.includes('fit')
      || chart.kind === 'correlation' && chart.scale === 'z-score' && !capabilities.controls.includes('normalization'))
      add('capability', 'This source does not support the requested chart transformation.', source.id);
    if (resolution.state !== 'ready') {
      add(resolution.state === 'missing-source' ? 'missing-source' : 'data', resolution.message, source.id); continue;
    }
    const resolved = resolution.resolved;
    if (!capabilities.controls.includes('axes') && resolveVisualizationSeries(definition, resolved.series).some(entry => entry.selected.axis === 'right'))
      add('capability', 'This source does not support the requested axis override.', source.id);
    reasons.push(...resolvedDataReasons(definition, source, resolved, request.identity.scope));
    if (!chartCapability.shapes.includes(resolved.data.kind) || !capabilities.shapes.includes(resolved.data.kind)
      || !capabilities.alignments.includes(resolved.alignment.kind))
      add('capability', 'This chart cannot preserve the resolved data shape.', source.id);
    if (source.kind === 'analysis' && resolved.analysisFreshness !== 'current')
      add('stale', 'Wait for current authoritative analysis results; stale results cannot be displayed.', source.id);
    for (const reference of requiredReferences(source)) {
      const candidates = resolved.references.filter(candidate => candidate.kind === reference.kind && candidate.id === reference.id);
      if (!candidates.length)
        add('missing-source', `Repair the missing ${reference.kind} reference: ${reference.id}.`, source.id);
      for (const candidate of candidates) reasons.push(...referenceSelectionReasons(source, candidate));
    }
    if (resolved.references.some(reference => reference.accountGuid !== definition.accountGuid
      || (reference.kind === 'facility' ? !request.identity.scope.facilityGuids.includes(reference.id)
        : reference.facilityGuid !== undefined ? !request.identity.scope.facilityGuids.includes(reference.facilityGuid)
          : definition.facilitySelection.kind !== 'all' || request.identity.scope.kind === 'facility')))
      add('ownership', 'Resolved references must belong to the saved account and facility scope.', source.id);
    if (!resolved.periods.length) add('period', 'Resolve actual native period intervals before rendering.', source.id);
    if (observations(resolved.data).some(point => point.state === 'observed' && !Number.isFinite(point.value)))
      add('data', 'Nonfinite observations cannot be rendered as valid data.', source.id);
    if ((chart.kind === 'sankey' || chart.kind === 'treemap' || chart.kind === 'breakdown' && chart.type === 'donut')
      && observations(resolved.data).some(point => point.state === 'observed' && point.value < 0))
      add('data', 'This composition contains unsupported negative contributions; use the source details to repair it.', source.id);
    resolvedSources.push({ source, resolved });
  }
  const allMetadata = resolvedSources.flatMap(entry => entry.resolved.series);
  const selected = resolveVisualizationSeries(definition, allMetadata);
  if (!selected.length) add('series', 'Choose at least one available visible series.');
  for (const series of definition.series) {
    const available = allMetadata.some(metadata => metadata.sourceId === series.sourceId && metadata.metric === series.metric
      && (series.resourceGuid === undefined || metadata.resourceGuid === series.resourceGuid));
    if (!available && series.visible !== false) add('series', `Resolve the selected metric/resource for ${series.id}.`, series.sourceId);
  }
  for (const { selected: series, metadata } of selected) {
    const entry = resolvedSources.find(entry => entry.source.id === series.sourceId)!;
    const resourceGuid = metadata.resourceGuid;
    if (resourceGuid !== undefined) {
      const references = entry.resolved.references.filter(reference => reference.id === resourceGuid
        && seriesReferenceKinds(entry.source, resourceGuid).includes(reference.kind));
      if (!resourceGuid.trim() || !references.length)
        add('missing-source', `Repair the selected series resource: ${resourceGuid}.`, series.sourceId);
      for (const reference of references) reasons.push(...referenceSelectionReasons(entry.source, reference));
    }
    const unit = entry.source.settings?.unit;
    if (unit?.kind === 'pinned' && metadata.unit !== unit.value)
      add('units', 'Resolve the pinned unit before rendering; a unit label is not a conversion.', series.sourceId);
    const treatment = entry.source.settings?.energyTreatment;
    if (treatment?.kind === 'pinned' && metadata.energyTreatment !== treatment.value)
      add('units', 'Resolve the pinned site/source treatment before rendering.', series.sourceId);
  }
  const shapeKinds = new Set(resolvedSources.map(entry => entry.resolved.data.kind));
  if (shapeKinds.size > 1) add('capability', 'Combine sources only after a provider supplies one compatible data shape.');
  if (new Set(resolvedSources.map(entry => `${entry.resolved.alignment.kind}:${entry.resolved.alignment.key}`)).size > 1)
    add('period', 'Sources must declare the same observation alignment; implicit pairing is unsupported.');
  const periods = resolvedSources.flatMap(entry => entry.resolved.periods);
  if (new Set(periods.map(period => `${period.interval}:${period.basis}`)).size > 1)
    add('period', 'Sources need compatible native intervals and calendar/fiscal alignment.');
  if (chart.kind === 'time-series' && chart.interval !== 'native' && periods.some(period => period.interval !== chart.interval))
    add('period', 'The requested chart interval requires an explicitly supported provider projection.');
  const fiscalSlots = new Map<string, Set<string>>();
  for (const period of periods.filter(period => period.interval === 'yearly' && period.basis === 'fiscal')) {
    if (period.fiscalYear === undefined) { add('period', 'Fiscal intervals require their authoritative fiscal-year identity.'); continue; }
    const key = `${period.role}:${period.fiscalYear}`;
    const intervals = fiscalSlots.get(key) ?? new Set<string>();
    intervals.add(`${period.start}:${period.end}`); fiscalSlots.set(key, intervals);
  }
  if ([...fiscalSlots.values()].some(intervals => intervals.size > 1))
    add('period', 'Fiscal rollups require the same actual interval for each year and comparison role, not just matching labels.');
  if (chart.kind !== 'scatter' && chart.kind !== 'correlation') {
    for (const axis of ['left', 'right'] as const) {
      const axisSeries = selected.filter(entry => chart.kind !== 'time-series' || entry.selected.axis === axis);
      if (new Set(axisSeries.map(entry => `${entry.metadata.dimension}:${entry.metadata.unit}:${entry.metadata.currency ?? ''}`)).size > 1)
        add('units', 'Use compatible units and currency on each axis; composition totals require one meaning.');
    }
  }
  if (chart.kind === 'time-series' && chart.stack !== 'none' || ['breakdown', 'treemap', 'sankey'].includes(chart.kind)) {
    if (selected.some(entry => !entry.metadata.additive)) add('units', 'Stacking and composition require authoritative additive measures.');
    const contributions = new Set<string>();
    for (const { metadata } of selected) {
      if (!metadata.contributionKeys?.length || metadata.contributionKeys.some(key => !key.trim())) {
        add('data', 'Resolve canonical underlying contribution identities before computing totals or stacks.'); continue;
      }
      for (const key of metadata.contributionKeys) {
        if (contributions.has(key)) add('data', 'These series overlap underlying contributions; select a non-overlapping total.');
        contributions.add(key);
      }
    }
    if (new Set(selected.map(entry => entry.metadata.energyTreatment ?? 'not-applicable')).size > 1)
      add('units', 'Site and source energy treatments may be compared but cannot contribute to one stack or composition total.');
    if (chart.kind === 'time-series' && new Set(selected.map(entry => entry.selected.axis)).size > 1)
      add('units', 'Stacking cannot combine different axes.');
  }
  if (reasons.length) return { state: 'unavailable', reasons };
  const controls = chartCapability.controls.filter(control => evidence.every(entry => entry.capabilities.controls.includes(control)));
  return { state: 'compatible', controls, allowDateOverride: chartCapability.allowDateOverride && evidence.every(entry => entry.capabilities.allowDateOverride) };
}
