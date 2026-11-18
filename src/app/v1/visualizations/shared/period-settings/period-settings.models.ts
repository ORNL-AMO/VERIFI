import { isCompositionChart, compositionPeriodIssue } from '@domain/visualizations/visualization-composition';
import { isExplorationChart, visualizationInterval } from '@domain/visualizations/visualization-interval';
import { analysisPeriodIssue } from '@domain/visualizations/analysis/facility-analysis-source';
import { equipmentPeriodIssue } from '@domain/visualizations/energy-use/equipment-source';
import { predictorPeriodIssue } from '@domain/visualizations/predictor/predictor-source';
import { civilMonthIndex, civilMonthRange } from '@domain/visualizations/visualization-periods';
import type { VisualizationComparison, VisualizationDefinition, VisualizationPeriod } from '@domain/visualizations/visualization-definition';

export interface PeriodFormValue {
  kind: VisualizationPeriod['kind']; basis: 'calendar' | 'fiscal'; start: string; end: string;
  count: number | null; unit: 'month' | 'year'; anchor: 'latest-data' | 'calendar'; includeIncomplete: boolean; year: number | null;
  comparison: VisualizationComparison['kind']; comparisonBasis: 'calendar' | 'fiscal'; comparisonStart: string; comparisonEnd: string;
}

interface PeriodEditorChoice {
  readonly kind: VisualizationPeriod['kind'];
  readonly label: string;
  readonly icon: 'calendar' | 'calendarCheck' | 'clock';
}
export interface PeriodEditorNotice {
  readonly kind: 'analysis' | 'equipment' | 'predictor' | 'exploration' | 'composition';
  readonly message: string;
  readonly resetLabel: string;
  readonly reset: Partial<PeriodFormValue>;
}
export interface PeriodEditorPolicy {
  readonly monthInput: boolean;
  readonly title: string;
  readonly choices: readonly PeriodEditorChoice[];
  readonly controls: { readonly ranges: boolean; readonly fiscalYear: boolean; readonly basis: boolean; readonly comparison: boolean; readonly incomplete: boolean };
  readonly selectionDefaults: Partial<PeriodFormValue>;
  readonly notices: readonly PeriodEditorNotice[];
  readonly retainedPartial: boolean;
}

