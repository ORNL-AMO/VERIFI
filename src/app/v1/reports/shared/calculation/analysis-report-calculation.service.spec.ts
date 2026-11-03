import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { CALCULATION_WORKER_TIMEOUT_MS } from '@platform/web-workers/run-worker';
import { AnalysisReportCalculationService } from './analysis-report-calculation.service';

describe('report calculation lifecycle', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  it('terminates a timed-out facility report Worker using the same timeout contract', async () => {
    vi.useFakeTimers(); const terminate = vi.fn();
    vi.stubGlobal('Worker', class { addEventListener = vi.fn(); postMessage = vi.fn(); terminate = terminate; });
    const snapshot = analysisReportFixture();
    const promise = firstValueFrom(new AnalysisReportCalculationService().executeFacility({ analysisItem: snapshot.facilityAnalyses[0], facility: snapshot.facilities[0],
      calanderizedMeters: [], accountPredictorEntries: [], accountPredictors: [], accountAnalysisItems: snapshot.facilityAnalyses, reportYear: 2023, calculateAllMonthlyData: false, includeGroupSummaries: true }));
    const rejection = expect(promise).rejects.toThrow('Timeout');
    await vi.advanceTimersByTimeAsync(CALCULATION_WORKER_TIMEOUT_MS); await rejection; expect(terminate).toHaveBeenCalledOnce();
  });
  it('terminates a timed-out Worker and rejects the pending calculation', async () => {
    vi.useFakeTimers(); const terminate = vi.fn();
    vi.stubGlobal('Worker', class { addEventListener = vi.fn(); postMessage = vi.fn(); terminate = terminate; });
    const promise = firstValueFrom(new AnalysisReportCalculationService().execute({ operation: 'checks',
      inputs: buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis'), years: [2023] }));
    const rejection = expect(promise).rejects.toThrow('Timeout');
    await vi.advanceTimersByTimeAsync(CALCULATION_WORKER_TIMEOUT_MS); await rejection;
    expect(terminate).toHaveBeenCalledOnce();
  });
});
