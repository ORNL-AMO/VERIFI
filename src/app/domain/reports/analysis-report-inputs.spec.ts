import { assertAnalysisReportYears, buildAnalysisReportInputs, reportYears } from './analysis-report-inputs';
import { calculateAnalysisDataChecks } from './analysis-data-checks';
import { calculateBetterPlantsReport } from './better-plants-report-calculation';
import { BetterPlantsReportClass } from '@domain/calculations/better-plants-calculations/betterPlantsReportClass';
import { analysisReportFixture } from './testing/analysis-report-fixtures';

describe('analysis report inputs and calculations', () => {
  it('keeps additional facility meters and rejects foreign or missing linked analyses', () => {
    const snapshot = analysisReportFixture();
    const additional = { ...snapshot.meters[0], guid: 'additional', groupId: 'other-group' };
    expect(buildAnalysisReportInputs({ ...snapshot, meters: [...snapshot.meters, additional] }, 'account-analysis').meters).toHaveLength(2);
    expect(() => buildAnalysisReportInputs({ ...snapshot, facilityAnalyses: [{ ...snapshot.facilityAnalyses[0], accountId: 'foreign' }] }, 'account-analysis')).toThrow('unavailable');
  });
  it('retains banking dependencies and rejects cycles or missing sources', () => {
    const snapshot = analysisReportFixture();
    const item = { ...snapshot.facilityAnalyses[0], hasBanking: true, bankedAnalysisItemId: 'source' };
    const source = { ...item, guid: 'source', hasBanking: false };
    expect(buildAnalysisReportInputs({ ...snapshot, facilityAnalyses: [item, source] }, 'account-analysis').facilityAnalyses.map(value => value.guid)).toEqual(['facility-analysis', 'source']);
    expect(() => buildAnalysisReportInputs({ ...snapshot, facilityAnalyses: [item] }, 'account-analysis')).toThrow('banked analysis');
    expect(() => buildAnalysisReportInputs({ ...snapshot, facilityAnalyses: [item, { ...source, hasBanking: true, bankedAnalysisItemId: item.guid }] }, 'account-analysis')).toThrow('cycle');
  });
  it('resolves the facility as review owner only for a current hidden pair', () => {
    const snapshot = analysisReportFixture();
    const single = { ...snapshot, account: { ...snapshot.account, isSingleFacilityCompany: true } };
    expect(buildAnalysisReportInputs(single, 'account-analysis').owner).toEqual({ scope: 'facility', facilityGuid: 'facility', analysisGuid: 'facility-analysis' });
    expect(() => buildAnalysisReportInputs({ ...single, accountAnalyses: [{ ...single.accountAnalyses[0], baselineYear: 2021 }] }, 'account-analysis')).toThrow('Refresh');
  });
  it('returns newest first, excludes baseline, and rejects invalid year ranges', () => {
    expect(reportYears(2022, 2024, true)).toEqual([2024, 2023]);
    expect(reportYears(2022, 2024, false)).toEqual([2024]);
    for (const year of [2022, 2021, NaN, Infinity, 2023.5]) expect(() => reportYears(2022, year, true)).toThrow('after');
  });
  it.each(['energy', 'water'] as const)('matches existing %s summaries with full precision and does not mutate inputs', category => {
    const inputs = buildAnalysisReportInputs(analysisReportFixture(category), 'account-analysis');
    const before = structuredClone(inputs);
    const result = calculateBetterPlantsReport(inputs, [2023]);
    const expected = new BetterPlantsReportClass(2022, 2023, inputs.analysis, [...inputs.predictorData], inputs.account,
      [...inputs.facilities], [...inputs.facilityAnalyses], [...inputs.meters], [...inputs.meterData], [...inputs.predictors]).getBetterPlantsSummary();
    expect(result).toEqual([expected]);
    expect(inputs).toEqual(before);
    expect(calculateAnalysisDataChecks(inputs, 2023)).toMatchObject({ reportYear: 2023, hasBlockingErrors: false, groups: [{ critical: [] }] });
  });
  it('reports an unselected generated model as a blocking finding without crashing', () => {
    const inputs = buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis');
    inputs.facilityAnalyses[0].groups[0].analysisType = 'regression';
    expect(calculateAnalysisDataChecks(inputs, 2023)).toMatchObject({ hasBlockingErrors: true, groups: [{ critical: ['Select an available regression model in the analysis.'] }] });
  });
  it('bounds all-year work by actual meter history before starting calculation', () => {
    const inputs = buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis');
    expect(() => assertAnalysisReportYears(inputs, [9999])).toThrow('available meter history');
    expect(() => assertAnalysisReportYears({ ...inputs, analysis: { ...inputs.analysis, baselineYear: 1800 } }, [2023])).toThrow('available meter history');
    expect(() => assertAnalysisReportYears(inputs, [2024, 2023])).not.toThrow();
  });

});
