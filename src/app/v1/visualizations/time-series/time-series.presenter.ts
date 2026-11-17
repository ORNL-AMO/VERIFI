import { timeSeriesStackIssues } from '@domain/visualizations/visualization-time-series';
import { civilMonthIndex } from '@domain/visualizations/visualization-periods';
import { allowsMixedAxisUnits } from '@domain/visualizations/visualization-source-provider';
import { Injectable } from '@angular/core';
import type { VisualizationDefinition } from '@domain/visualizations/visualization-definition';
import type { VisualizationSourceEvidence, VisualizationObservation } from '@domain/visualizations/visualization-source-provider';
import { resolveVisualizationSeries } from '@domain/visualizations/visualization-series';
import type { PreviewPresentation, VisualizationPreviewPresenter } from '../preview/preview-registry';
import { TimeSeriesChartComponent } from './chart/time-series-chart.component';
import type { TimeSeriesModel, TimeSeriesPoint, TimeSeriesTrace } from './time-series.models';
import { observationText } from './time-series-options';
import { visualizationSeriesStyle } from '../shared/series-style';

@Injectable()
export class TimeSeriesPresenter implements VisualizationPreviewPresenter {
  readonly kind = 'time-series' as const;
  readonly component = TimeSeriesChartComponent;
  prepare(definition: VisualizationDefinition, evidence: readonly VisualizationSourceEvidence[], signal: AbortSignal): PreviewPresentation {
    if (signal.aborted) throw new Error('Chart canceled.');
    const model = prepareTimeSeries(definition, evidence);
    const details = { caption: `${model.title}: original saved-data periods, values and quality`,
      columns: ['Series', 'Role', 'Start', 'End', 'Value / quality'],
      rows: model.traces.flatMap(trace => trace.points.map(point => [trace.label, trace.role, point.start, point.end, observationText(point, trace.unit)])) };
    return { inputs: { model }, details };
  }
}

