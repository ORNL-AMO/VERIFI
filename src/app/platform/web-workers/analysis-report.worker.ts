/// <reference lib="webworker" />
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { calculateBetterPlantsReport } from '@domain/reports/better-plants-report-calculation';
import { assertAnalysisReportYears } from '@domain/reports/analysis-report-inputs';
import { AnalysisReportWorkerRequest, AnalysisReportWorkerResponse } from './analysis-report-worker.contract';

addEventListener('message', ({ data }: MessageEvent<AnalysisReportWorkerRequest>) => {
  let response: AnalysisReportWorkerResponse;
  try {
    assertAnalysisReportYears(data.inputs, data.years);
    response = data.operation === 'checks'
      ? { ok: true, operation: 'checks', value: data.years.map(year => calculateAnalysisDataChecks(data.inputs, year)) }
      : { ok: true, operation: 'better-plants', value: calculateBetterPlantsReport(data.inputs, data.years) };
  } catch (error) {
    response = { ok: false, message: error instanceof Error ? error.message : 'The report calculation failed.' };
  }
  postMessage(response);
});
