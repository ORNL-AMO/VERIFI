import { firstValueFrom } from 'rxjs';
import { buildAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { calculateAnalysisDataChecks } from '@domain/reports/analysis-data-checks';
import { calculateBetterPlantsReport } from '@domain/reports/better-plants-report-calculation';
import { analysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { AnalysisReportWorkerRequest, AnalysisReportWorkerResponse } from './analysis-report-worker.contract';
import { runWorker } from './run-worker';
import { calculateModelingReport } from '@domain/reports/modeling-report-calculation';
import { buildFacilityAnalysisReportInputs } from '@domain/reports/analysis-report-inputs';
import { regressionAnalysisReportFixture } from '@domain/reports/testing/analysis-report-fixtures';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';

describe('analysis report Worker', () => {
  it('round-trips detached modeling charts with the same values as synchronous execution', async () => {
    const snapshot = regressionAnalysisReportFixture(), inputs = buildFacilityAnalysisReportInputs(snapshot, 'facility', 'facility-analysis');
    const chartMeters = getCalanderizedMeterData([...snapshot.meters], [...snapshot.meterData], snapshot.facilities[0], false,
      { energyIsSource: inputs.analysis.energyIsSource, neededUnits: inputs.analysis.energyUnit }, [], [],
      [...snapshot.facilities], snapshot.account.assessmentReportVersion, []), worker = await createWorker();
    expect(await run(worker, { operation: 'modeling', inputs, years: [2023], chartMeters })).toEqual({
      ok: true, operation: 'modeling', value: [calculateModelingReport(inputs, 2023, chartMeters)]
    });
  });
  it.each(['checks', 'better-plants'] as const)('round-trips %s with the same values as synchronous execution', async operation => {
    const inputs = buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis');
    const request: AnalysisReportWorkerRequest = { operation, inputs, years: [2023] };
    const worker = await createWorker();
    const response = await run(worker, request);
    expect(response).toEqual({ ok: true, operation, value: operation === 'checks' ? [calculateAnalysisDataChecks(inputs, 2023)] : calculateBetterPlantsReport(inputs, [2023]) });
  });
  it('returns an actionable calculation failure', async () => {
    const inputs = buildAnalysisReportInputs(analysisReportFixture(), 'account-analysis');
    const worker = await createWorker();
    const response = await run(worker, { operation: 'better-plants', inputs, years: [1900] });
    expect(response.ok).toBe(false);
    if (response.ok === false) expect(response.message.length).toBeGreaterThan(0);
  });
});

async function createWorker(): Promise<Worker> {
  const url = new URL('./analysis-report.worker', import.meta.url);
  const response = await fetch(url);
  expect(response.ok, `${response.status} ${url}`).toBe(true);
  return new Worker(url, { type: 'module' });
}
async function run(worker: Worker, request: AnalysisReportWorkerRequest) {
  try { return await firstValueFrom(runWorker<AnalysisReportWorkerResponse>(worker, request)); }
  catch (error) {
    if (error instanceof ErrorEvent) throw new Error(`${error.message} (${error.filename}:${error.lineno}:${error.colno})`);
    throw error;
  }
}
