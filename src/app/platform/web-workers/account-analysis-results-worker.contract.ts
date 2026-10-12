import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';

export interface AccountAnalysisResultsWorkerRequest {
  readonly accountAnalysisItem: IdbAccountAnalysisItem;
  readonly account: IdbAccount;
  readonly accountFacilities: readonly IdbFacility[];
  readonly accountPredictorEntries: readonly IdbPredictorData[];
  readonly allAccountAnalysisItems: readonly IdbAnalysisItem[];
  readonly calculateAllMonthlyData: boolean;
  readonly meters: readonly IdbUtilityMeter[];
  readonly meterData: readonly IdbUtilityMeterData[];
  readonly accountPredictors: readonly IdbPredictor[];
  readonly reportYear?: number;
}

export interface AccountAnalysisResultsValue {
  readonly itemId: string;
  readonly annualAnalysisSummaries: readonly AnnualAnalysisSummary[];
  readonly monthlyAnalysisSummaryData: readonly MonthlyAnalysisSummaryData[];
  readonly reportYear?: number;
}

export type AccountAnalysisResultsWorkerResponse =
  | { readonly ok: true; readonly value: AccountAnalysisResultsValue }
  | { readonly ok: false; readonly message: string };
