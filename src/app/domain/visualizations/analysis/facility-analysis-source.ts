import type { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import type { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import type { IdbFacility } from '@data/models/idbModels/facility';
import { annualAnalysisChartValues, monthlyAnalysisSavingsValues, monthlyAnalysisUseValues } from '@domain/calculations/analysis-calculations/analysis-chart-values';
import { energyUseFiscalPeriod } from '@domain/calculations/energy-footprint/energy-use-projection';
import { civilDate, validCivil } from '../utility/utility-periods';
import { predictorMonthRange } from '../predictor/predictor-source';
import type { AnalysisResultVisualizationSource, VisualizationChart, VisualizationSource } from '../visualization-definition';
import type { ResolvedVisualizationPeriod, VisualizationChartSupport, VisualizationData, VisualizationObservation, VisualizationSourceCapabilities, VisualizationSourceRequest, VisualizationSourceResolution } from '../visualization-source-provider';

export interface FacilityVisualizationResults {
  readonly analysis: IdbAnalysisItem;
  readonly facility: IdbFacility;
  readonly monthly: readonly MonthlyAnalysisSummaryData[];
  readonly annual: readonly AnnualAnalysisSummary[];
  readonly groups: readonly { readonly group: AnalysisGroup; readonly monthlyAnalysisSummaryData: readonly MonthlyAnalysisSummaryData[]; readonly annualAnalysisSummaryData: readonly AnnualAnalysisSummary[] }[];
  readonly reportYear?: number;
  readonly groupOnly: boolean;
  readonly groupLabel?: string;
}
export const analysisMeasureLabels: Readonly<Record<AnalysisResultVisualizationSource['measure'], string>> = {
  actual: 'Actual use', calculated: 'Calculated use', savings: 'Rolling 12-month savings (%)', losses: 'Rolling 12-month losses (%)',
  'banked-savings': 'Banked savings (%)', 'banked-losses': 'Banked losses (%)',
  'annual-improvement': 'Annual improvement (%)', 'total-improvement': 'Total improvement (%)'
};
export const analysisSeriesId = (sourceId: string): string => `${sourceId}:result`;
export function analysisUnit(analysis: IdbAnalysisItem, measure: AnalysisResultVisualizationSource['measure']): string {
  return measure === 'actual' || measure === 'calculated' ? analysis.analysisCategory === 'water' ? analysis.waterUnit : analysis.energyUnit : '%';
}
export function facilityAnalysisCapabilities(): VisualizationSourceCapabilities {
  return { kind: 'analysis', measures: Object.keys(analysisMeasureLabels) as AnalysisResultVisualizationSource['measure'][], aggregations: ['none'],
    periods: ['all-history', 'fixed', 'rolling', 'latest-saved-year', 'fiscal-year'], comparisons: ['none'], chartKinds: ['time-series'], shapes: ['time-series'],
    alignments: ['civil-month', 'fiscal-interval'], settings: ['unit', 'energyTreatment'], controls: ['series', 'appearance', 'axes'], allowDateOverride: true, allowMultipleSources: false };
}
export function facilityAnalysisChartSupport(source: VisualizationSource, chart: VisualizationChart): VisualizationChartSupport {
  const reasons: string[] = [];
  if (source.kind !== 'analysis' || source.mode !== 'result') reasons.push('Saved model visualizations are not supported in this slice.');
  if (chart.kind !== 'time-series' || !['monthly', 'yearly'].includes(chart.interval) || chart.stack !== 'none' || !['line', 'bar'].includes(chart.defaultTraceType)) reasons.push('Facility analysis results support monthly or yearly, unstacked line/bar charts.');
  if (source.kind === 'analysis' && source.mode === 'result') {
    if (chart.kind === 'time-series') {
      if (chart.interval === 'yearly' && !['actual', 'calculated', 'annual-improvement', 'total-improvement'].includes(source.measure)) reasons.push('Savings and losses use monthly rolling percentage results.');
      if (chart.interval === 'monthly' && ['annual-improvement', 'total-improvement'].includes(source.measure)) reasons.push('Annual and total improvement require yearly results.');
    }
    if (source.measure.startsWith('banked-') && !source.groupGuid) reasons.push('Banked savings and losses require a group with applicable banking.');
    if (source.settings?.unit?.kind === 'pinned' || source.settings?.energyTreatment?.kind === 'pinned') reasons.push('Follow the named analysis’s saved units and site/source basis; conversions are unsupported.');
  }
  return reasons.length ? { chart, state: 'unsupported', reasons } : { chart, state: 'supported' };
}
export function analysisPeriodIssue(request: Pick<VisualizationSourceRequest, 'chart' | 'period' | 'comparison'>): string | undefined {
  const { chart, period, comparison } = request;
  if (comparison.kind !== 'none') return 'Facility analysis results do not support comparisons.';
  if (chart.kind !== 'time-series') return 'Choose a time-series chart.';
  if (chart.interval === 'yearly') return ['all-history', 'latest-saved-year', 'fiscal-year'].includes(period.kind) ? undefined : 'Choose all history, latest complete result fiscal year or one fiscal year.';
  if (!['all-history', 'fixed', 'rolling'].includes(period.kind) || 'basis' in period && period.basis !== 'calendar') return 'Monthly analysis results require calendar months.';
  if (period.kind === 'fixed' && (!validCivil(period.start) || !validCivil(period.end) || period.start > period.end || period.start.slice(8) !== '01'
    || predictorMonthRange(monthNumber(period.end)).end !== period.end)) return 'Choose an inclusive range of whole months.';
  if (period.kind === 'rolling' && (!Number.isSafeInteger(period.count) || period.count < 1 || period.includeIncomplete)) return 'Choose a positive rolling range of completed months.';
  return undefined;
}
function monthNumber(value: string): number { return Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7)) - 1; }
export function latestAnalysisMonth(value: FacilityVisualizationResults): string | undefined {
  return value.monthly.map(row => new Date(row.date)).filter(date => Number.isFinite(date.getTime()))
    .map(date => predictorMonthRange(date.getFullYear() * 12 + date.getMonth()).end).sort().at(-1);
}
/** Projects current authoritative results only; never changes calculation periods or saved analyses. */
export function resolveFacilityAnalysisResults(value: FacilityVisualizationResults, request: VisualizationSourceRequest): VisualizationSourceResolution {
  const { source, identity, period, chart } = request;
  const unsupported = (message: string): VisualizationSourceResolution => ({ identity, state: 'unsupported', message });
  const support = facilityAnalysisChartSupport(source, chart), periodIssue = analysisPeriodIssue(request);
  if (support.state === 'unsupported') return unsupported(support.reasons.join(' '));
  if (periodIssue) return unsupported(periodIssue);
  if (source.kind !== 'analysis' || source.mode !== 'result' || chart.kind !== 'time-series') return unsupported('Choose facility analysis results.');
  const { analysis, facility } = value;
  if (analysis.guid !== source.analysisGuid || analysis.accountId !== identity.accountGuid || facility.guid !== analysis.facilityId
    || facility.accountId !== identity.accountGuid || !identity.scope.facilityGuids.includes(facility.guid)) return { identity, state: 'missing-source', references: [{ kind: 'analysis', id: source.analysisGuid ?? '' }], message: 'The named analysis is unavailable within the included facilities.' };
  const group = source.groupGuid ? analysis.groups.find(group => group.idbGroupId === source.groupGuid) : undefined;
  if (source.groupGuid && (!group || ['skip', 'skipAnalysis'].includes(group.analysisType))) return { identity, state: 'missing-source', references: [{ kind: 'analysis-group', id: source.groupGuid }], message: 'Choose an applicable group from the named analysis.' };
  if (source.measure.startsWith('banked-') && !(analysis.hasBanking && group?.applyBanking)) return unsupported('This group has no applicable banking.');
  const id = analysisSeriesId(source.id), unit = analysisUnit(analysis, source.measure), percentage = unit === '%';
  if (!unit) return unsupported('The named analysis has no saved display unit.');
  const resourceGuid = source.groupGuid ?? analysis.guid;
  const series = [{ id, sourceId: source.id, metric: source.measure, resourceGuid, label: `${analysis.name} · ${source.groupGuid ? value.groupLabel ?? source.groupGuid : 'Facility total'} · ${analysisMeasureLabels[source.measure]}`,
    unit, dimension: percentage ? 'percentage' : analysis.analysisCategory, additive: false,
    ...(!percentage && analysis.analysisCategory === 'energy' ? { energyTreatment: analysis.energyIsSource ? 'source' as const : 'site' as const } : {}) }];
  const periods: ResolvedVisualizationPeriod[] = [], rows: Extract<VisualizationData, { kind: 'time-series' }>['rows'][number][] = [];
  const intermediateYears = new Set(value.groups.flatMap(group => group.annualAnalysisSummaryData.filter(row => row.isIntermediateBanked).map(row => row.year)));
  const intermediateMonths = new Set(value.groups.flatMap(group => group.monthlyAnalysisSummaryData.filter(row => row.isIntermediateBanked && Number.isFinite(new Date(row.date).getTime())).map(row => monthNumber(civilDate(new Date(row.date))))));
  const warnings: string[] = value.groupOnly ? ['Selected-group results end at its latest complete fiscal year while another group blocks facility results.'] : [];
  const point = (amount: number | null | undefined, partial: boolean, notes: string[], excluded = false): VisualizationObservation =>
    excluded ? { state: 'excluded', value: null, reason: 'Calculated/annual improvement is unavailable during this banking transition.' }
      : amount == null || !Number.isFinite(amount) ? { state: 'missing', value: null, reason: 'No finite analysis result is available for this period.' }
        : { state: 'observed', value: amount, provenance: source.measure === 'actual' ? 'measured' : source.measure === 'calculated' ? 'modeled' : 'savings', partial, notes };
  if (chart.interval === 'yearly') {
    const available = value.annual.filter(row => Number.isInteger(row.year) && (value.reportYear === undefined || row.year <= value.reportYear));
    const years = period.kind === 'fiscal-year' ? [period.year] : period.kind === 'latest-saved-year' ? available.map(row => row.year).sort((a, b) => a - b).slice(-1) : available.map(row => row.year);
    for (const year of years) {
      const fiscal = energyUseFiscalPeriod(facility, year), row = available.find(row => row.year === year);
      if (!fiscal) return unsupported('Repair the facility fiscal calendar.');
      const [start, end] = fiscal.key.split(' / ');
      if (![start, end].every(validCivil)) return unsupported('The fiscal interval falls outside supported civil dates.');
      const intermediate = row?.isIntermediateBanked || !source.groupGuid && intermediateYears.has(year);
      const projected = row ? annualAnalysisChartValues({ ...row, isIntermediateBanked: !!intermediate }) : {};
      const metric = source.measure === 'annual-improvement' ? 'annualImprovement' : source.measure === 'total-improvement' ? 'totalImprovement' : source.measure;
      const partial = !!row?.missingPredictorValue;
      periods.push({ role: 'primary', start, end, basis: 'fiscal', interval: 'yearly', facilityGuid: facility.guid, fiscalYear: year });
      rows.push({ periodKey: `FY ${year}`, start, end, values: { [id]: point(projected[metric], partial, partial ? [`Missing predictor inputs: ${row.missingPredictors?.join(', ') || 'unknown'}`] : [], !!intermediate && ['calculated', 'annual-improvement'].includes(source.measure)) } });
    }
  } else {
    const monthly = value.monthly.filter(row => Number.isFinite(new Date(row.date).getTime()));
    const byMonth = new Map(monthly.map(row => [monthNumber(civilDate(new Date(row.date))), row]));
    const savings = monthlyAnalysisSavingsValues(monthly, !!source.groupGuid && monthly.some(row => row.isBanked));
    const savingsByMonth = new Map(monthly.map((row, index) => [monthNumber(civilDate(new Date(row.date))), savings[index]]));
    let first = Math.min(...byMonth.keys()), last = Math.max(...byMonth.keys());
    if (period.kind === 'fixed') { first = monthNumber(period.start); last = monthNumber(period.end); }
    if (period.kind === 'rolling') {
      const anchor = period.anchor === 'calendar' ? request.dateContext.calendarDate : latestAnalysisMonth(value);
      if (anchor) { last = monthNumber(anchor) - (period.anchor === 'calendar' ? 1 : 0); first = last - period.count * (period.unit === 'year' ? 12 : 1) + 1; }
    }
    if (Number.isFinite(first) && (first < 12 || last > 119999 || last - first > 119987)) return unsupported('Choose months within civil years 1–9999.');
    for (let month = first; month <= last; month++) {
      const range = predictorMonthRange(month), row = byMonth.get(month);
      const intermediate = row?.isIntermediateBanked || !source.groupGuid && intermediateMonths.has(month);
      const metric = source.measure === 'banked-savings' ? 'bankedSavings' : source.measure === 'banked-losses' ? 'bankedLosses' : source.measure;
      const numeric = row ? ['actual', 'calculated'].includes(source.measure) ? monthlyAnalysisUseValues({ ...row, isIntermediateBanked: !!intermediate })[metric] : savingsByMonth.get(month)?.[metric] : null;
      const invalidImprovement = row && !['actual', 'calculated'].includes(source.measure) && !Number.isFinite(row.rolling12MonthImprovement);
      const partial = !!row?.missingValueWarning || !!row?.missingPredictors?.length;
      const notes = [row?.isBanked ? 'Banked result' : '', intermediate ? 'Banking transition' : '', partial ? `Missing inputs: ${row?.missingPredictors?.join(', ') || 'analysis input warning'}` : ''].filter(Boolean);
      periods.push({ role: 'primary', ...range, basis: 'calendar', interval: 'monthly', facilityGuid: facility.guid });
      rows.push({ periodKey: range.start.slice(0, 7), ...range, values: { [id]: point(invalidImprovement ? null : numeric, partial, notes, !!intermediate && source.measure === 'calculated') } });
    }
  }
  const resolved = { data: { kind: 'time-series' as const, rows }, series, periods,
    alignment: { kind: chart.interval === 'yearly' ? 'fiscal-interval' as const : 'civil-month' as const, key: chart.interval === 'yearly' ? 'actual-annual-interval' : 'civil-month' },
    references: [{ kind: 'analysis' as const, id: analysis.guid, accountGuid: analysis.accountId, facilityGuid: facility.guid },
      ...(source.groupGuid ? [{ kind: 'analysis-group' as const, id: source.groupGuid, accountGuid: analysis.accountId, facilityGuid: facility.guid }] : [])],
    provenance: [source.measure === 'actual' ? 'measured' as const : source.measure === 'calculated' ? 'modeled' as const : 'savings' as const],
    quality: { partial: rows.some(row => Object.values(row.values).some(point => point.state !== 'observed' || point.partial)), warnings }, analysisFreshness: 'current' as const };
  return rows.some(row => Object.values(row.values).some(point => point.state === 'observed')) ? { identity, state: 'ready', resolved }
    : { identity, state: 'empty', periods, resolved, message: 'No usable analysis values in the requested period.' };
}
