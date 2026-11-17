import type { VisualizationChart, VisualizationDefinition, VisualizationSeries, VisualizationSource } from './visualization-definition';
import type { EffectiveVisualizationSeries } from './visualization-series';
import type { VisualizationSourceEvidence } from './visualization-source-provider';

/** Shared by settings and runtime. Presentation choices never authorize resampling or totals. */
export function timeSeriesStackSettingsIssues(chart: VisualizationChart, sources: readonly VisualizationSource[],
  series: readonly Pick<VisualizationSeries, 'traceType' | 'axis' | 'visible'>[]): string[] {
  if (chart.kind !== 'time-series' || chart.stack === 'none') return [];
  const reasons: string[] = [];
  if (chart.interval === 'native' || sources.some(source => source.kind === 'utility' && source.dataMode === 'billing-period'))
    reasons.push('Native bill occurrences cannot be stacked. Choose calendarized monthly or yearly data.');
  if (sources.some(source => source.kind === 'predictor' || source.kind === 'analysis'))
    reasons.push('Predictor and analysis observations cannot contribute to a stack.');
  const visible = series.filter(item => item.visible !== false);
  if (new Set(visible.map(item => item.traceType ?? chart.defaultTraceType)).size > 1)
    reasons.push('A stack requires one trace type. Choose the same line, bar or area presentation for every visible item.');
  if (new Set(visible.map(item => item.axis)).size > 1)
    reasons.push('A stack requires one axis. Assign every visible item to the same axis.');
  return reasons;
}

export interface TimeSeriesCompatibilityIssue { readonly code: 'units' | 'data' | 'period'; readonly message: string; }

/** Original metadata and observations remain authoritative; normalization is presentation only. */
export function timeSeriesStackIssues(definition: VisualizationDefinition, selected: readonly EffectiveVisualizationSeries[],
  evidence: readonly VisualizationSourceEvidence[]): TimeSeriesCompatibilityIssue[] {
  const chart = definition.chart;
  if (chart?.kind !== 'time-series' || chart.stack === 'none') return [];
  const reasons: TimeSeriesCompatibilityIssue[] = timeSeriesStackSettingsIssues(chart, definition.sources, selected.map(item => item.selected)).map(message => ({ code: 'units', message }));
  const add = (code: 'units' | 'data' | 'period', message: string) => { if (!reasons.some(issue => issue.message === message)) reasons.push({ code, message }); };
  const metadata = selected.map(item => item.metadata);
  if (metadata.some(item => !item.additive)) add('units', 'Stacking requires authoritative additive measures.');
  if (new Set(metadata.map(item => `${item.dimension}:${item.unit}:${item.currency ?? ''}:${item.energyTreatment ?? ''}`)).size > 1)
    add('units', 'A stack requires compatible units, currency and site/source energy treatment.');
  const contributions = new Set<string>();
  for (const item of metadata) {
    if (!item.contributionKeys?.length || item.contributionKeys.some(key => !key.trim())) {
      add('data', 'Resolve canonical underlying contribution identities before stacking.'); continue;
    }
    for (const key of item.contributionKeys) {
      if (contributions.has(key)) add('data', 'These series overlap underlying contributions. Choose non-overlapping items.');
      contributions.add(key);
    }
  }
  const intervals = new Map<string, string>();
  for (const entry of evidence) {
    const resolution = entry.resolution;
    if ((resolution.state !== 'ready' && resolution.state !== 'empty') || resolution.resolved?.data.kind !== 'time-series') continue;
    const ids = metadata.filter(item => item.sourceId === entry.request.source.id).map(item => item.id);
    if (!ids.length) continue;
    for (const row of resolution.resolved.data.rows) {
      const key = `${row.role ?? 'primary'}:${row.start.slice(0, 7)}`;
      const interval = `${row.start}:${row.end}`;
      if (intervals.has(key) && intervals.get(key) !== interval) add('period', 'Stacked observations require the same actual intervals.');
      intervals.set(key, interval);
      if (chart.stack === 'percent' && ids.some(id => row.values[id]?.state === 'observed' && row.values[id].value! < 0))
        add('data', 'Percentage stacks require nonnegative values. Use an absolute or unstacked chart for negative observations.');
    }
  }
  return reasons;
}
