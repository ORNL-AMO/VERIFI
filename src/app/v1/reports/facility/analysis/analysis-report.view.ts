import { AnalysisGroup, AnalysisTableColumns, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { AnalysisDataCheckGroup, AnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { IdbFacility } from '@data/models/idbModels/facility';
import { AnalysisReportSettings } from '@data/models/idbModels/facilityReport';
import { FacilityAnalysisGroupCalculationResult } from '@platform/web-workers/facility-analysis-results-worker.contract';
import { annualResultMarkers, monthlyResultMarkers, orderedUniqueResultMarkers } from '@app/v1/shared/analysis-results/result-markers/analysis-result-markers';
import { analysisResultCell, analysisResultColumn, finiteAnalysisResultValue } from '@app/v1/shared/analysis-results/columns/analysis-result-columns';
import { COLUMN_OPTIONS, ColumnKey } from './analysis-report-columns';

interface ReportSection {
  readonly id: string;
  readonly heading: string;
}
interface GroupReportSection extends ReportSection {
  readonly result: FacilityAnalysisGroupCalculationResult;
}
export type FacilityAnalysisReportSection =
  | ReportSection & { readonly kind: 'facility-annual' }
  | ReportSection & { readonly kind: 'facility-monthly'; readonly periods: ReturnType<typeof monthlyReportPeriods> }
  | GroupReportSection & { readonly kind: 'group-model'; readonly checked?: AnalysisDataCheckGroup }
  | GroupReportSection & { readonly kind: 'group-annual' }
  | GroupReportSection & { readonly kind: 'group-monthly'; readonly periods: ReturnType<typeof monthlyReportPeriods> };

export function analysisReportSections(settings: AnalysisReportSettings, analysis: IdbAnalysisItem,
  results: { readonly reportYear?: number; readonly monthlyAnalysisSummaryData: readonly MonthlyAnalysisSummaryData[];
    readonly groupSummaries: readonly FacilityAnalysisGroupCalculationResult[] },
  checks: readonly AnalysisDataChecks[], groupNames: Readonly<Record<string, string>>): readonly FacilityAnalysisReportSection[] {
  const sections: FacilityAnalysisReportSection[] = [];
  const reportYear = results.reportYear ?? settings.reportYear;
  if (settings.facilityAnnualResults && (settings.facilityAnnualResultsTable || settings.facilityAnnualResultsGraphs)) {
    sections.push({ id: 'facility-annual', kind: 'facility-annual', heading: 'Annual facility analysis' });
  }
  const periods = monthlyReportPeriods(results.monthlyAnalysisSummaryData, settings, analysis.baselineYear, reportYear);
  if (settings.facilityMonthlyResults && (periods.length || settings.facilityMonthlyResultsGraphs)) {
    sections.push({ id: 'facility-monthly', kind: 'facility-monthly', heading: 'Monthly facility analysis', periods });
  }
  if (!settings.groupReports) return sections;
  const resultsByGroup = new Map(results.groupSummaries.map(result => [result.group.idbGroupId, result]));
  const checksByGroup = new Map(checks.flatMap(check => check.groups).map(check => [check.group.idbGroupId, check]));
  for (const current of analysis.groups) {
    const source = resultsByGroup.get(current.idbGroupId);
    if (!source) continue;
    const variables = current.predictorVariables ?? source.group.predictorVariables ?? [];
    const result = { ...source, group: { ...source.group, predictorVariables: variables } };
    const name = groupNames[current.idbGroupId] ?? 'Analysis group', id = `group-${current.idbGroupId}`;
    if (settings.groupModelDetails && result.group.analysisType === 'regression') {
      const check = checksByGroup.get(current.idbGroupId);
      const checked = check ? { ...check, model: check.model ? { ...check.model,
        predictorVariables: check.model.predictorVariables.map(variable => ({ ...variable,
          name: variables.find(predictor => predictor.id === variable.id)?.name ?? variable.name })) } : undefined } : undefined;
      sections.push({ id: `${id}-model`, kind: 'group-model', heading: `${name} — Model details`, result, checked });
    }
    if (settings.groupAnnualResults && (settings.groupAnnualResultsTable || settings.groupAnnualResultsGraphs)) {
      sections.push({ id: `${id}-annual`, kind: 'group-annual', heading: `${name} — Annual results`, result });
    }
    const periods = monthlyReportPeriods(result.monthlyAnalysisSummaryData, settings, analysis.baselineYear, reportYear, result.group);
    if (settings.groupMonthlyResults && (periods.length || settings.groupMonthlyResultsGraphs)) {
      sections.push({ id: `${id}-monthly`, kind: 'group-monthly', heading: `${name} — Monthly results`, result, periods });
    }
  }
  return sections;
}
export function monthlyReportPeriods(rows: readonly MonthlyAnalysisSummaryData[], settings: AnalysisReportSettings,
  baselineYear: number, reportYear: number, group?: AnalysisGroup) {
  const enabled = group ? settings.groupMonthlyResultsTable : settings.facilityMonthlyResultsTable;
  if (!enabled) return [];
  const requested = [
    { year: baselineYear, label: 'Baseline year', enabled: group ? settings.groupMonthlyResultsTableBaselineYear : settings.facilityMonthlyResultsTableBaselineYear },
    { year: reportYear, label: 'Report year', enabled: group ? settings.groupMonthlyResultsTableReportYear : settings.facilityMonthlyResultsTableReportYear },
    { year: group?.regressionModelYear, label: 'Model year', enabled: !!group && group.analysisType === 'regression' && settings.groupMonthlyResultsTableModelYear }
  ];
  const years = [...new Set(requested.filter(item => item.enabled && Number.isInteger(item.year)).map(item => item.year!))];
  return years.map(year => ({ year, baseline: year === baselineYear,
    label: requested.filter(item => item.enabled && item.year === year).map(item => item.label).join(' / ') + ` — ${year}`,
    rows: rows.filter(row => row.fiscalYear === year) }));
}
// Preserve the report's stricter transition display without changing the Analysis workbench.
const REPORT_TRANSITION_UNAVAILABLE = new Set<ColumnKey>(['annualSavingsPercentImprovement', 'newSavings']);
export function analysisReportTable(annual: readonly AnnualAnalysisSummary[], monthly: readonly MonthlyAnalysisSummaryData[], columns: AnalysisTableColumns,
  period: 'annual' | 'monthly', unit: string, facility: IdbFacility, banking: boolean, group?: AnalysisGroup,
  groups: readonly FacilityAnalysisGroupCalculationResult[] = [], baseline = false) {
  const options = COLUMN_OPTIONS.map(option => ({ ...analysisResultColumn(option.key), ...option }))
    .filter(option => columns[option.key] && (!option.period || option.period === period)
    && (option.key !== 'modeledEnergy' || !!group) && (!option.banking || banking)
    && (!baseline || option.section === 'use'));
  const use = options.filter(option => option.section === 'use');
  const improvement = options.filter(option => option.section === 'improvement');
  const predictorSelections = new Map(columns.predictors.map(item => [item.predictor.id, item.display]));
  const predictorVariables = group?.predictorVariables ?? groups.flatMap(item => item.group.predictorVariables ?? []);
  const available = new Map(predictorVariables.map(variable => [variable.id, variable]));
  // Empty legacy predictor selections mean the report's production-variable default, never a write.
  const predictors = columns.productionVariables ? [...available.values()].filter(variable => predictorSelections.get(variable.id) ?? !!variable.productionInAnalysis) : [];
  const headers = [
    ...use.map(option => ({ id: option.key, label: option.label, section: 'use' as const, percent: false })),
    ...predictors.map(variable => ({ id: 'predictor:' + variable.id, label: variable.name, unit: variable.unit, section: 'predictors' as const, percent: false })),
    ...improvement.map(option => ({ id: option.key, label: option.label, section: 'improvement' as const,
      unit: option.percent ? '%' : option.key === 'SEnPI' ? '' : unit, percent: !!option.percent }))
  ];
  const source = period === 'annual' ? annual : monthly;
  const rows = source.map((row, index) => {
    const annualRow = row as AnnualAnalysisSummary, monthlyRow = row as MonthlyAnalysisSummaryData;
    const markers = orderedUniqueResultMarkers(group ? period === 'annual' ? annualResultMarkers(annualRow, group, facility) : monthlyResultMarkers(monthlyRow, group)
      : groups.flatMap(item => period === 'annual' ? item.annualAnalysisSummaryData.filter(candidate => candidate.year === annualRow.year).flatMap(candidate => annualResultMarkers(candidate, item.group, facility))
        : item.monthlyAnalysisSummaryData.filter(candidate => new Date(candidate.date).getTime() === new Date(monthlyRow.date).getTime()).flatMap(candidate => monthlyResultMarkers(candidate, item.group))));
    return { key: period === 'annual' ? String(annualRow.year) : new Date(monthlyRow.date).toISOString(),
      label: period === 'annual' ? `${facility.fiscalYear === 'nonCalendarYear' ? 'FY ' : ''}${annualRow.year}`
        : new Date(monthlyRow.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), markers,
      missing: period === 'annual' ? annualRow.missingPredictorValue : monthlyRow.missingValueWarning,
      fiscalYearEnd: period === 'monthly' && (monthly[index + 1]?.fiscalYear !== monthlyRow.fiscalYear),
      cells: [
        ...use.map(column => ({ ...analysisResultCell(row, column, !!row.isIntermediateBanked,
          column.hideDuringTransition || REPORT_TRANSITION_UNAVAILABLE.has(column.id)), percent: false, missing: false })),
        ...predictors.map(variable => ({ value: finiteAnalysisResultValue(row.predictorUsage?.find(item => item.predictorId === variable.id)?.usage),
          percent: false, missing: (row.missingPredictors ?? []).includes(variable.id) })),
        ...improvement.map(column => ({ ...analysisResultCell(row, column, !!row.isIntermediateBanked,
          column.hideDuringTransition || REPORT_TRANSITION_UNAVAILABLE.has(column.id)), percent: !!column.percent, missing: false }))
      ] };
  });
  return { headers, rows, markers: orderedUniqueResultMarkers(rows.flatMap(row => row.markers)), missing: rows.some(row => row.missing) };
}
