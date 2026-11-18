import { isExplorationChart, visualizationInterval } from './visualization-interval';
import type { VisualizationDefinition, VisualizationSource } from './visualization-definition';
import type { VisualizationResolvedData, VisualizationSourceRequest, VisualizationSourceResolution, ResolvedVisualizationSeries, VisualizationResolvedReference } from './visualization-source-provider';
import { civilMonthIndex, civilMonthRange, wholeMonthWindow } from './visualization-periods';

export function isMixedPredictorSourceSet(sources: readonly VisualizationSource[]): boolean {
  return sources.some(source => source.kind === 'predictor') && sources.some(source => source.kind === 'utility')
    && sources.every(source => source.kind === 'predictor' || source.kind === 'utility' && source.dataMode === 'calendarized');
}

export function predictorCombinationSupported(definition: VisualizationDefinition): boolean {
  if (!definition.sources.some(source => source.kind === 'predictor') || definition.sources.length === 1) return true;
  const chart = definition.chart, period = definition.period;
  if (isExplorationChart(chart)) return visualizationInterval(chart) === 'monthly' && definition.comparison.kind === 'none'
    && definition.sources.every(source => source.kind === 'predictor' || source.kind === 'analysis' && source.mode === 'result' || source.kind === 'utility' && source.dataMode === 'calendarized');
  return isMixedPredictorSourceSet(definition.sources) && chart?.kind === 'time-series' && chart.interval === 'monthly'
    && chart.stack === 'none' && definition.comparison.kind === 'none'
    && (period.kind === 'all-history' || period.kind === 'fixed' && period.basis === 'calendar'
      || period.kind === 'rolling' && period.basis === 'calendar' && !period.includeIncomplete);
}


/** Valid empty membership retains ownership and intent, without manufacturing a series or observed value. */
export function emptyMonthlySource(request: VisualizationSourceRequest, message: string,
  series: readonly ResolvedVisualizationSeries[], references: readonly VisualizationResolvedReference[], reasons: readonly string[] = []): VisualizationSourceResolution {
  const range = request.dateContext.monthlyRange;
  if (!range) return { identity: request.identity, state: 'empty', periods: [], message, reasons };
  const first = civilMonthIndex(range.start);
  const last = civilMonthIndex(range.end);
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
