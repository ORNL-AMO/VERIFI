import { Injectable } from '@angular/core';
import type { VisualizationDefinition, MonthlyPatternYearStyle } from '@domain/visualizations/visualization-definition';
import { MONTHLY_PATTERN_MONTHS, MONTHLY_PATTERN_YEAR_COLORS, monthlyPatternsIssue } from '@domain/visualizations/visualization-monthly-patterns';
import { fiscalRange, fiscalYear, monthRange, parseCivil } from '@domain/visualizations/utility/utility-periods';
import type { VisualizationSourceEvidence } from '@domain/visualizations/visualization-source-provider';
import { resolveVisualizationSeries } from '@domain/visualizations/visualization-series';
import type { PreviewPresentation, VisualizationPreviewPresenter } from '../preview/preview-registry';
import type { TimeSeriesPoint } from '../time-series/time-series.models';
import { observationText } from '../time-series/time-series-options';
import { MonthlyPatternsChartComponent } from './chart/monthly-patterns-chart.component';

export interface MonthlyPatternYear extends MonthlyPatternYearStyle { readonly year: number; readonly label: string; readonly color: string; readonly visible: boolean; }
export interface MonthlyPatternsModel {
  readonly title: string;
  readonly legend: boolean;
  readonly smoothLines: boolean;
  readonly months: readonly string[];
  readonly years: readonly MonthlyPatternYear[];
  readonly panels: readonly { readonly id: string; readonly label: string; readonly unit: string; readonly currency: boolean;
    readonly allowNegative: boolean;
    readonly years: readonly { readonly year: number; readonly points: readonly TimeSeriesPoint[] }[] }[];
  readonly warnings: readonly string[];
}

@Injectable()
export class MonthlyPatternsPresenter implements VisualizationPreviewPresenter {
  readonly kind = 'monthly-patterns' as const;
  readonly component = MonthlyPatternsChartComponent;
  prepare(definition: VisualizationDefinition, evidence: readonly VisualizationSourceEvidence[], signal: AbortSignal): PreviewPresentation {
    if (signal.aborted) throw new Error('Chart canceled.');
    const model = prepareMonthlyPatterns(definition, evidence);
    return { inputs: { model }, details: { caption: `${model.title}: original monthly periods, values and quality`,
      columns: ['Panel', 'Year', 'Start', 'End', 'Value / quality'],
      rows: model.panels.flatMap(panel => panel.years.flatMap(year => year.points.map(point => [panel.label, String(year.year), point.start, point.end, observationText(point, panel.unit)]))) } };
  }
}

export function prepareMonthlyPatterns(definition: VisualizationDefinition, evidence: readonly VisualizationSourceEvidence[]): MonthlyPatternsModel {
  const issue = monthlyPatternsIssue(definition);
  if (definition.chart?.kind !== 'monthly-patterns' || issue) throw new Error(issue ?? 'Choose Monthly patterns.');
  const resolved = evidence.map(entry => {
    if (entry.resolution.state !== 'ready' || entry.resolution.resolved.data.kind !== 'time-series' || !entry.resolution.resolved.monthlyPatternsCalendar)
      throw new Error('Resolve the resource’s monthly observations and current fiscal calendar.');
    return { source: entry.request.source, result: entry.resolution.resolved, data: entry.resolution.resolved.data, calendar: entry.resolution.resolved.monthlyPatternsCalendar };
  });
  const calendar = resolved[0]?.calendar;
  if (!calendar || resolved.some(entry => JSON.stringify(entry.calendar) !== JSON.stringify(calendar))) throw new Error('Every panel must share the selected resource’s fiscal calendar.');
  const startMonth = calendar.fiscalYear === 'nonCalendarYear' ? calendar.fiscalYearMonth : 0;
  const years = calendar.years.map((year, index) => {
    const style = definition.chart?.kind === 'monthly-patterns' ? definition.chart.yearOverrides?.[String(year)] : undefined;
    return { year, label: calendar.fiscalYear === 'nonCalendarYear' ? `FY ${year}` : String(year), color: MONTHLY_PATTERN_YEAR_COLORS[index % MONTHLY_PATTERN_YEAR_COLORS.length], visible: true, ...style };
  });
  const selected = resolveVisualizationSeries(definition, resolved.flatMap(entry => entry.result.series));
  const panels = selected.map(item => {
    const entry = resolved.find(entry => entry.source.id === item.metadata.sourceId)!;
    const byYearMonth = new Map<string, TimeSeriesPoint>();
    for (const row of entry.data.rows) {
      const month = parseCivil(row.start).getMonth(), year = fiscalYear(row.start, calendar), key = `${year}:${month}`;
      if (byYearMonth.has(key)) throw new Error('Duplicate monthly observations cannot be aligned safely.');
      const observation = row.values[item.metadata.id];
      if (!observation || observation.state === 'observed' && !Number.isFinite(observation.value)) throw new Error('Resolve finite values or explicit monthly gaps.');
      byYearMonth.set(key, { slot: String((month - startMonth + 12) % 12), start: row.start, end: row.end, observation });
    }
    return { id: item.metadata.id, label: item.selected.label ?? (entry.source.measure === 'cost' ? 'Total Cost' : entry.source.measure === 'energy' ? 'Energy' : entry.source.kind === 'predictor' ? item.metadata.label : 'Consumption / water'),
      unit: item.metadata.unit, currency: entry.source.measure === 'cost', allowNegative: entry.source.kind === 'predictor', years: years.map(year => {
        const start = parseCivil(fiscalRange(year.year, calendar).start);
        return { year: year.year, points: Array.from({ length: 12 }, (_, index) => {
          const date = new Date(start.getFullYear(), start.getMonth() + index, 1, 12), bounds = monthRange(date.getFullYear(), date.getMonth());
          return byYearMonth.get(`${year.year}:${date.getMonth()}`) ?? { slot: String(index), ...bounds,
            observation: { state: 'alignment-padding' as const, value: null, reason: 'No saved observation for this fiscal month.' } };
        }) };
      }) };
  }).sort((a, b) => Number(a.currency) - Number(b.currency));
  return { title: definition.appearance.title ?? definition.name, legend: definition.appearance.legend, smoothLines: definition.chart.smoothLines === true,
    months: Array.from({ length: 12 }, (_, index) => MONTHLY_PATTERN_MONTHS[(startMonth + index) % 12]), years, panels,
    warnings: [...new Set(resolved.flatMap(entry => entry.result.quality.warnings))] };
}
