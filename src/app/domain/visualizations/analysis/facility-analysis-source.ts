import type { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import type { IdbAccount } from '@data/models/idbModels/account';
import type { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import type { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import type { IdbFacility } from '@data/models/idbModels/facility';
import { annualAnalysisChartValues, monthlyAnalysisSavingsValues, monthlyAnalysisUseValues } from '@domain/calculations/analysis-calculations/analysis-chart-values';
import { energyUseFiscalPeriod } from '@domain/calculations/energy-footprint/energy-use-projection';
import { civilDate, validCivil } from '../utility/utility-periods';
import { civilMonthIndex, civilMonthRange } from '../visualization-periods';
import type { AnalysisResultVisualizationSource, VisualizationChart, VisualizationSource } from '../visualization-definition';
import type { ResolvedVisualizationPeriod, VisualizationChartSupport, VisualizationData, VisualizationObservation, VisualizationSourceCapabilities, VisualizationSourceRequest, VisualizationSourceResolution } from '../visualization-source-provider';

export interface FacilityVisualizationResults {
  readonly scope: 'facility';
  readonly analysis: IdbAnalysisItem;
  readonly facility: IdbFacility;
  readonly monthly: readonly MonthlyAnalysisSummaryData[];
  readonly annual: readonly AnnualAnalysisSummary[];
  readonly groups: readonly { readonly group: AnalysisGroup; readonly monthlyAnalysisSummaryData: readonly MonthlyAnalysisSummaryData[]; readonly annualAnalysisSummaryData: readonly AnnualAnalysisSummary[] }[];
  readonly reportYear?: number;
  readonly groupOnly: boolean;
  readonly groupLabel?: string;
}
export interface AccountVisualizationResults {
  readonly scope: 'account';
  readonly analysis: IdbAccountAnalysisItem;
  readonly account: IdbAccount;
  readonly selectedFacilityGuids: readonly string[];
  readonly monthly: readonly MonthlyAnalysisSummaryData[];
  readonly annual: readonly AnnualAnalysisSummary[];
  readonly reportYear?: number;
}
export type AnalysisVisualizationResults = FacilityVisualizationResults | AccountVisualizationResults;
export function accountAnalysisInclusionIssue(selectedFacilityGuids: readonly string[], includedFacilityGuids: readonly string[]): string | undefined {
  return selectedFacilityGuids.some(guid => !includedFacilityGuids.includes(guid))
    ? 'Include every selected facility to display this saved account analysis, or choose another analysis.' : undefined;
}
export const analysisMeasureLabels: Readonly<Record<AnalysisResultVisualizationSource['measure'], string>> = {
  actual: 'Actual use', calculated: 'Calculated use', savings: 'Rolling 12-month savings (%)', losses: 'Rolling 12-month losses (%)',
  'banked-savings': 'Banked savings (%)', 'banked-losses': 'Banked losses (%)',
  'annual-improvement': 'Annual improvement (%)', 'total-improvement': 'Total improvement (%)'
};
export const analysisSeriesId = (sourceId: string): string => `${sourceId}:result`;
export function analysisUnit(analysis: Pick<IdbAnalysisItem, 'analysisCategory' | 'waterUnit' | 'energyUnit'>, measure: AnalysisResultVisualizationSource['measure']): string {
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
  if (chart.kind !== 'time-series' || !['monthly', 'yearly'].includes(chart.interval) || chart.stack !== 'none') reasons.push('Analysis results support monthly or yearly, unstacked line/bar/area charts.');
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
  if (comparison.kind !== 'none') return 'Analysis results do not support comparisons.';
  if (chart.kind !== 'time-series') return 'Choose a time-series chart.';
  if (chart.interval === 'yearly') return ['all-history', 'latest-saved-year', 'fiscal-year'].includes(period.kind) ? undefined : 'Choose all history, latest complete result fiscal year or one fiscal year.';
  if (!['all-history', 'fixed', 'rolling'].includes(period.kind) || 'basis' in period && period.basis !== 'calendar') return 'Monthly analysis results require calendar months.';
  if (period.kind === 'fixed' && (!validCivil(period.start) || !validCivil(period.end) || period.start > period.end || period.start.slice(8) !== '01'
    || civilMonthRange(civilMonthIndex(period.end)).end !== period.end)) return 'Choose an inclusive range of whole months.';
  if (period.kind === 'rolling' && (!Number.isSafeInteger(period.count) || period.count < 1 || period.includeIncomplete)) return 'Choose a positive rolling range of completed months.';
  return undefined;
}
export function latestAnalysisMonth(value: Pick<AnalysisVisualizationResults, 'monthly'>): string | undefined {
  return value.monthly.map(row => new Date(row.date)).filter(date => Number.isFinite(date.getTime()))
    .map(date => civilMonthRange(date.getFullYear() * 12 + date.getMonth()).end).sort().at(-1);
}
/** Projects current authoritative results only; never changes calculation periods or saved analyses. */
export function resolveFacilityAnalysisResults(value: FacilityVisualizationResults, request: VisualizationSourceRequest): VisualizationSourceResolution {
  return resolveAnalysisResults(value, request);
}
export function resolveAccountAnalysisResults(value: AccountVisualizationResults, request: VisualizationSourceRequest): VisualizationSourceResolution {
  return resolveAnalysisResults(value, request);
}
function resolveAnalysisResults(value: AnalysisVisualizationResults, request: VisualizationSourceRequest): VisualizationSourceResolution {
  const { source, identity, period, chart } = request;
  const unsupported = (message: string): VisualizationSourceResolution => ({ identity, state: 'unsupported', message });
  const support = facilityAnalysisChartSupport(source, chart), periodIssue = analysisPeriodIssue(request);
  if (support.state === 'unsupported') return unsupported(support.reasons.join(' '));
  if (periodIssue) return unsupported(periodIssue);
  if (source.kind !== 'analysis' || source.mode !== 'result' || chart.kind !== 'time-series') return unsupported('Choose analysis results.');
  const { analysis } = value;
  const facility = value.scope === 'facility' ? value.facility : undefined;
  const owner = value.scope === 'account' ? value.account : value.facility;
  if (analysis.guid !== source.analysisGuid || analysis.accountId !== identity.accountGuid
    || (value.scope === 'account' ? value.account.guid !== identity.accountGuid
      : value.facility.guid !== value.analysis.facilityId || value.facility.accountId !== identity.accountGuid || !identity.scope.facilityGuids.includes(value.facility.guid))) {
    return { identity, state: 'missing-source', references: [{ kind: 'analysis', id: source.analysisGuid ?? '' }], message: 'The named analysis is unavailable within the included facilities.' };
  }
  if (value.scope === 'account') {
    if (source.groupGuid || source.measure.startsWith('banked-')) return unsupported('Account totals do not support group targets or separate banked measures.');
    const inclusion = accountAnalysisInclusionIssue(value.selectedFacilityGuids, identity.scope.facilityGuids);
    if (inclusion) return unsupported(inclusion);
  }
  const group = value.scope === 'facility' && source.groupGuid ? value.analysis.groups.find(group => group.idbGroupId === source.groupGuid) : undefined;
  if (source.groupGuid && (!group || ['skip', 'skipAnalysis'].includes(group.analysisType))) return { identity, state: 'missing-source', references: [{ kind: 'analysis-group', id: source.groupGuid }], message: 'Choose an applicable group from the named analysis.' };
  if (source.measure.startsWith('banked-') && !(value.scope === 'facility' && value.analysis.hasBanking && group?.applyBanking)) return unsupported('This group has no applicable banking.');
  const id = analysisSeriesId(source.id), unit = analysisUnit(analysis, source.measure), percentage = unit === '%';
  if (!unit) return unsupported('The named analysis has no saved display unit.');
  const resourceGuid = source.groupGuid ?? analysis.guid;
  const series = [{ id, sourceId: source.id, metric: source.measure, resourceGuid, label: `${analysis.name} · ${source.groupGuid && value.scope === 'facility' ? value.groupLabel ?? source.groupGuid : value.scope === 'account' ? 'Account total' : 'Facility total'} · ${analysisMeasureLabels[source.measure]}`,
    unit, dimension: percentage ? 'percentage' : analysis.analysisCategory, additive: false,
    ...(!percentage && analysis.analysisCategory === 'energy' ? { energyTreatment: analysis.energyIsSource ? 'source' as const : 'site' as const } : {}) }];
  const periods: ResolvedVisualizationPeriod[] = [], rows: Extract<VisualizationData, { kind: 'time-series' }>['rows'][number][] = [];
  const intermediateYears = new Set((value.scope === 'facility' ? value.groups : []).flatMap(group => group.annualAnalysisSummaryData.filter(row => row.isIntermediateBanked).map(row => row.year)));
  const intermediateMonths = new Set((value.scope === 'facility' ? value.groups : []).flatMap(group => group.monthlyAnalysisSummaryData.filter(row => row.isIntermediateBanked && Number.isFinite(new Date(row.date).getTime())).map(row => civilMonthIndex(civilDate(new Date(row.date))))));
  const warnings: string[] = value.scope === 'facility' && value.groupOnly ? ['Selected-group results end at its latest complete fiscal year while another group blocks facility results.'] : [];
  const point = (amount: number | null | undefined, partial: boolean, notes: string[], excluded = false): VisualizationObservation =>
    excluded ? { state: 'excluded', value: null, reason: 'Calculated/annual improvement is unavailable during this banking transition.' }
      : amount == null || !Number.isFinite(amount) ? { state: 'missing', value: null, reason: 'No finite analysis result is available for this period.' }
        : { state: 'observed', value: amount, provenance: source.measure === 'actual' ? 'measured' : source.measure === 'calculated' ? 'modeled' : 'savings', partial, notes };
  if (chart.interval === 'yearly') {
    const available = value.annual.filter(row => Number.isInteger(row.year) && (value.reportYear === undefined || row.year <= value.reportYear));
    const years = period.kind === 'fiscal-year' ? [period.year] : period.kind === 'latest-saved-year' ? available.map(row => row.year).sort((a, b) => a - b).slice(-1) : available.map(row => row.year);
    for (const year of years) {
      const fiscal = energyUseFiscalPeriod(owner, year), row = available.find(row => row.year === year);
      if (!fiscal) return unsupported('Repair the analysis owner’s fiscal calendar.');
      const [start, end] = fiscal.key.split(' / ');
      if (![start, end].every(validCivil)) return unsupported('The fiscal interval falls outside supported civil dates.');
      const intermediate = row?.isIntermediateBanked || !source.groupGuid && intermediateYears.has(year);
      const projected = row ? annualAnalysisChartValues({ ...row, isIntermediateBanked: !!intermediate }) : {};
      const metric = source.measure === 'annual-improvement' ? 'annualImprovement' : source.measure === 'total-improvement' ? 'totalImprovement' : source.measure;
      const partial = !!row?.missingPredictorValue;
      periods.push({ role: 'primary', start, end, basis: 'fiscal', interval: 'yearly', ...(facility ? { facilityGuid: facility.guid } : {}), fiscalYear: year });
      rows.push({ periodKey: `FY ${year}`, start, end, values: { [id]: point(projected[metric], partial, partial ? [`Missing predictor inputs: ${row.missingPredictors?.join(', ') || 'unknown'}`] : [], !!intermediate && ['calculated', 'annual-improvement'].includes(source.measure)) } });
    }
  } else {
    const monthly = value.monthly.filter(row => Number.isFinite(new Date(row.date).getTime()));
    const byMonth = new Map(monthly.map(row => [civilMonthIndex(civilDate(new Date(row.date))), row]));
    const savings = monthlyAnalysisSavingsValues(monthly, !!source.groupGuid && monthly.some(row => row.isBanked));
    const savingsByMonth = new Map(monthly.map((row, index) => [civilMonthIndex(civilDate(new Date(row.date))), savings[index]]));
    let first = Math.min(...byMonth.keys()), last = Math.max(...byMonth.keys());
    if (period.kind === 'fixed') { first = civilMonthIndex(period.start); last = civilMonthIndex(period.end); }
    if (period.kind === 'rolling') {
      const anchor = period.anchor === 'calendar' ? request.dateContext.calendarDate : latestAnalysisMonth(value);
      if (anchor) { last = civilMonthIndex(anchor) - (period.anchor === 'calendar' ? 1 : 0); first = last - period.count * (period.unit === 'year' ? 12 : 1) + 1; }
    }
    if (Number.isFinite(first) && (first < 12 || last > 119999 || last - first > 119987)) return unsupported('Choose months within civil years 1–9999.');
    for (let month = first; month <= last; month++) {
      const range = civilMonthRange(month), row = byMonth.get(month);
      const intermediate = row?.isIntermediateBanked || !source.groupGuid && intermediateMonths.has(month);
      const metric = source.measure === 'banked-savings' ? 'bankedSavings' : source.measure === 'banked-losses' ? 'bankedLosses' : source.measure;
      const numeric = row ? ['actual', 'calculated'].includes(source.measure) ? monthlyAnalysisUseValues({ ...row, isIntermediateBanked: !!intermediate })[metric] : savingsByMonth.get(month)?.[metric] : null;
      const invalidImprovement = row && !['actual', 'calculated'].includes(source.measure) && !Number.isFinite(row.rolling12MonthImprovement);
      const partial = !!row?.missingValueWarning || !!row?.missingPredictors?.length;
      const notes = [row?.isBanked ? 'Banked result' : '', intermediate ? 'Banking transition' : '', partial ? `Missing inputs: ${row?.missingPredictors?.join(', ') || 'analysis input warning'}` : ''].filter(Boolean);
      periods.push({ role: 'primary', ...range, basis: 'calendar', interval: 'monthly', ...(facility ? { facilityGuid: facility.guid } : {}) });
      rows.push({ periodKey: range.start.slice(0, 7), ...range, values: { [id]: point(invalidImprovement ? null : numeric, partial, notes, !!intermediate && source.measure === 'calculated') } });
    }
  }
  const resolved = { data: { kind: 'time-series' as const, rows }, series, periods,
    alignment: { kind: chart.interval === 'yearly' ? 'fiscal-interval' as const : 'civil-month' as const, key: chart.interval === 'yearly' ? 'actual-annual-interval' : 'civil-month' },
    references: [{ kind: 'analysis' as const, id: analysis.guid, accountGuid: analysis.accountId, ...(facility ? { facilityGuid: facility.guid } : {}) },
      ...(source.groupGuid ? [{ kind: 'analysis-group' as const, id: source.groupGuid, accountGuid: analysis.accountId, ...(facility ? { facilityGuid: facility.guid } : {}) }] : [])],
    provenance: [source.measure === 'actual' ? 'measured' as const : source.measure === 'calculated' ? 'modeled' as const : 'savings' as const],
    quality: { partial: rows.some(row => Object.values(row.values).some(point => point.state !== 'observed' || point.partial)), warnings }, analysisFreshness: 'current' as const,
    ...(value.scope === 'account' ? { accountAnalysisFacilityGuids: [...value.selectedFacilityGuids] } : {}) };
  return rows.some(row => Object.values(row.values).some(point => point.state === 'observed')) ? { identity, state: 'ready', resolved }
    : { identity, state: 'empty', periods, resolved, message: 'No usable analysis values in the requested period.' };
}
