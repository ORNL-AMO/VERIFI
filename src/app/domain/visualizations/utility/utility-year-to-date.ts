import type { VisualizationDefinition } from '../visualization-definition';
import { fiscalRange, fiscalYear, monthRange, parseCivil, validCivil, type UtilityCalendar } from './utility-periods';

export interface UtilityYearToDate {
  readonly anchor: string;
  readonly monthCount: number;
  readonly label: string;
}

export function utilityYearToDate(anchor: string, owner: UtilityCalendar): UtilityYearToDate {
  if (!validCivil(anchor)) throw new Error('No eligible saved month is available for Year to Date.');
  const date = parseCivil(anchor), start = parseCivil(fiscalRange(fiscalYear(anchor, owner), owner).start);
  const monthCount = (date.getFullYear() - start.getFullYear()) * 12 + date.getMonth() - start.getMonth() + 1;
  return { anchor, monthCount, label: `YTD through ${date.toLocaleDateString('en-US', { month: 'long' })} · ${monthCount} ${monthCount === 1 ? 'month' : 'months'}` };
}
export function utilityYearToDateRange(year: number, owner: UtilityCalendar, context: UtilityYearToDate) {
  const start = fiscalRange(year, owner).start, first = parseCivil(start);
  return { start, end: monthRange(first.getFullYear(), first.getMonth() + context.monthCount - 1).end };
}
export function yearToDateSourcesSupported(definition: VisualizationDefinition): boolean {
  return definition.chart?.kind === 'time-series' && definition.chart.interval === 'yearly' && definition.sources.length > 0
    && definition.sources.every(source => source.kind === 'utility' && source.dataMode === 'calendarized' && source.measure !== 'charge');
}
export function yearToDateIssue(definition: VisualizationDefinition): string | undefined {
  if (definition.chart?.kind !== 'time-series' || !definition.chart.yearToDate) return undefined;
  if (!yearToDateSourcesSupported(definition)) return 'Year to Date requires yearly calendarized utility data.';
  if (definition.period.kind !== 'all-history' || definition.comparison.kind !== 'none') return 'Year to Date compares all saved years without an additional comparison.';
  return undefined;
}
