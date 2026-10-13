import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { calculateAccountAnalysisResults } from '@domain/calculations/analysis-calculations/account-analysis-results-calculation';
import { firstValueFrom } from 'rxjs';
import { AccountAnalysisResultsWorkerRequest, AccountAnalysisResultsWorkerResponse } from './account-analysis-results-worker.contract';
import { runWorker } from './run-worker';

describe('account analysis workbench results Worker', () => {
  it('round-trips the complete monthly request and matches synchronous calculation', async () => {
    const account = getNewIdbAccount();
    account.guid = 'account-a';
    account.sustainabilityQuestions.energyReductionBaselineYear = 2022;
    const analysis = getNewIdbAccountAnalysisItem('energy', account, []);
    analysis.guid = 'analysis-a';
    const request: AccountAnalysisResultsWorkerRequest = {
      accountAnalysisItem: analysis, account, accountFacilities: [], accountPredictorEntries: [],
      allAccountAnalysisItems: [], calculateAllMonthlyData: true, meters: [], meterData: [],
      accountPredictors: [], reportYear: 2022
    };
    const workerUrl = new URL('./account-analysis-workbench-results.worker', import.meta.url);
    const workerResponse = await fetch(workerUrl);
    expect(workerResponse.ok, `${workerResponse.status} ${workerUrl}`).toBe(true);
    const worker = new Worker(workerUrl, { type: 'module' });
    let response: AccountAnalysisResultsWorkerResponse;
    try {
      response = await firstValueFrom(runWorker<AccountAnalysisResultsWorkerResponse>(worker, request));
    } catch (error) {
      if (error instanceof ErrorEvent) throw new Error(`${error.message} (${error.filename}:${error.lineno}:${error.colno})`);
      throw error;
    }
    expect(response).toEqual({ ok: true, value: calculateAccountAnalysisResults(request) });
    expect(response.ok && response.value.facilitySummaries).toEqual([]);
  });
});
