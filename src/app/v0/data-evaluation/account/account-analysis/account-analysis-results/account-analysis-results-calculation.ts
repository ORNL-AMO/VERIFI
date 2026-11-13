import { defer, Observable, of, timeout } from 'rxjs';
import { AnnualAccountAnalysisSummaryClass } from '@domain/calculations/analysis-calculations/annualAccountAnalysisSummaryClass';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { CALCULATION_WORKER_TIMEOUT_MS, runWorker } from '@platform/web-workers/run-worker';

export interface AccountAnalysisResultsRequest {
  accountAnalysisItem: IdbAccountAnalysisItem;
  account: IdbAccount;
  accountFacilities: IdbFacility[];
  accountPredictorEntries: IdbPredictorData[];
  allAccountAnalysisItems: IdbAnalysisItem[];
  calculateAllMonthlyData: false;
  meters: IdbUtilityMeter[];
  meterData: IdbUtilityMeterData[];
  accountPredictors: IdbPredictor[];
}

export interface AccountAnalysisResultsResponse {
  error: boolean;
  annualAnalysisSummaries?: AnnualAnalysisSummary[];
  monthlyAnalysisSummaryData?: MonthlyAnalysisSummaryData[];
  facilitySummaries?: Array<{ facility: IdbFacility; analysisItem: IdbAnalysisItem; monthlySummaryData: MonthlyAnalysisSummaryData[] }>;
}

export function runAccountAnalysisResults(request: AccountAnalysisResultsRequest): Observable<AccountAnalysisResultsResponse> {
  return defer(() => {
    if (typeof Worker !== 'undefined') {
      return runWorker<AccountAnalysisResultsResponse>(
        new Worker(new URL('../../../../../platform/web-workers/annual-account-analysis.worker', import.meta.url)), request
      );
    }
    const calculation = new AnnualAccountAnalysisSummaryClass(
      request.accountAnalysisItem, request.account, request.accountFacilities, request.accountPredictorEntries,
      request.allAccountAnalysisItems, request.calculateAllMonthlyData, request.meters, request.meterData, request.accountPredictors
    );
    return of({
      error: false,
      annualAnalysisSummaries: calculation.getAnnualAnalysisSummaries(),
      monthlyAnalysisSummaryData: calculation.monthlyAnalysisSummaryData,
      facilitySummaries: calculation.facilitySummaries
    });
  }).pipe(timeout(CALCULATION_WORKER_TIMEOUT_MS));
}
