import { correlationStatistics, type CorrelationStatistics } from '@domain/calculations/exploratory-statistics';
import { zScores } from '@domain/calculations/exploratory-standardization';
import type { VisualizationDefinition, VisualizationSeriesSelector, VisualizationSource } from './visualization-definition';
import type { ResolvedVisualizationSeries, VisualizationObservation, VisualizationSourceEvidence } from './visualization-source-provider';
import { resolveVisualizationSeries } from './visualization-series';
import { isExplorationChart, visualizationInterval } from './visualization-interval';

export interface ExplorationSlot { readonly key: string; readonly start: string; readonly end: string; readonly label: string; }
export interface ExplorationSeries {
  readonly id: string; readonly selector: VisualizationSeriesSelector; readonly declarationId: string;
  readonly label: string; readonly unit: string; readonly context: string; readonly facilityGuid?: string; readonly metadata: ResolvedVisualizationSeries;
  readonly observations: ReadonlyMap<string, VisualizationObservation>; readonly standardized: ReadonlyMap<string, number | null>;
}
export interface ExplorationPair {
  readonly id: string; readonly x: ExplorationSeries; readonly y: ExplorationSeries;
  readonly count: number; readonly excluded: number; readonly statistics: CorrelationStatistics;
}
export interface ExplorationModel {
  readonly accountGuid: string; readonly facilityGuids: readonly string[]; readonly sources: readonly VisualizationSource[];
  readonly title: string; readonly chart: Extract<NonNullable<VisualizationDefinition['chart']>, { kind: 'scatter' | 'correlation' | 'heatmap' }>;
  readonly slots: readonly ExplorationSlot[]; readonly series: readonly ExplorationSeries[]; readonly pairs: readonly ExplorationPair[];
  readonly warnings: readonly string[]; readonly legend: boolean; readonly windowKey: string;
}
export interface ExplorationPairRow {
  readonly slot: ExplorationSlot; readonly x: VisualizationObservation; readonly y: VisualizationObservation;
  readonly included: boolean; readonly reason?: string; readonly displayX: number | null; readonly displayY: number | null;
}
export const observationComplete = (value: VisualizationObservation): value is Extract<VisualizationObservation, { state: 'observed' }> =>
  value.state === 'observed' && !value.partial && Number.isFinite(value.value);
export const absentObservation: VisualizationObservation = { state: 'alignment-padding', value: null, reason: 'Outside this series’s saved observation periods.' };
export function explorationObservationText(value: VisualizationObservation, unit: string): string {
  return value.state === 'observed' ? `${value.value}${unit ? ' ' + unit : ''} · ${value.provenance}${value.partial ? ' · Partial coverage' : ''}${value.notes?.length ? ' · ' + value.notes.join('; ') : ''}`
    : `${value.state}: ${value.reason}`;
}
export function selectorMatches(selector: VisualizationSeriesSelector, series: ExplorationSeries): boolean {
  return selector.sourceId === series.metadata.sourceId && (selector.resourceGuid !== undefined ? selector.resourceGuid === series.metadata.resourceGuid : selector.seriesId === series.metadata.id);
}
export function pairRows(model: Pick<ExplorationModel, 'slots' | 'chart'>, pair: Pick<ExplorationPair, 'x' | 'y'>): ExplorationPairRow[] {
  const standardized = model.chart.kind !== 'heatmap' && model.chart.scale === 'z-score';
  return model.slots.map(slot => {
    const x = pair.x.observations.get(slot.key) ?? absentObservation, y = pair.y.observations.get(slot.key) ?? absentObservation;
    const included = observationComplete(x) && observationComplete(y);
    const reason = included ? undefined : [!observationComplete(x) ? `X: ${explorationObservationText(x, pair.x.unit)}` : '', !observationComplete(y) ? `Y: ${explorationObservationText(y, pair.y.unit)}` : ''].filter(Boolean).join('; ');
    return { slot, x, y, included, reason,
      displayX: included ? standardized ? pair.x.standardized.get(slot.key) ?? null : x.value : null,
      displayY: included ? standardized ? pair.y.standardized.get(slot.key) ?? null : y.value : null };
  });
}