/** Align declared comparison intervals, retaining every observation's original civil dates. */
export function prepareTimeSeries(definition: VisualizationDefinition, evidence: readonly VisualizationSourceEvidence[]): TimeSeriesModel {
  const chart = definition.chart;
  if (chart?.kind !== 'time-series') throw new Error('Choose a time-series chart.');
  const resolved = evidence.map(entry => {
    if ((entry.resolution.state !== 'ready' && entry.resolution.state !== 'empty') || !entry.resolution.resolved || entry.resolution.resolved.data.kind !== 'time-series') throw new Error('Resolve compatible time-series sources before preparing a chart.');
    return { evidence: entry, result: entry.resolution.resolved, data: entry.resolution.resolved.data };
  });
  const selected = resolveVisualizationSeries(definition, resolved.flatMap(entry => entry.result.series));
  const stackIssues = timeSeriesStackIssues(definition, selected, evidence);
  if (stackIssues.length) throw new Error(stackIssues.map(issue => issue.message).join(' '));
  for (const axis of ['left', 'right'] as const) {
    const axisSeries = selected.filter(item => item.selected.axis === axis);
    const axisCapabilities = [...new Set(axisSeries.map(item => item.metadata.sourceId))].flatMap(sourceId => evidence.filter(entry => entry.request.identity.sourceId === sourceId).map(entry => entry.capabilities));
    const signatures = axisSeries.map(item => `${item.metadata.dimension}:${item.metadata.unit}:${item.metadata.currency ?? ''}:${item.metadata.energyTreatment ?? ''}`);
    if (!allowsMixedAxisUnits(chart, axisCapabilities, definition.sources) && new Set(signatures).size > 1) throw new Error(`Choose compatible units, currency and treatment for the ${axis} axis.`);
  }
  const warnings = new Set(resolved.flatMap(entry => entry.result.quality.warnings));
  const showPartialNotice = resolved.some(entry => entry.evidence.request.source.kind !== 'predictor' && entry.result.quality.partial);
  if (showPartialNotice) warnings.add('This chart includes partial coverage. Review unavailable observations and omitted contributions before interpreting totals.');
  const contributionOwners = new Map<string, Set<string>>();
  for (const item of selected) for (const key of item.metadata.contributionKeys ?? []) {
    const owners = contributionOwners.get(key) ?? new Set<string>(); owners.add(item.metadata.id); contributionOwners.set(key, owners);
  }
  if ([...contributionOwners.values()].some(owners => owners.size > 1)) warnings.add(`These separate series overlap underlying ${definition.sources.some(source => source.kind === 'energy-use') ? 'equipment' : 'meter'} contributions. They are comparisons, not a combined total.`);
  const starts = (role: 'primary' | 'comparison') => resolved.flatMap(entry => entry.result.periods.filter(period => period.role === role).map(period => period.start)).sort();
  const primaryStart = starts('primary')[0], comparisonStart = starts('comparison')[0];
  if (definition.comparison.kind !== 'none' && (!primaryStart || !comparisonStart || chart.interval === 'native')) throw new Error('These native periods cannot be aligned safely for comparison.');
  if (definition.comparison.kind !== 'none') warnings.add(`Comparison observations beginning ${comparisonStart} are aligned by period offset to ${primaryStart}. Accessible values retain their original dates.`);
  const primaryMonth = primaryStart ? civilMonthIndex(primaryStart) : 0, comparisonMonth = comparisonStart ? civilMonthIndex(comparisonStart) : 0;
  const slots = new Map<string, { key: string; label: string; order: number }>();
  let traces: TimeSeriesTrace[] = [];
  for (const item of selected) {
    const source = resolved.find(entry => entry.result.series.some(series => series.id === item.metadata.id && series.sourceId === item.metadata.sourceId));
    if (!source) continue;
    const roles = definition.comparison.kind === 'none' ? ['primary'] as const : ['primary', 'comparison'] as const;
    for (const role of roles) {
      const points: TimeSeriesPoint[] = source.data.rows.filter(row => (row.role ?? 'primary') === role).map(row => {
        const dateIndex = chart.interval === 'native' ? row.start : String(civilMonthIndex(row.start) + (role === 'comparison' ? primaryMonth - comparisonMonth : 0));
        const key = `${chart.interval}:${dateIndex}`;
        const order = chart.interval === 'native' ? Date.parse(`${row.start}T12:00:00Z`) : Number(dateIndex);
        const fiscal = source.result.periods.find(period => period.role === role && period.start === row.start && period.end === row.end && period.basis === 'fiscal');
        const equipmentYear = ['energy-use', 'analysis'].includes(source.evidence.request.source.kind) ? fiscal?.fiscalYear : undefined;
        const alignedDate = equipmentYear !== undefined ? `FY ${equipmentYear}` : chart.interval === 'native' ? row.start : monthLabel(Number(dateIndex), chart.interval === 'yearly');
        slots.set(key, { key, order, label: alignedDate });
        const observation: VisualizationObservation = row.values[item.metadata.id] ?? { state: 'alignment-padding', value: null, reason: 'This series has no native observation at this alignment slot.' };
        if (observation.state === 'observed' && !Number.isFinite(observation.value)) throw new Error('Nonfinite values cannot be rendered as valid observations.');
        return { slot: key, start: row.start, end: row.end, observation };
      });
      if (!points.length) continue;
      const style = visualizationSeriesStyle(item.metadata.id);
      const label = item.selected.label ?? item.metadata.label;
      traces.push({ id: `${item.metadata.id}:${role}`, type: (item.selected.traceType ?? chart.defaultTraceType) as TimeSeriesTrace['type'], label: role === 'comparison' ? `${label} (comparison)` : label,
        unit: item.metadata.unit, axis: item.selected.axis, color: item.selected.color ?? style.color,
        lineStyle: item.selected.lineStyle ?? style.lineStyle, role, points });
    }
  }
  if (chart.stack === 'percent') {
    warnings.add('Percentages show the share of visible selected contributions, separately for each comparison role. Incomplete or zero totals have no percentage.');
    traces = percentageTraces(traces);
  }
  const duplicateLabels = new Map<string, number>();
  for (const trace of traces) duplicateLabels.set(trace.label, (duplicateLabels.get(trace.label) ?? 0) + 1);
  return { title: definition.appearance.title ?? definition.name,
    windowKey: JSON.stringify([chart.interval, resolved.flatMap(entry => entry.result.periods)]), chart, legend: definition.appearance.legend,
    partial: resolved.some(entry => entry.result.quality.partial),
    showPartialNotice, omissions: resolved.flatMap(entry => entry.result.quality.omissions ?? []),
    slots: [...slots.values()].sort((a, b) => a.order - b.order || a.key.localeCompare(b.key)),
    traces: traces.map((trace, index) => duplicateLabels.get(trace.label)! > 1 ? { ...trace, label: `${trace.label} (series ${index + 1})` } : trace), warnings: [...warnings] };
}

function monthLabel(index: number, yearly: boolean): string {
  const year = Math.floor(index / 12), month = index % 12;
  return yearly ? `${year}-${String(month + 1).padStart(2, '0')}` : new Date(year, month, 1, 12).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/** One denominator per role and slot; absent/padding evidence never becomes an observed zero. */
function percentageTraces(traces: readonly TimeSeriesTrace[]): TimeSeriesTrace[] {
  const counts = new Map<string, number>();
  const totals = new Map<string, { count: number; complete: boolean; total: number }>();
  for (const trace of traces) {
    counts.set(trace.role, (counts.get(trace.role) ?? 0) + 1);
    for (const point of trace.points) {
      const key = `${trace.role}:${point.slot}`;
      const total = totals.get(key) ?? { count: 0, complete: true, total: 0 };
      total.count++;
      if (point.observation.state !== 'observed' || point.observation.partial) total.complete = false;
      if (point.observation.state === 'observed') total.total += point.observation.value;
      totals.set(key, total);
    }
  }
  return traces.map(trace => ({ ...trace, points: trace.points.map(point => {
    const total = totals.get(`${trace.role}:${point.slot}`)!;
    const reason = !total.complete || total.count !== counts.get(trace.role) ? 'Incomplete comparable total; a selected contribution is missing, excluded, partial or alignment padding.'
      : !Number.isFinite(total.total) ? 'The selected total is nonfinite.'
      : total.total <= 0 ? 'The selected total is zero; no percentage is defined.' : undefined;
    return { ...point, percentage: !reason && point.observation.state === 'observed' ? point.observation.value / total.total * 100 : null,
      ...(reason ? { percentageReason: reason } : {}) };
  }) }));
}
