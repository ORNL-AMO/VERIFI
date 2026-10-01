import { normalizeFacilityAnalysisWorkerResponse } from './facility-analysis-results.service';

describe('FacilityAnalysisResultsService projection', () => {
  it('publishes a complete Worker result without rounding or reshaping values', () => {
    const annual = [{ year: 2025, savings: 12.3456789 }] as any;
    const monthly = [{ year: 2025, month: 0, savings: 1.23456789 }] as any;
    const groups = [{ group: { idbGroupId: 'group-a' }, annualAnalysisSummaryData: annual, monthlyAnalysisSummaryData: monthly }] as any;
    expect(normalizeFacilityAnalysisWorkerResponse({
      itemId: 'analysis-a', annualAnalysisSummaries: annual,
      monthlyAnalysisSummaryData: monthly, groupSummaries: groups, reportYear: 2025, error: false
    }, 'analysis-a', 4)).toEqual({
      state: 'ready', analysisGuid: 'analysis-a', revision: 4,
      annual, monthly, groups, reportYear: 2025
    });
  });

  it('rejects stale and incomplete Worker responses', () => {
    expect(normalizeFacilityAnalysisWorkerResponse({
      itemId: 'other', annualAnalysisSummaries: [], monthlyAnalysisSummaryData: [], groupSummaries: [], error: false
    }, 'analysis-a', 5)).toMatchObject({ state: 'error', analysisGuid: 'analysis-a', revision: 5 });
    expect(normalizeFacilityAnalysisWorkerResponse({ error: true }, 'analysis-a', 5)).toMatchObject({ state: 'error' });
  });
});