/** Original observations are indexed once; pair summaries do not retain copied point arrays. */
export async function prepareExploration(definition: VisualizationDefinition, evidence: readonly VisualizationSourceEvidence[], signal: AbortSignal): Promise<ExplorationModel> {
  const chart = definition.chart;
  if (!isExplorationChart(chart)) throw new Error('Choose a correlation, scatter or heatmap chart.');
  const checkCanceled = () => { if (signal.aborted) throw new DOMException('Chart canceled.', 'AbortError'); };
  checkCanceled();
  const sources = evidence.map(entry => {
    const result = entry.resolution;
    if ((result.state !== 'ready' && result.state !== 'empty') || !result.resolved || result.resolved.data.kind !== 'time-series') throw new Error('Resolve compatible observation histories before preparing exploration.');
    return { entry, result: result.resolved, rows: result.resolved.data.rows };
  });
  const selected = resolveVisualizationSeries(definition, sources.flatMap(source => source.result.series));
  const slots = new Map<string, ExplorationSlot>();
  const indexed = new Map<string, Map<string, VisualizationObservation>>();
  for (const source of sources) {
    const seen = new Set<string>();
    for (const row of source.rows) {
      if (row.role && row.role !== 'primary') throw new Error('Exploration does not support comparison overlays.');
      const key = visualizationInterval(chart) === 'monthly' ? row.start.slice(0, 7) : `${row.start}/${row.end}`;
      if (seen.has(key)) throw new Error('Duplicate observation periods cannot be paired safely.');
      seen.add(key);
      slots.set(key, { key, start: row.start, end: row.end, label: visualizationInterval(chart) === 'monthly' ? key : `${row.periodKey} (${row.start} – ${row.end})` });
      for (const metadata of source.result.series) {
        const values = indexed.get(metadata.id) ?? new Map<string, VisualizationObservation>();
        values.set(key, row.values[metadata.id] ?? { state: 'missing', value: null, reason: 'No observation for this series in the resolved period.' });
        indexed.set(metadata.id, values);
      }
    }
  }
  const orderedSlots = [...slots.values()].sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  const series: ExplorationSeries[] = selected.map(item => {
    const observations = indexed.get(item.metadata.id) ?? new Map<string, VisualizationObservation>();
    const values = orderedSlots.map(slot => { const value = observations.get(slot.key); return value && observationComplete(value) ? value.value : null; });
    const standardized = zScores(values);
    const resource = sources.find(source => source.entry.request.source.id === item.metadata.sourceId)?.result.references.find(ref => ref.id === item.metadata.resourceGuid);
    return { id: item.metadata.id, selector: { sourceId: item.metadata.sourceId, ...(item.metadata.resourceGuid ? { resourceGuid: item.metadata.resourceGuid } : { seriesId: item.metadata.id }) },
      declarationId: item.selected.id, label: item.selected.label ?? item.metadata.label, unit: item.metadata.unit, metadata: item.metadata,
      ...(resource?.facilityGuid ? { facilityGuid: resource.facilityGuid } : {}),
      context: item.metadata.label,
      observations, standardized: new Map(orderedSlots.map((slot, index) => [slot.key, standardized.values[index]])) };
  });
  const pairCount = chart.kind === 'correlation' ? series.length * (series.length - 1) / 2 : chart.kind === 'scatter' ? 1 : 0;
  if (pairCount > 10000 || pairCount * orderedSlots.length > 5000000) throw new Error(`This selection creates ${pairCount} pairs across ${orderedSlots.length} periods. Narrow the selected series or dates before preparing the complete figure.`);
  const pairs: ExplorationPair[] = [];
  const addPair = (x: ExplorationSeries, y: ExplorationSeries) => {
    const values: { x: number; y: number }[] = [];
    for (const slot of orderedSlots) {
      const a = x.observations.get(slot.key), b = y.observations.get(slot.key);
      if (a && b && observationComplete(a) && observationComplete(b)) values.push({ x: a.value, y: b.value });
    }
    const statistics = correlationStatistics(values);
    pairs.push({ id: JSON.stringify([x.id, y.id]), x, y, count: values.length, excluded: orderedSlots.length - values.length,
      statistics: { ...statistics, ...(statistics.unavailableReason ? { unavailableReason: statistics.unavailableReason.replace('predictor and group usage', 'series').replace('paired months', 'paired observations') } : {}) } });
  };
  if (chart.kind === 'scatter') {
    const resolve = (axis: 'x' | 'y') => series.filter(item => chart[axis] ? selectorMatches(chart[axis]!, item) : item.declarationId === (axis === 'x' ? chart.xSeriesId : chart.ySeriesId));
    const x = resolve('x'), y = resolve('y');
    if (x.length !== 1 || y.length !== 1) throw new Error('Choose one available expanded series for each scatter axis.');
    if (x[0].id === y[0].id) throw new Error('Choose different X and Y series.');
    addPair(x[0], y[0]);
  } else if (chart.kind === 'correlation') {
    let batch = 0;
    for (let x = 0; x < series.length; x++) for (let y = x + 1; y < series.length; y++) {
      checkCanceled(); addPair(series[x], series[y]);
      if (++batch % 16 === 0) { await new Promise<void>(resolve => setTimeout(resolve, 0)); checkCanceled(); }
    }
  }
  checkCanceled();
  const contributions = new Set<string>();
  const overlaps = series.some(series => (series.metadata.contributionKeys ?? []).some(key => { const duplicate = contributions.has(key); contributions.add(key); return duplicate; }));
  return { accountGuid: definition.accountGuid, facilityGuids: evidence[0]?.request.identity.scope.facilityGuids ?? [], sources: definition.sources, chart, title: definition.appearance.title ?? definition.name, legend: definition.appearance.legend,
    slots: orderedSlots, series, pairs, windowKey: JSON.stringify([definition.accountGuid, visualizationInterval(chart), orderedSlots]),
    warnings: [...(overlaps ? ['Some selected series share underlying contributions. Their relationship may reflect that overlap.'] : []), ...new Set(sources.flatMap(source => [...source.result.quality.warnings, ...(source.result.quality.omissions ?? []).map(omission => `${omission.label} · ${omission.issue}: ${omission.readings.join('; ')}`)]))] };
}
