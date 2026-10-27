import { analysisReviewFingerprint } from '@platform/reports/analysis-review-fingerprint';
import { Injectable } from '@angular/core';
import { Observable, defer, of, timeout } from 'rxjs';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { calculateBetterPlantsReport } from '@domain/reports/better-plants-report-calculation';
import { AnalysisReportWorkerRequest, AnalysisReportWorkerResponse } from '@platform/web-workers/analysis-report-worker.contract';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';

@Injectable({ providedIn: 'root' })
export class AnalysisReportCalculationService {
  fingerprint(content: string): Promise<string> { return analysisReviewFingerprint(content); }
  execute(request: AnalysisReportWorkerRequest): Observable<AnalysisReportWorkerResponse> {
    return defer(() => {
      if (typeof Worker !== 'undefined') return runWorker<AnalysisReportWorkerResponse>(
        new Worker(new URL('../../../platform/web-workers/analysis-report.worker', import.meta.url)), request);
      return of<AnalysisReportWorkerResponse>(request.operation === 'checks'
        ? { ok: true, operation: 'checks', value: request.years.map(year => calculateAnalysisDataChecks(request.inputs, year)) }
        : { ok: true, operation: 'better-plants', value: calculateBetterPlantsReport(request.inputs, request.years) });
    }).pipe(timeout(CALCULATION_WORKER_TIMEOUT_MS));
  }
}