/** Presentation policy only: unsupported combinations retain the existing editor controls and saved intent. */
export function periodEditorPolicy(definition: VisualizationDefinition): PeriodEditorPolicy {
  const analysis = definition.sources.some(source => source.kind === 'analysis');
  const equipment = definition.sources.some(source => source.kind === 'energy-use');
  const monthInput = usesMonthRange(definition);
  const annual = equipment || analysis && visualizationInterval(definition.chart) === 'yearly';
  const choices: PeriodEditorChoice[] = [{ kind: 'all-history', label: 'All history', icon: 'calendar' }];
  const composition = isCompositionChart(definition.chart);
  if (composition && equipment) choices.splice(0);
  if (!annual) choices.push({ kind: 'fixed', label: monthInput ? 'Fixed months' : 'Fixed dates', icon: 'calendarCheck' },
    { kind: 'rolling', label: 'Rolling period', icon: 'clock' });
  if (!monthInput || annual || composition) choices.push({ kind: 'fiscal-year', label: 'Pinned fiscal year', icon: 'calendar' },
    { kind: 'latest-saved-year', label: analysis ? 'Latest complete result fiscal year' : 'Latest fiscal year', icon: 'calendarCheck' });
  const notices: PeriodEditorNotice[] = [];
  const compositionIssue = composition ? compositionPeriodIssue(definition) : undefined;
  if (compositionIssue) notices.push({ kind: 'composition', message: compositionIssue, resetLabel: equipment ? 'Use latest saved fiscal year' : 'Use all history without comparison', reset: { kind: equipment ? 'latest-saved-year' : 'all-history', comparison: 'none' } });
  if (analysis && definition.chart && analysisPeriodIssue({ chart: definition.chart, period: definition.period, comparison: definition.comparison })) {
    notices.push({ kind: 'analysis', message: 'This period or comparison is unsupported for analysis results. The saved intent is retained.',
      resetLabel: 'Use all history without comparison', reset: { kind: 'all-history', basis: annual ? 'fiscal' : 'calendar', includeIncomplete: false, comparison: 'none' } });
  }
  if (equipment && equipmentPeriodIssue(definition)) {
    notices.push({ kind: 'equipment', message: 'The saved period or comparison is unsupported for equipment history. Its intent is retained.',
      resetLabel: 'Use latest saved fiscal year without comparison', reset: { kind: 'latest-saved-year', comparison: 'none' } });
  }
  if (definition.sources.some(source => source.kind === 'predictor') && !analysis && predictorPeriodIssue(definition)) {
    notices.push({ kind: 'predictor', message: 'The saved range or comparison is not supported for predictors. Its intent is retained.',
      resetLabel: 'Use all history without comparison', reset: { kind: 'all-history', basis: 'calendar', includeIncomplete: false, comparison: 'none' } });
  }
  if (isExplorationChart(definition.chart) && definition.comparison.kind !== 'none') notices.push({ kind: 'exploration', message: 'Exploration uses one selected period without a comparison overlay. The saved comparison is retained.', resetLabel: 'Use one period without comparison', reset: { comparison: 'none' } });
  const period = definition.period;
  return { monthInput, title: annual ? analysis ? 'Analysis fiscal years' : 'Equipment fiscal years' : monthInput ? 'Month range' : 'Periods and comparisons', choices,
    controls: { ranges: !annual, fiscalYear: !monthInput || annual || composition, basis: !annual && !monthInput, comparison: !composition && !annual && !monthInput && !isExplorationChart(definition.chart), incomplete: !monthInput },
    selectionDefaults: annual ? { comparison: 'none', basis: 'fiscal' } : monthInput ? { basis: 'calendar', includeIncomplete: false, comparison: 'none' } : {},
    notices, retainedPartial: monthInput && period.kind === 'fixed'
      && (period.start !== period.start.slice(0, 7) + '-01' || period.end !== civilMonthRange(civilMonthIndex(period.end)).end) };
}

function usesMonthRange(definition: VisualizationDefinition): boolean {
  return isCompositionChart(definition.chart) && definition.sources.every(source => source.kind === 'utility') || isExplorationChart(definition.chart) && visualizationInterval(definition.chart) === 'monthly' || definition.sources.some(source => source.kind === 'predictor')
    || definition.sources.some(source => source.kind === 'analysis') && definition.chart?.kind === 'time-series' && definition.chart.interval === 'monthly';
}

export function periodFormValue(definition: VisualizationDefinition): PeriodFormValue {
  const period = definition.period, comparison = definition.comparison, monthly = usesMonthRange(definition);
  return { kind: period.kind, basis: 'basis' in period ? period.basis : 'calendar',
    start: period.kind === 'fixed' ? monthly ? period.start.slice(0, 7) : period.start : '', end: period.kind === 'fixed' ? monthly ? period.end.slice(0, 7) : period.end : '',
    count: period.kind === 'rolling' ? period.count : 12, unit: period.kind === 'rolling' ? period.unit : 'month',
    anchor: period.kind === 'rolling' ? period.anchor : 'latest-data', includeIncomplete: period.kind === 'rolling' ? period.includeIncomplete : true,
    year: period.kind === 'fiscal-year' ? period.year : null,
    comparison: comparison.kind, comparisonBasis: comparison.kind === 'previous-year' ? comparison.basis : 'calendar',
    comparisonStart: comparison.kind === 'custom' ? comparison.start : '', comparisonEnd: comparison.kind === 'custom' ? comparison.end : '' };
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
  if (value.comparison === 'custom' && (!validCivilDate(value.comparisonStart) || !validCivilDate(value.comparisonEnd) || value.comparisonStart > value.comparisonEnd))
    return 'Choose real comparison start and end dates in chronological order.';
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
  const comparison: VisualizationComparison = value.comparison === 'custom' ? { kind: 'custom', start: value.comparisonStart, end: value.comparisonEnd }
    : value.comparison === 'previous-year' ? { kind: 'previous-year', basis: value.comparisonBasis } : { kind: value.comparison };
  return { ...definition, period, comparison };
}
