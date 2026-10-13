import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { getNewAnalysisGroup, getNewIdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
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

  it('round-trips selected facility identifiers and populated monthly dates and values', async () => {
    const account = getNewIdbAccount();
    account.guid = 'account-a';
    account.energyIsSource = false;
    account.sustainabilityQuestions.energyReductionBaselineYear = 2022;
    const facility = getNewIdbFacility(account);
    facility.guid = 'facility-a';
    const facilityAnalysis = getNewIdbAnalysisItem(account, facility, [], [], 'energy');
    facilityAnalysis.guid = 'facility-analysis-a';
    const group = getNewAnalysisGroup('group-a', []);
    group.analysisType = 'absoluteEnergyConsumption';
    facilityAnalysis.groups = [group];
    const analysis = getNewIdbAccountAnalysisItem('energy', account, [facility]);
    analysis.guid = 'account-analysis-a';
    analysis.facilityAnalysisItems[0].analysisItemId = facilityAnalysis.guid;
    const meter = getNewIdbUtilityMeter(facility.guid, account.guid, true, 'MMBtu');
    meter.guid = 'meter-a';
    meter.groupId = group.idbGroupId;
    meter.meterReadingDataApplication = 'fullMonth';
    const meterData = Array.from({ length: 25 }, (_, index) => {
      const date = new Date(2022, index, 1);
      return {
        ...getNewIdbUtilityMeterData(meter, []),
        guid: `reading-${index}`, year: date.getFullYear(), month: date.getMonth() + 1, day: 1,
        totalEnergyUse: index < 12 ? 100.25 : 80.125,
        totalVolume: index < 12 ? 100.25 : 80.125, totalCost: 0
      };
    });
    const request: AccountAnalysisResultsWorkerRequest = {
      accountAnalysisItem: analysis, account, accountFacilities: [facility], accountPredictorEntries: [],
      allAccountAnalysisItems: [facilityAnalysis], calculateAllMonthlyData: true,
      meters: [meter], meterData, accountPredictors: [], reportYear: 2023
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
    expect(response.ok).toBe(true);
    if (response.ok === false) throw new Error(response.message);
    expect(response.value.facilitySummaries).toHaveLength(1);
    const summary = response.value.facilitySummaries![0];
    expect(summary).toMatchObject({ facilityGuid: facility.guid, analysisGuid: facilityAnalysis.guid });
    const january = summary.monthlySummaryData.find(row => row.date.getFullYear() === 2023 && row.date.getMonth() === 0);
    expect(january?.date).toBeInstanceOf(Date);
    expect(january).toMatchObject({ date: new Date(2023, 0, 1), energyUse: 80.125, adjusted: 100.25, savings: 20.125 });
  });
});
