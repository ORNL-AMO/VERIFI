import { isCompositionChart, compositionPeriodIssue } from '@domain/visualizations/visualization-composition';
import { isExplorationChart, visualizationInterval } from '@domain/visualizations/visualization-interval';
import { analysisPeriodIssue } from '@domain/visualizations/analysis/facility-analysis-source';
import { equipmentPeriodIssue } from '@domain/visualizations/energy-use/equipment-source';
import { predictorPeriodIssue } from '@domain/visualizations/predictor/predictor-source';
import { civilMonthIndex, civilMonthRange } from '@domain/visualizations/visualization-periods';
import type { VisualizationDefinition, VisualizationPeriod } from '@domain/visualizations/visualization-definition';

export interface PeriodFormValue {
  kind: VisualizationPeriod['kind']; basis: 'calendar' | 'fiscal'; start: string; end: string;
  count: number | null; unit: 'month' | 'year'; anchor: 'latest-data' | 'calendar'; includeIncomplete: boolean; year: number | null;
}

interface PeriodEditorChoice {
  readonly kind: VisualizationPeriod['kind'];
  readonly label: string;
  readonly icon: 'calendar' | 'calendarCheck' | 'clock';
}
export interface PeriodEditorNotice {
  readonly kind: 'analysis' | 'equipment' | 'predictor' | 'exploration' | 'composition' | 'monthly-patterns' | 'year-to-date';
  readonly message: string;
  readonly resetLabel: string;
  readonly reset: Partial<PeriodFormValue>;
}
export interface PeriodEditorPolicy {
  readonly monthInput: boolean;
  readonly title: string;
  readonly choices: readonly PeriodEditorChoice[];
  readonly controls: { readonly ranges: boolean; readonly fiscalYear: boolean; readonly basis: boolean; readonly incomplete: boolean };
  readonly selectionDefaults: Partial<PeriodFormValue>;
  readonly notices: readonly PeriodEditorNotice[];
  readonly retainedPartial: boolean;
}

/** Date controls share one whole-month range and no comparison editor. */
export function periodEditorPolicy(definition: VisualizationDefinition): PeriodEditorPolicy {
  if (definition.chart?.kind === 'time-series' && definition.chart.yearToDate) return { monthInput: false, title: 'All saved years · Year to Date', choices: [{ kind: 'all-history', label: 'All history', icon: 'calendar' }], controls: { ranges: false, fiscalYear: false, basis: false, incomplete: false }, selectionDefaults: {}, retainedPartial: false, notices: [] };
  if (definition.chart?.kind === 'monthly-patterns') return { monthInput: false, title: 'All saved fiscal years',
    choices: [{ kind: 'all-history', label: 'All history', icon: 'calendar' }],
    controls: { ranges: false, fiscalYear: false, basis: false, incomplete: false }, selectionDefaults: {}, retainedPartial: false,
    notices: definition.period.kind !== 'all-history' || definition.comparison.kind !== 'none' ? [{ kind: 'monthly-patterns', message: 'Monthly patterns use all saved years through their fiscal months.', resetLabel: 'Use all history', reset: { kind: 'all-history' } }] : [] };
  const analysis = definition.sources.some(source => source.kind === 'analysis');
  const equipment = definition.sources.some(source => source.kind === 'energy-use');
  const monthInput = usesMonthRange(definition);
  const yearlyUtility = definition.sources.every(source => source.kind === 'utility' && source.dataMode === 'calendarized') && visualizationInterval(definition.chart) === 'yearly';
  const annual = equipment || analysis && visualizationInterval(definition.chart) === 'yearly';
  const choices: PeriodEditorChoice[] = [{ kind: 'all-history', label: 'All history', icon: 'calendar' }];
  const composition = isCompositionChart(definition.chart);
  if (composition && equipment) choices.splice(0);
  if (!annual) choices.push({ kind: 'fixed', label: monthInput ? 'Fixed months' : 'Fixed dates', icon: 'calendarCheck' },
    { kind: 'rolling', label: 'Rolling period', icon: 'clock' });
  if (!monthInput || annual || composition || yearlyUtility) choices.push({ kind: 'fiscal-year', label: 'Pinned fiscal year', icon: 'calendar' },
    { kind: 'latest-saved-year', label: analysis ? 'Latest complete result fiscal year' : 'Latest fiscal year', icon: 'calendarCheck' });
  const notices: PeriodEditorNotice[] = [];
  const compositionIssue = composition ? compositionPeriodIssue(definition) : undefined;
  if (compositionIssue) notices.push({ kind: 'composition', message: compositionIssue, resetLabel: equipment ? 'Use latest saved fiscal year' : 'Use all history', reset: { kind: equipment ? 'latest-saved-year' : 'all-history' } });
  if (analysis && definition.chart && analysisPeriodIssue({ chart: definition.chart, period: definition.period, comparison: definition.comparison })) {
    notices.push({ kind: 'analysis', message: 'Choose a supported date range for analysis results.',
      resetLabel: 'Use all history', reset: { kind: 'all-history', basis: annual ? 'fiscal' : 'calendar', includeIncomplete: false } });
  }
  if (equipment && equipmentPeriodIssue(definition)) {
    notices.push({ kind: 'equipment', message: 'Choose a supported fiscal year for equipment history.',
      resetLabel: 'Use latest saved fiscal year', reset: { kind: 'latest-saved-year' } });
  }
  if (definition.sources.some(source => source.kind === 'predictor') && !analysis && predictorPeriodIssue(definition)) {
    notices.push({ kind: 'predictor', message: 'Choose a supported month range for predictors.',
      resetLabel: 'Use all history', reset: { kind: 'all-history', basis: 'calendar', includeIncomplete: false } });
  }
  const period = definition.period;
  return { monthInput, title: annual ? analysis ? 'Analysis fiscal years' : 'Equipment fiscal years' : monthInput ? 'Month range' : 'Date range', choices,
    controls: { ranges: !annual, fiscalYear: !monthInput || annual || composition || yearlyUtility, basis: !annual && (!monthInput || yearlyUtility), incomplete: !monthInput },
    selectionDefaults: annual ? { basis: 'fiscal' } : monthInput ? { basis: 'calendar', includeIncomplete: false } : {},
    notices, retainedPartial: monthInput && period.kind === 'fixed'
      && (period.start !== period.start.slice(0, 7) + '-01' || period.end !== civilMonthRange(civilMonthIndex(period.end)).end) };
}

