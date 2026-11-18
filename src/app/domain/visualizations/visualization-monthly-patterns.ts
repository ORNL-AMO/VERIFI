import { fiscalYear, type UtilityCalendar } from './utility/utility-periods';
import type { VisualizationDefinition } from './visualization-definition';

export const MONTHLY_PATTERN_YEAR_COLORS = ['#4269d0', '#efb118', '#ff725c', '#6cc5b0', '#3ca951', '#ff8ab7', '#a463f2', '#97bbf5', '#9c6b4e', '#9498a0', '#1f7a8c', '#b65d1f', '#7a5195', '#667a1f', '#b23a48'] as const;
export const MONTHLY_PATTERN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

export interface MonthlyPatternsCalendar extends UtilityCalendar {
  readonly ownerKind: 'account' | 'facility';
  readonly ownerGuid: string;
  readonly fiscalYearMonth: number;
  readonly fiscalYearCalendarEnd: boolean;
  readonly years: readonly number[];
}
export function monthlyPatternsCalendar(owner: UtilityCalendar & { readonly guid: string }, ownerKind: 'account' | 'facility', dates: readonly string[]): MonthlyPatternsCalendar {
  const calendar = { fiscalYear: owner.fiscalYear, fiscalYearMonth: owner.fiscalYearMonth ?? 0, fiscalYearCalendarEnd: owner.fiscalYearCalendarEnd ?? false };
  return { ...calendar, ownerKind, ownerGuid: owner.guid, years: [...new Set(dates.map(date => fiscalYear(date, calendar)))].sort((a, b) => a - b) };
}

/** Each view compares years of one resource/cohort, never implicitly pairs different resources. */
export function monthlyPatternsIssue(definition: VisualizationDefinition): string | undefined {
  if (definition.chart?.kind !== 'monthly-patterns') return undefined;
  if (definition.period.kind !== 'all-history' || definition.comparison.kind !== 'none') return 'Monthly patterns use all saved history without an additional comparison.';
  const sources = definition.sources;
  if (sources.length === 1 && sources[0].kind === 'predictor') {
    const source = sources[0];
    if (source.selection?.kind !== 'fixed' || source.selection.resource !== 'predictor' || source.selection.guids.length !== 1)
      return 'Choose one saved predictor for Monthly patterns.';
  } else {
    const usage = sources.filter(source => source.kind === 'utility' && ['energy', 'consumption'].includes(source.measure));
    if (usage.length !== 1 || sources.length > 2 || sources.some(source => source.kind !== 'utility' || !['energy', 'consumption', 'cost'].includes(source.measure)))
      return 'Choose one predictor, or Energy or Consumption/water with optional Cost from one meter, meter group or utility source.';
    const selections = new Set<string>();
    for (const source of sources) {
      if (source.kind !== 'utility' || source.dataMode !== 'calendarized') return 'Use calendarized utility observations.';
      const mode = source.selectionMode, selection = source.selection;
      const exact = mode === 'meter' || mode === 'group';
      if (exact ? selection?.kind !== 'fixed' || selection.resource !== (mode === 'meter' ? 'meter' : 'meter-group') || selection.guids.length !== 1
        : mode !== 'source' || selection?.kind !== 'rule' || selection.filter.utilitySources?.length !== 1)
        return 'Choose one meter, meter group or utility source.';
      if (source.groupBy !== (mode === 'group' ? 'group' : mode) || mode !== 'meter' && source.aggregation !== 'sum')
        return 'Group and source patterns use combined monthly values for the selected resource.';
      selections.add(JSON.stringify([mode, selection]));
    }
    if (selections.size !== 1) return 'Every panel must use the same resource selection.';
  }
  if (definition.series.some(series => series.traceType && series.traceType !== 'line' || series.overrides?.some(item => item.traceType && item.traceType !== 'line')))
    return 'Monthly patterns support lines only. Review the chart’s trace settings.';
  return undefined;
}
