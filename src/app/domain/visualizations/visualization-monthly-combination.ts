import type { VisualizationDefinition, VisualizationSource } from './visualization-definition';
import type { VisualizationResolvedData, VisualizationSourceRequest, VisualizationSourceResolution, ResolvedVisualizationSeries, VisualizationResolvedReference } from './visualization-source-provider';
import { validCivil } from './utility/utility-periods';
export function civilMonthRange(index: number): { start: string; end: string } {
  const year = Math.floor(index / 12), month = index % 12 + 1;
  const prefix = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
  const date = new Date(0); date.setUTCFullYear(year, month, 0);
  return { start: `${prefix}-01`, end: `${prefix}-${String(date.getUTCDate()).padStart(2, '0')}` };
}

export function isMixedPredictorSourceSet(sources: readonly VisualizationSource[]): boolean {
  return sources.length === 2 && sources.filter(source => source.kind === 'predictor').length === 1
    && sources.some(source => source.kind === 'utility' && source.dataMode === 'calendarized');
}

export function predictorCombinationSupported(definition: VisualizationDefinition): boolean {
  if (!definition.sources.some(source => source.kind === 'predictor') || definition.sources.length === 1) return true;
  const chart = definition.chart, period = definition.period;
  return isMixedPredictorSourceSet(definition.sources) && chart?.kind === 'time-series' && chart.interval === 'monthly'
    && chart.stack === 'none' && ['line', 'bar'].includes(chart.defaultTraceType) && definition.comparison.kind === 'none'
    && (period.kind === 'all-history' || period.kind === 'fixed' && period.basis === 'calendar'
      || period.kind === 'rolling' && period.basis === 'calendar' && !period.includeIncomplete);
}

export function wholeMonthWindow(start: string, end: string): { start: string; end: string } | undefined {
  if (!validCivil(start) || !validCivil(end) || start > end) return undefined;
  let first = Number(start.slice(0, 4)) * 12 + Number(start.slice(5, 7)) - 1;
  let last = Number(end.slice(0, 4)) * 12 + Number(end.slice(5, 7)) - 1;
  if (civilMonthRange(first).start < start) first++;
  if (civilMonthRange(last).end > end) last--;
  return first <= last ? { start: civilMonthRange(first).start, end: civilMonthRange(last).end } : undefined;
}

/** Valid empty membership retains ownership and intent, without manufacturing a series or observed value. */
export function emptyMonthlySource(request: VisualizationSourceRequest, message: string,
  series: readonly ResolvedVisualizationSeries[], references: readonly VisualizationResolvedReference[], reasons: readonly string[] = []): VisualizationSourceResolution {
  const range = request.dateContext.monthlyRange;
  if (!range) return { identity: request.identity, state: 'empty', periods: [], message, reasons };
  const first = Number(range.start.slice(0, 4)) * 12 + Number(range.start.slice(5, 7)) - 1;
  const last = Number(range.end.slice(0, 4)) * 12 + Number(range.end.slice(5, 7)) - 1;
  const whole = wholeMonthWindow(range.start, range.end);
  if (!whole || whole.start !== range.start || whole.end !== range.end || last - first + 1 > 12000
    || (last - first + 1) * Math.max(1, series.length) > 250000)
    return { identity: request.identity, state: 'unsupported', message: 'Choose a supported whole-month range.' };
  const resolved: VisualizationResolvedData = { series, references, alignment: { kind: 'civil-month', key: 'YYYY-MM' }, provenance: [],
    periods: [{ ...range, role: 'primary', basis: 'calendar', interval: 'monthly' }], quality: { partial: true, warnings: reasons },
    data: { kind: 'time-series', rows: Array.from({ length: last - first + 1 }, (_, index) => {
      const bounds = civilMonthRange(first + index);
      return { ...bounds, periodKey: bounds.start.slice(0, 7), values: Object.fromEntries(series.map(item => [item.id,
        { state: 'alignment-padding' as const, value: null, reason: 'No saved history for this selection.' }])) };
    }) } };
  return { identity: request.identity, state: 'empty', message, periods: resolved.periods, reasons, resolved };
}
