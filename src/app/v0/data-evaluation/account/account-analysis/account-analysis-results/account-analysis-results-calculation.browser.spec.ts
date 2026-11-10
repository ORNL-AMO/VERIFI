import { firstValueFrom, timeout } from 'rxjs';
import { getNewAnalysisGroup } from '@data/models/idbModels/analysisItem';
import { AnnualAccountAnalysisSummaryClass } from '@domain/calculations/analysis-calculations/annualAccountAnalysisSummaryClass';
import { MonthlyAnalysisSummaryClass } from '@domain/calculations/analysis-calculations/monthlyAnalysisSummaryClass';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { runWorker } from '@platform/web-workers/run-worker';
import { AccountAnalysisResultsRequest, AccountAnalysisResultsResponse } from './account-analysis-results-calculation';

function calculationFixture(): AccountAnalysisResultsRequest {
  const group = {
    ...getNewAnalysisGroup('group-a', [{ id: 'predictor-a', name: 'Production', unit: 'tons', production: true, productionInAnalysis: true, regressionCoefficient: 2 }]),
    isGeneratedModel: false, regressionConstant: 0, regressionStartYear: 2024, regressionModelStartMonth: 0,
    regressionEndYear: 2024, regressionModelEndMonth: 11
  };
  const account = { guid: 'account-a', energyUnit: 'MMBtu', energyIsSource: false, fiscalYear: 'calendarYear', fiscalYearMonth: 0, fiscalYearCalendarEnd: true, assessmentReportVersion: 'AR6' };
  const facility = { ...account, guid: 'facility-a', accountId: 'account-a' };
  const analysis = { guid: 'analysis-a', accountId: 'account-a', facilityId: 'facility-a', analysisCategory: 'energy', energyUnit: 'MMBtu', energyIsSource: false, baselineYear: 2024, groups: [group], hasBanking: false };
  const readings = Array.from({ length: 24 }, (_, index) => ({
    guid: 'reading-' + index, accountId: 'account-a', facilityId: 'facility-a', meterId: 'meter-a',
    day: 1, month: index % 12, year: 2024 + Math.floor(index / 12), totalEnergyUse: 100, totalCost: 25,
    checked: false, migratedDates: true, isEstimated: false
  }));
  const predictors = readings.map((reading, index) => ({
    guid: 'predictor-data-' + index, accountId: 'account-a', facilityId: 'facility-a', predictorId: 'predictor-a',
    year: reading.year, month: reading.month, day: 1, amount: 10
  }));
  return {
    accountAnalysisItem: { guid: 'account-analysis-a', accountId: 'account-a', analysisCategory: 'energy', energyUnit: 'MMBtu', energyIsSource: false, baselineYear: 2024,
      facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: 'analysis-a' }], hasBanking: false },
    account, accountFacilities: [facility], accountPredictorEntries: predictors, allAccountAnalysisItems: [analysis],
    calculateAllMonthlyData: false,
    meters: [{ guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a', groupId: 'group-a', name: 'Gas Meter',
      source: 'Natural Gas', startingUnit: 'MMBtu', energyUnit: 'MMBtu', meterReadingDataApplication: 'fullMonth',
      includeInEnergy: true, siteToSource: 1, scope: 1, retainRECs: false, recsMultiplier: 0, greenPurchaseFraction: 0,
      marketGHGMultiplier: 1, locationGHGMultiplier: 1 }],
    meterData: readings,
    accountPredictors: [{ guid: 'predictor-a', facilityId: 'facility-a', accountId: 'account-a', name: 'Production', unit: 'tons', production: true }]
  } as unknown as AccountAnalysisResultsRequest;
}

async function runProductionWorker<T>(createWorker: () => Worker, request: unknown): Promise<T> {
  const worker = createWorker();
  const terminate = vi.spyOn(worker, 'terminate');
  try {
    const result = await firstValueFrom(runWorker<T>(worker, request).pipe(timeout(10_000)));
    expect(terminate).toHaveBeenCalledOnce();
    return result;
  } finally { if (!terminate.mock.calls.length) worker.terminate(); }
}

describe('Legacy analysis Worker requests in Chromium', () => {
  beforeEach(() => {
    const NativeWorker = globalThis.Worker;
    class EmittedAssetWorker extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        // Angular emits Workers at the bundle root; Vitest rebases import.meta.url to the source directory.
        const emittedAsset = new URL(new URL(String(url)).pathname.split('/').pop()!, location.origin + '/');
        super(emittedAsset, options);
      }
    }
    vi.stubGlobal('Worker', EmittedAssetWorker);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('retains account annual/monthly/facility output parity with the deterministic fallback', async () => {
    const request = calculationFixture();
    const fallback = new AnnualAccountAnalysisSummaryClass(
      request.accountAnalysisItem, request.account, request.accountFacilities, request.accountPredictorEntries,
      request.allAccountAnalysisItems, false, request.meters, request.meterData, request.accountPredictors
    );
    const response = await runProductionWorker<AccountAnalysisResultsResponse>(() => new Worker(new URL('../../../../../platform/web-workers/annual-account-analysis.worker', import.meta.url), { type: 'module' }), request);
    expect(response.error).toBe(false);
    expect(response.annualAnalysisSummaries).toEqual(fallback.getAnnualAnalysisSummaries());
    expect(response.monthlyAnalysisSummaryData).toEqual(fallback.monthlyAnalysisSummaryData);
    expect(response.facilitySummaries).toEqual(fallback.facilitySummaries);
    // The existing false flag returns the latest report year, not every historical month.
    expect(response.monthlyAnalysisSummaryData).toHaveLength(12);
  });

  it('retains the user-defined monthly inspection response and reports invalid requests', async () => {
    const fixture = calculationFixture();
    const request = {
      selectedGroup: fixture.allAccountAnalysisItems[0].groups[0], analysisItem: fixture.allAccountAnalysisItems[0],
      facility: fixture.accountFacilities[0], meters: fixture.meters, meterData: fixture.meterData,
      accountPredictorEntries: fixture.accountPredictorEntries, accountAnalysisItems: fixture.allAccountAnalysisItems,
      assessmentReportVersion: fixture.account.assessmentReportVersion
    };
    const meters = getCalanderizedMeterData(request.meters, request.meterData, request.facility, false,
      { energyIsSource: false, neededUnits: 'MMBtu' }, [], [], [request.facility], request.assessmentReportVersion, []);
    const fallback = new MonthlyAnalysisSummaryClass(request.selectedGroup, request.analysisItem, request.facility,
      meters, request.accountPredictorEntries, false, request.accountAnalysisItems);
    const createWorker = () => new Worker(new URL('../../../../../platform/web-workers/monthly-group-analysis.worker', import.meta.url), { type: 'module' });
    const response = await runProductionWorker<any>(createWorker, request);
    expect(response.error).toBe(false);
    expect(response.monthlyAnalysisSummary).toEqual(fallback.getResults());
    const failed = await runProductionWorker<any>(createWorker, { ...request, selectedGroup: undefined });
    expect(failed).toEqual({ error: true, monthlyAnalysisSummary: undefined });
  });
});
