import { normalizeFacilityAnalysisGroupWorkerResponse } from './facility-analysis-group-results.service';

describe('FacilityAnalysisGroupResultsService projection', () => {
  it('publishes group values without rounding or reshaping', () => {
    const annual = [{ year: 2025, savings: 12.3456789 }] as any;
    const monthly = [{ date: new Date(2025, 0, 1), savings: 1.23456789 }] as any;
    const group = { idbGroupId: 'group-a' } as any;

    expect(normalizeFacilityAnalysisGroupWorkerResponse({
      ok: true,
      value: {
        itemId: 'analysis-a', groupGuid: 'group-a', group,
        annualAnalysisSummaryData: annual, monthlyAnalysisSummaryData: monthly, reportYear: 2025
      }
    }, 'analysis-a', 'group-a', 'fingerprint-a')).toEqual({
      state: 'ready', analysisGuid: 'analysis-a', groupGuid: 'group-a', fingerprint: 'fingerprint-a',
      group, annual, monthly, reportYear: 2025
    });
  });

  it('rejects failed and stale Worker responses', () => {
    expect(normalizeFacilityAnalysisGroupWorkerResponse({ ok: false, message: 'failed' },
      'analysis-a', 'group-a', 'fingerprint-a')).toMatchObject({ state: 'error', message: 'failed' });
    expect(normalizeFacilityAnalysisGroupWorkerResponse({
      ok: true,
      value: {
        itemId: 'analysis-a', groupGuid: 'group-b', group: { idbGroupId: 'group-b' } as any,
        annualAnalysisSummaryData: [], monthlyAnalysisSummaryData: []
      }
    }, 'analysis-a', 'group-a', 'fingerprint-a')).toMatchObject({
      state: 'error', message: 'Analysis group calculation returned a stale result.'
    });
  });
});
