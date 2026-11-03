import { getAnalysisReportSettings } from '@data/models/idbModels/facilityReport';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { calculateFacilityAnalysisResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import { analysisReportSections, monthlyReportPeriods, analysisReportTable } from './analysis-report.view';
import { AnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { analysisResultsTableView } from '@app/v1/shared/analysis-results/results-table/analysis-results-table.view';

export function facilityReportResults(year = 2023) {
  const snapshot = analysisReportFixture(), facility = snapshot.facilities[0], analysis = snapshot.facilityAnalyses[0];
  const meters = getCalanderizedMeterData([...snapshot.meters], [...snapshot.meterData], facility, false,
    { energyIsSource: analysis.energyIsSource, neededUnits: 'MMBtu' }, [], [], [facility], snapshot.account.assessmentReportVersion, []);
  return { snapshot, facility, analysis, results: calculateFacilityAnalysisResults({ analysisItem: analysis, facility, calanderizedMeters: meters,
    accountAnalysisItems: snapshot.facilityAnalyses, accountPredictorEntries: [], accountPredictors: [], calculateAllMonthlyData: false, includeGroupSummaries: true, reportYear: year }) };
}

describe('facility report presentation', () => {
  it('orders every enabled group section by the selected analysis and matches checked models by GUID', () => {
    const { results, analysis } = facilityReportResults(2022), settings = getAnalysisReportSettings();
    settings.reportYear = 2022;
    const first = analysis.groups[0], second = { ...first, idbGroupId: 'regression-group', analysisType: 'regression' as const,
      regressionModelYear: 2022, predictorVariables: [{ ...first.predictorVariables[0], id: 'predictor-guid', name: 'Current production' }] };
    const selected = { ...analysis, groups: [first, second] };
    const output = { ...results, groupSummaries: [{ ...results.groupSummaries[0], group: second }, results.groupSummaries[0],
      { ...results.groupSummaries[0], group: { ...first, idbGroupId: 'unselected-dependency' } }] };
    const checks = [{ reportYear: 2022, hasBlockingErrors: false, groups: [{ group: second,
      model: { predictorVariables: [{ id: 'predictor-guid', name: 'Old production' }] } }] }] as unknown as AnalysisDataChecks[];
    const sections = analysisReportSections(settings, selected, output, checks, { [first.idbGroupId]: 'Group A', 'regression-group': 'Group B' });
    expect(sections.map(section => section.kind)).toEqual(['facility-annual', 'facility-monthly', 'group-annual', 'group-monthly', 'group-model', 'group-annual', 'group-monthly']);
    expect(sections.map(section => section.heading)).toEqual(['Annual facility analysis', 'Monthly facility analysis', 'Group A — Annual results',
      'Group A — Monthly results', 'Group B — Model details', 'Group B — Annual results', 'Group B — Monthly results']);
    const model = sections.find(section => section.kind === 'group-model');
    expect(model?.checked?.model?.predictorVariables[0].name).toBe('Current production');
    const monthly = sections.filter(section => section.kind === 'group-monthly').find(section => section.result.group.idbGroupId === second.idbGroupId);
    expect(monthly?.periods).toHaveLength(1);
    expect(monthly?.periods[0].label).toBe('Baseline year / Report year / Model year — 2022');
    expect(checks[0].groups[0].model.predictorVariables[0].name).toBe('Old production');
    settings.groupModelDetails = false; settings.groupAnnualResultsTable = false; settings.groupAnnualResultsGraphs = false;
    settings.groupMonthlyResultsTable = false; settings.groupMonthlyResultsGraphs = false;
    expect(analysisReportSections(settings, selected, output, checks, {}).map(section => section.kind)).toEqual(['facility-annual', 'facility-monthly']);
  });
  it('retains facility and group results through the selected year at full precision', () => {
    const { results } = facilityReportResults();
    expect(results.reportYear).toBe(2023); expect(results.annualAnalysisSummaries.map(row => row.year)).toEqual([2022, 2023]);
    expect(results.annualAnalysisSummaries[0].energyUse).toBe(1203);
    expect(results.annualAnalysisSummaries[1].energyUse).toBe(961.5);
    expect(results.annualAnalysisSummaries[1].savings).toBe(241.5);
    expect(results.groupSummaries[0].annualAnalysisSummaryData[1].savings).toBe(241.5);
  });
  it('honors master switches and deduplicates coincident baseline, report and model periods', () => {
    const settings = getAnalysisReportSettings(), { results, analysis } = facilityReportResults(2022);
    const group = { ...results.groupSummaries[0].group, analysisType: 'regression' as const, regressionModelYear: 2022 };
    const periods = monthlyReportPeriods(results.monthlyAnalysisSummaryData, settings, 2022, 2022, group);
    expect(periods).toHaveLength(1); expect(periods[0].label).toBe('Baseline year / Report year / Model year — 2022');
    expect(periods[0].rows).toHaveLength(12);
    settings.groupMonthlyResultsTable = false;
    expect(monthlyReportPeriods(results.monthlyAnalysisSummaryData, settings, 2022, 2022, group)).toEqual([]);
    settings.facilityAnnualResults = false; settings.facilityMonthlyResults = false; settings.groupReports = false;
    expect(analysisReportSections(settings, analysis, results, [], {})).toEqual([]);
  });
  it('places enabled group contributions after facility monthly results and before individual group sections', () => {
    const settings = getAnalysisReportSettings(), { results, analysis } = facilityReportResults();
    Object.assign(settings, { facilityGroupContributions: true, facilityGroupContributionsTable: true, facilityGroupContributionsGraphs: true });
    const sections = analysisReportSections(settings, analysis, results, [], {});
    expect(sections.map(section => section.kind)).toEqual([
      'facility-annual', 'facility-monthly', 'facility-group-contributions', 'group-annual', 'group-monthly'
    ]);
    expect(sections.find(section => section.kind === 'facility-group-contributions')).toMatchObject({
      id: 'facility-group-contributions', heading: 'Group contributions'
    });
  });
  it.each([[true, false], [false, true], [true, true], [false, false]] as const)(
    'includes group contributions independently of individual group reports (table: %s, chart: %s)', (table, chart) => {
      const settings = getAnalysisReportSettings(), { results, analysis } = facilityReportResults();
      Object.assign(settings, { facilityAnnualResults: false, facilityMonthlyResults: false, groupReports: false,
        facilityGroupContributions: true, facilityGroupContributionsTable: table, facilityGroupContributionsGraphs: chart });
      const sections = analysisReportSections(settings, analysis, results, [], {});
      expect(sections.map(section => section.kind)).toEqual(table || chart ? ['facility-group-contributions'] : []);
      settings.facilityGroupContributions = false;
      expect(analysisReportSections(settings, analysis, results, [], {})).toEqual([]);
    });
  it('projects available columns, missing values, zeroes and banking transition markers', () => {
    const { results, facility } = facilityReportResults(); const columns = getAnalysisReportSettings().analysisTableColumns;
    columns.savings = true; columns.bankedSavings = true;
    const row = { ...results.groupSummaries[0].annualAnalysisSummaryData[1], energyUse: 0, isIntermediateBanked: true };
    const table = analysisReportTable([row], [], columns, 'annual', 'MMBtu', facility, true, results.groupSummaries[0].group);
    expect(table.rows[0].markers).toContain('transition');
    expect(table.rows[0].cells[table.headers.findIndex(item => item.id === 'actualEnergy')].value).toBe(0);
    expect(table.rows[0].cells[table.headers.findIndex(item => item.id === 'savings')].value).toBeNull();
    expect(analysisReportTable([row], [], columns, 'annual', 'MMBtu', facility, false).headers.some(item => item.id === 'bankedSavings')).toBe(false);
  });

  it('shares field mappings and percent metadata with Analysis without rounding results', () => {
    const { results, facility } = facilityReportResults(), columns = getAnalysisReportSettings().analysisTableColumns;
    Object.assign(columns, { productionVariables: false, baselineAdjustmentForOther: true, bankedSavings: true,
      annualSavingsPercentImprovement: true, totalSavingsPercentImprovement: true });
    const row = { ...results.annualAnalysisSummaries[1], energyUse: 0, baselineAdjustmentForOtherV2: 1.23456789,
      savingsBanked: 2.34567891, annualSavingsPercentImprovement: 3.45678912 };
    const report = analysisReportTable([row], [], columns, 'annual', 'MMBtu', facility, true);
    const analysis = analysisResultsTableView([{ row, markers: [] }], columns, [], 'annual', true);
    const cells = (table: typeof analysis) => Object.fromEntries(table.headers.map((header, index) =>
      [header.id, { value: table.rows[0].cells[index].value, percent: !!table.rows[0].cells[index].percent }]));
    expect(cells(report)).toEqual(cells(analysis));
    expect(cells(report)['baselineAdjustmentForOther'].value).toBe(1.23456789);
    expect(cells(report)['bankedSavings'].value).toBe(2.34567891);
    expect(cells(report)['annualSavingsPercentImprovement']).toEqual({ value: 3.45678912, percent: true });
  });

  it('preserves report-specific transition masking and its aggregate-marker policy', () => {
    const { results, facility } = facilityReportResults(), columns = getAnalysisReportSettings().analysisTableColumns;
    Object.assign(columns, { productionVariables: false, adjusted: true, newSavings: true, annualSavingsPercentImprovement: true });
    const source = results.groupSummaries[0], row = { ...source.annualAnalysisSummaryData[1], isIntermediateBanked: true,
      adjusted: 123, newSavings: 9, annualSavingsPercentImprovement: 3 };
    const direct = analysisReportTable([row], [], columns, 'annual', 'MMBtu', facility, true, source.group);
    const analysis = analysisResultsTableView([{ row, markers: ['transition'] }], columns, [], 'annual', true);
    const value = (table: typeof analysis, id: string) => table.rows[0].cells[table.headers.findIndex(header => header.id === id)].value;
    expect(value(direct, 'adjusted')).toBeNull();
    expect(value(direct, 'newSavings')).toBeNull();
    expect(value(direct, 'annualSavingsPercentImprovement')).toBeNull();
    expect(value(analysis, 'newSavings')).toBe(9);
    expect(value(analysis, 'annualSavingsPercentImprovement')).toBe(3);
    const aggregate = analysisReportTable([{ ...row, isIntermediateBanked: false }], [], columns, 'annual', 'MMBtu', facility, true,
      undefined, [{ ...source, annualAnalysisSummaryData: [row] }]);
    expect(aggregate.rows[0].markers).toContain('transition');
    expect(value(aggregate, 'adjusted')).toBe(123);
    expect(value(aggregate, 'newSavings')).toBe(9);
  });

  it('retains baseline consumption filtering, saved predictor visibility and fiscal labels', () => {
    const { results, facility } = facilityReportResults(), columns = getAnalysisReportSettings().analysisTableColumns;
    const predictor = { id: 'production', name: 'Production', unit: 'units', production: true,
      productionInAnalysis: true, regressionCoefficient: 1 };
    const hidden = { ...predictor, id: 'hidden' };
    columns.predictors = [{ predictor, display: true, usedInAnalysis: true }, { predictor: hidden, display: false, usedInAnalysis: true }];
    Object.assign(columns, { productionVariables: true, savings: true });
    const source = results.groupSummaries[0], group = { ...source.group, predictorVariables: [predictor, hidden] };
    const row = { ...source.monthlyAnalysisSummaryData[0], predictorUsage: [{ predictorId: predictor.id, usage: 0 }],
      missingPredictors: [predictor.id] };
    const table = analysisReportTable([], [row], columns, 'monthly', 'MMBtu', facility, true, group, [], true);
    expect(table.headers.some(header => header.section === 'improvement' || header.id === 'fiscalYear' || header.id === 'predictor:hidden')).toBe(false);
    expect(table.rows[0].cells[table.headers.findIndex(header => header.id === 'predictor:production')]).toMatchObject({ value: 0, missing: true });
    const annual = analysisReportTable([source.annualAnalysisSummaryData[0]], [], columns, 'annual', 'MMBtu',
      { ...facility, fiscalYear: 'nonCalendarYear' }, true, group);
    expect(annual.rows[0].label).toBe(`FY ${source.annualAnalysisSummaryData[0].year}`);
  });
});
