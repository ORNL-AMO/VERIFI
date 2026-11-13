import type { VisualizationDefinition, VisualizationSource } from '../visualization-definition';
import type { IdbPredictor } from '@data/models/idbModels/predictor';
import type {
  VisualizationData, VisualizationObservation, VisualizationProvenance, VisualizationResolvedReference, VisualizationSourceCapabilities,
  VisualizationSourceEvidence, VisualizationSourceProvider, VisualizationSourceRequest, VisualizationSourceResolution
} from '../visualization-source-provider';

export const observed = (value: number): VisualizationObservation => ({ state: 'observed', value, provenance: 'measured', partial: false });

/** Contract evidence, not an adapter to VERIFI records or calculations. */
export function visualizationEvidenceFixture(definition: VisualizationDefinition, sourceIndex = 0,
  predictors: readonly Pick<IdbPredictor, 'guid' | 'predictorType'>[] = []): VisualizationSourceEvidence {
  const source = definition.sources[sourceIndex];
  const facilityGuid = definition.scope.kind === 'facility' ? definition.scope.facilityGuid : 'facility-a';
  const reference = (kind: VisualizationResolvedReference['kind'], id: string): VisualizationResolvedReference =>
    ({ kind, id, accountGuid: definition.accountGuid, facilityGuid });
  const references: VisualizationResolvedReference[] = definition.scope.kind === 'facility' ? [reference('facility', facilityGuid)] : [];
  if ('selection' in source && source.selection) {
    const selection = source.selection;
    if (selection.kind === 'fixed') references.push(...selection.guids.map(id => reference(selection.resource, id)));
    else {
      references.push(...(selection.filter.facilityGuids ?? []).map(id => reference('facility', id)));
      references.push(...(selection.filter.groupGuids ?? []).map(id => reference(source.kind === 'energy-use' ? 'energy-use-group' : 'meter-group', id)));
    }
  }
  if (source.kind === 'analysis') {
    if (source.analysisGuid) references.push(reference('analysis', source.analysisGuid));
    if (source.groupGuid) references.push(reference('analysis-group', source.groupGuid));
    if (source.mode === 'model') for (const id of [source.modelId, source.comparisonModelId]) if (id) references.push(reference('model', id));
  }
  if (source.kind === 'utility' && source.charge) references.push(reference('meter', source.charge.meterGuid), reference('charge', source.charge.chargeGuid));
  const series = definition.series.filter(selected => selected.sourceId === source.id);
  const provenance: VisualizationProvenance = source.kind === 'energy-use' ? 'estimated'
    : source.kind === 'predictor' ? 'predictor' : source.kind === 'analysis' && source.mode === 'model' && source.measure !== 'actual' ? 'modeled'
    : source.kind === 'analysis' && source.mode === 'result' && source.measure !== 'actual' ? source.measure === 'calculated' ? 'modeled' : 'savings' : 'measured';
  const seriesProvenance = (resourceGuid?: string): VisualizationProvenance => source.kind === 'predictor'
    ? predictors.find(predictor => predictor.guid === resourceGuid)?.predictorType === 'Weather' ? 'weather' : 'predictor' : provenance;
  const point = (value: number, origin: VisualizationProvenance = provenance): VisualizationObservation => ({ state: 'observed', value, provenance: origin, partial: false });
  const primaryPeriod = definition.period.kind === 'fixed'
    ? { role: 'primary' as const, interval: 'monthly' as const, start: definition.period.start, end: definition.period.end, basis: definition.period.basis }
    : definition.period.kind === 'fiscal-year'
      ? { role: 'primary' as const, interval: source.kind === 'energy-use' ? 'yearly' as const : 'monthly' as const, basis: 'fiscal' as const,
        fiscalYear: definition.period.year, start: `${definition.period.year}-01-01`, end: `${definition.period.year}-12-31`, facilityGuid }
    : source.kind === 'energy-use'
      ? { role: 'primary' as const, interval: 'yearly' as const, basis: 'fiscal' as const, fiscalYear: 2025, start: '2024-10-01', end: '2025-09-30', facilityGuid }
      : { role: 'primary' as const, interval: 'monthly' as const, basis: 'calendar' as const, start: '2025-01-01', end: '2025-12-31' };
  const comparisonPeriod = definition.comparison.kind === 'none' ? undefined
    : definition.comparison.kind === 'custom' ? { ...primaryPeriod, role: 'comparison' as const, start: definition.comparison.start, end: definition.comparison.end }
    : { ...primaryPeriod, role: 'comparison' as const, start: '2024-01-01', end: '2024-12-31' };
  const rows = [{ periodKey: primaryPeriod.start, start: primaryPeriod.start,
    end: definition.period.kind === 'fixed' ? primaryPeriod.start : primaryPeriod.interval === 'yearly' ? primaryPeriod.end : `${primaryPeriod.start.slice(0, 7)}-28`,
    values: Object.fromEntries(series.map(selected => [selected.id, point(0, seriesProvenance(selected.resourceGuid))])) },
    ...(comparisonPeriod ? [{ periodKey: comparisonPeriod.start, role: 'comparison' as const, start: comparisonPeriod.start, end: comparisonPeriod.start,
      values: Object.fromEntries(series.map(selected => [selected.id, point(0, seriesProvenance(selected.resourceGuid))])) }] : [])];
  const data: VisualizationData = definition.chart?.kind === 'treemap'
    ? { kind: 'hierarchy', nodes: [{ id: 'equipment-a', label: 'Equipment', observation: point(10) }] }
    : definition.chart?.kind === 'sankey'
      ? { kind: 'flow', nodes: [{ id: 'source', label: 'Electricity' }, { id: 'equipment-a', label: 'Equipment' }],
        links: [{ source: 'source', target: 'equipment-a', observation: point(10) }] }
      : definition.chart?.kind === 'breakdown' ? { kind: 'breakdown', items: [{ id: 'equipment-a', label: 'Equipment', observation: point(10) }] }
      : { kind: 'time-series', rows };
  const capabilities: VisualizationSourceCapabilities = { kind: source.kind, measures: [source.measure], aggregations: [source.aggregation],
    periods: ['all-history', 'fixed', 'rolling', 'latest-saved-year', 'fiscal-year'], comparisons: ['none', 'previous-period', 'previous-year', 'custom'],
    chartKinds: ['time-series', 'scatter', 'correlation', 'heatmap', 'breakdown', 'treemap', 'sankey'],
    shapes: ['time-series', 'pairs', 'matrix', 'breakdown', 'hierarchy', 'flow'],
    alignments: ['civil-month', 'fiscal-interval', 'hierarchy', 'flow', 'category', 'provider-paired', 'provider-matrix', 'civil-year', 'billing-occurrence'],
    settings: ['unit', 'energyTreatment'], controls: ['series', 'appearance', 'axes', 'stacking', 'fit', 'normalization', 'hierarchy', 'denominator'], allowDateOverride: true };
  const identity = { accountGuid: definition.accountGuid, workspaceRevision: 1, definitionGuid: 'visualization-a', definitionRevision: 1,
    requestId: 'preview-a', scope: definition.scope, sourceId: source.id };
  return { request: { identity, source, chart: definition.chart!, period: definition.period, comparison: definition.comparison, series,
      dateContext: { calendarDate: '2026-11-11', latestDataDate: '2025-12-31' } }, capabilities,
    chartSupport: { state: 'supported', chart: definition.chart! },
    resolution: { state: 'ready', identity, resolved: { data,
      alignment: { kind: source.kind === 'energy-use' ? data.kind === 'flow' ? 'flow' : 'hierarchy' : 'civil-month', key: source.kind === 'energy-use' ? 'native-fiscal-equipment' : 'YYYY-MM' },
      series: series.map(selected => ({ id: selected.id, sourceId: source.id, metric: selected.metric,
        ...(selected.resourceGuid ? { resourceGuid: selected.resourceGuid } : {}), label: selected.label ?? selected.id,
        unit: source.settings?.unit?.kind === 'pinned' ? source.settings.unit.value : source.kind === 'predictor' ? 'degC' : 'kWh',
        dimension: source.kind === 'predictor' ? 'temperature' : 'energy',
        energyTreatment: source.settings?.energyTreatment?.kind === 'pinned' ? source.settings.energyTreatment.value : 'site', additive: true,
        contributionKeys: [`${selected.resourceGuid ?? source.id}:saved-contribution`] })),
      periods: [primaryPeriod, ...(comparisonPeriod ? [comparisonPeriod] : [])],
      references, provenance: [...new Set(series.length ? series.map(selected => seriesProvenance(selected.resourceGuid)) : [provenance])],
      quality: { partial: false, warnings: [] }, ...(source.kind.startsWith('analysis') ? { analysisFreshness: 'current' as const } : {}) } } };
}

export class FakeVisualizationSourceProvider implements VisualizationSourceProvider {
  readonly kind: VisualizationSource['kind'];
  constructor(private readonly evidence: VisualizationSourceEvidence) { this.kind = evidence.capabilities.kind; }
  describe() { return this.evidence.capabilities; }
  supportsChart() { return this.evidence.chartSupport; }
  async resolve(request: VisualizationSourceRequest, signal: AbortSignal): Promise<VisualizationSourceResolution> {
    return signal.aborted ? { state: 'waiting', identity: request.identity, message: 'Request cancelled.' }
      : { ...this.evidence.resolution, identity: request.identity };
  }
}
