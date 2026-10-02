import { normalizeFacilityAnalysisWorkerResponse } from './facility-analysis-results.service';

describe('FacilityAnalysisResultsService projection', () => {
  it('publishes a complete Worker result without rounding or reshaping values', () => {
    const annual = [{ year: 2025, savings: 12.3456789 }] as any;
    const monthly = [{ year: 2025, month: 0, savings: 1.23456789 }] as any;
    const groups = [{ group: { idbGroupId: 'group-a' }, annualAnalysisSummaryData: annual, monthlyAnalysisSummaryData: monthly }] as any;
    expect(normalizeFacilityAnalysisWorkerResponse({
      ok: true,
      value: { itemId: 'analysis-a', annualAnalysisSummaries: annual,
        monthlyAnalysisSummaryData: monthly, groupSummaries: groups, reportYear: 2025 }
    }, 'analysis-a', 'fingerprint-a')).toEqual({
      state: 'ready', analysisGuid: 'analysis-a', fingerprint: 'fingerprint-a',
      annual, monthly, groups, reportYear: 2025
    });
  });

  it('rejects stale and incomplete Worker responses', () => {
    expect(normalizeFacilityAnalysisWorkerResponse({
      ok: true,
      value: { itemId: 'other', annualAnalysisSummaries: [], monthlyAnalysisSummaryData: [], groupSummaries: [] }
    }, 'analysis-a', 'fingerprint-a')).toMatchObject({ state: 'error', analysisGuid: 'analysis-a', fingerprint: 'fingerprint-a' });
    expect(normalizeFacilityAnalysisWorkerResponse({ ok: false, message: 'failed' }, 'analysis-a', 'fingerprint-a'))
      .toMatchObject({ state: 'error', message: 'failed' });
  });
});