function usesMonthRange(definition: VisualizationDefinition): boolean {
  return !definition.sources.some(source => source.kind === 'energy-use' || source.kind === 'analysis' && visualizationInterval(definition.chart) === 'yearly');
}

export function periodFormValue(definition: VisualizationDefinition): PeriodFormValue {
  const period = definition.period, monthly = usesMonthRange(definition);
  return { kind: period.kind, basis: 'basis' in period ? period.basis : 'calendar',
    start: period.kind === 'fixed' ? monthly ? period.start.slice(0, 7) : period.start : '', end: period.kind === 'fixed' ? monthly ? period.end.slice(0, 7) : period.end : '',
    count: period.kind === 'rolling' ? period.count : 12, unit: period.kind === 'rolling' ? period.unit : 'month',
    anchor: period.kind === 'rolling' ? period.anchor : 'latest-data', includeIncomplete: period.kind === 'rolling' ? period.includeIncomplete : true,
    year: period.kind === 'fiscal-year' ? period.year : null,
  };
}

function validCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function periodFormIssue(value: PeriodFormValue, monthly = false): string | undefined {
  if (monthly && value.kind === 'fixed') {
    if (!/^\d{4}-\d{2}$/.test(value.start) || !/^\d{4}-\d{2}$/.test(value.end)
      || !validCivilDate(`${value.start}-01`) || !validCivilDate(`${value.end}-01`) || value.start > value.end)
      return 'Choose real start and end months in chronological order.';
  }
  if (!monthly && value.kind === 'fixed' && (!validCivilDate(value.start) || !validCivilDate(value.end) || value.start > value.end))
    return 'Choose real start and end dates in chronological order.';
  if (value.kind === 'rolling' && (!Number.isSafeInteger(value.count) || value.count! < 1)) return 'Enter a positive whole number of rolling periods.';
  if (value.kind === 'fiscal-year' && (!Number.isSafeInteger(value.year) || value.year! < 1 || value.year! > 9999)) return 'Enter a fiscal year from 1 to 9999.';
  return undefined;
}

export function applyPeriodForm(definition: VisualizationDefinition, value: PeriodFormValue): VisualizationDefinition {
  const monthly = usesMonthRange(definition);
  if (periodFormIssue(value, monthly)) return definition;
  const monthRange = (date: string) => civilMonthRange(civilMonthIndex(date));
  const period: VisualizationPeriod = value.kind === 'fixed' ? { kind: 'fixed', start: monthly ? monthRange(value.start).start : value.start, end: monthly ? monthRange(value.end).end : value.end, basis: value.basis }
    : value.kind === 'rolling' ? { kind: 'rolling', count: value.count!, unit: value.unit, anchor: value.anchor, basis: value.basis, includeIncomplete: value.includeIncomplete }
    : value.kind === 'fiscal-year' ? { kind: 'fiscal-year', year: value.year! }
    : value.kind === 'latest-saved-year' ? { kind: 'latest-saved-year', basis: 'fiscal' } : { kind: 'all-history' };
  return { ...definition, period, comparison: { kind: 'none' } };
}
