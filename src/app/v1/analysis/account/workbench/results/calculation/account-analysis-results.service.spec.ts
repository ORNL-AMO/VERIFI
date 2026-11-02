import { normalizeAccountAnalysisWorkerResponse } from './account-analysis-results.service';

describe('AccountAnalysisResultsService projection', () => {
  it('publishes complete annual and monthly results without reshaping values', () => {
    const annual = [{ year: 2025, savings: 12.3456789 }] as any;
    const monthly = [{ date: new Date(2025, 0, 1), savings: 1.23456789 }] as any;
    const facilitySummaries = [{ facilityGuid: 'facility-a', analysisGuid: 'facility-analysis-a', monthlySummaryData: monthly }] as any;
    expect(normalizeAccountAnalysisWorkerResponse({
      ok: true,
      value: { itemId: 'analysis-a', annualAnalysisSummaries: annual, monthlyAnalysisSummaryData: monthly, facilitySummaries, reportYear: 2025 }
    }, 'analysis-a', 'fingerprint-a')).toEqual({
      state: 'ready', analysisGuid: 'analysis-a', fingerprint: 'fingerprint-a', annual, monthly, facilitySummaries, reportYear: 2025
    });
  });

  it('rejects stale and failed Worker responses', () => {
    expect(normalizeAccountAnalysisWorkerResponse({
      ok: true, value: { itemId: 'other', annualAnalysisSummaries: [], monthlyAnalysisSummaryData: [] }
    }, 'analysis-a', 'fingerprint-a')).toMatchObject({ state: 'error', message: 'Account analysis calculation returned a stale result.' });
    expect(normalizeAccountAnalysisWorkerResponse({ ok: false, message: 'failed' }, 'analysis-a', 'fingerprint-a'))
      .toMatchObject({ state: 'error', message: 'failed' });
  });
});
