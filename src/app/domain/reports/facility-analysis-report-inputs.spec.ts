import { analysisReportFixture } from './testing/analysis-report-fixtures';
import { buildAnalysisReportInputs, buildFacilityAnalysisReportInputs, assertAnalysisReportYears } from './analysis-report-inputs';
import { analysisReviewContent } from './analysis-review-inputs';
import { calculateAnalysisDataChecks } from './analysis-data-checks';

function fixture(category: 'energy' | 'water' = 'energy') {
  const snapshot = analysisReportFixture(category);
  return { ...snapshot, account: { ...snapshot.account }, accountAnalyses: [...snapshot.accountAnalyses], facilityAnalyses: snapshot.facilityAnalyses.map(item => ({ ...item })) };
}

describe('direct facility report inputs', () => {
  it.each([['energy', false], ['energy', true], ['water', false]] as const)('supports %s with source energy %s without account pairs or input mutation', (category, source) => {
    const snapshot = fixture(category); snapshot.accountAnalyses = [];
    snapshot.facilityAnalyses[0].energyIsSource = source;
    const before = structuredClone(snapshot), inputs = buildFacilityAnalysisReportInputs(snapshot, 'facility', 'facility-analysis');
    expect(inputs.kind).toBe('facility'); expect(inputs.owner).toEqual({ scope: 'facility', facilityGuid: 'facility', analysisGuid: 'facility-analysis' });
    expect(inputs.analysis.energyIsSource).toBe(source);
    expect(calculateAnalysisDataChecks(inputs, 2022).hasBlockingErrors).toBe(false);
    expect(snapshot).toEqual(before);
    inputs.analysis.name = 'Detached'; expect(snapshot.facilityAnalyses[0].name).not.toBe('Detached');
  });
  it('allows baseline-only periods without changing the account-report period rule', () => {
    const snapshot = analysisReportFixture(), facility = buildFacilityAnalysisReportInputs(snapshot, 'facility', 'facility-analysis');
    expect(() => assertAnalysisReportYears(facility, [2022])).not.toThrow();
    for (const year of [2021, 2022.5, NaN, 3000]) expect(() => assertAnalysisReportYears(facility, [year])).toThrow();
    expect(() => assertAnalysisReportYears(buildAnalysisReportInputs(snapshot, 'account-analysis'), [2022])).toThrow();
  });
  it('matches the existing single-facility receipt content exactly', () => {
    const snapshot = fixture(); snapshot.account.isSingleFacilityCompany = true;
    expect(analysisReviewContent(buildFacilityAnalysisReportInputs(snapshot, 'facility', 'facility-analysis'), 2023))
      .toBe(analysisReviewContent(buildAnalysisReportInputs(snapshot, 'account-analysis'), 2023));
  });
  it('rejects foreign references, missing sources and dependency cycles', () => {
    const snapshot = fixture();
    expect(() => buildFacilityAnalysisReportInputs(snapshot, 'other', 'facility-analysis')).toThrow('available analysis');
    snapshot.facilityAnalyses[0].accountId = 'foreign';
    expect(() => buildFacilityAnalysisReportInputs(snapshot, 'facility', 'facility-analysis')).toThrow('available analysis');
    snapshot.facilityAnalyses[0].accountId = 'account'; snapshot.facilityAnalyses[0].hasBanking = true;
    expect(() => buildFacilityAnalysisReportInputs(snapshot, 'facility', 'facility-analysis')).toThrow('banked analysis');
    snapshot.facilityAnalyses[0].bankedAnalysisItemId = 'source';
    snapshot.facilityAnalyses.push({ ...snapshot.facilityAnalyses[0], guid: 'source', bankedAnalysisItemId: 'facility-analysis' });
    expect(() => buildFacilityAnalysisReportInputs(snapshot, 'facility', 'facility-analysis')).toThrow('cycle');
    snapshot.facilityAnalyses[1].hasBanking = false;
    expect(buildFacilityAnalysisReportInputs(snapshot, 'facility', 'facility-analysis').facilityAnalyses.map(item => item.guid)).toEqual(['facility-analysis', 'source']);
  });
});
