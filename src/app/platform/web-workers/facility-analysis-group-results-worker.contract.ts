import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { CalanderizedMeter } from '@data/models/calanderization';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';

export interface FacilityAnalysisGroupResultsWorkerRequest {
  readonly analysisItem: IdbAnalysisItem;
  readonly groupGuid: string;
  readonly facility: IdbFacility;
  readonly calanderizedMeters: readonly CalanderizedMeter[];
  readonly accountPredictorEntries: readonly IdbPredictorData[];
  readonly accountPredictors: readonly IdbPredictor[];
  readonly accountAnalysisItems: readonly IdbAnalysisItem[];
  readonly reportYear?: number;
}

export interface FacilityAnalysisGroupResultsValue {
  readonly itemId: string;
  readonly groupGuid: string;
  readonly group: AnalysisGroup;
  readonly annualAnalysisSummaryData: readonly AnnualAnalysisSummary[];
  readonly monthlyAnalysisSummaryData: readonly MonthlyAnalysisSummaryData[];
  readonly reportYear?: number;
}

export type FacilityAnalysisGroupResultsWorkerResponse =
  | { readonly ok: true; readonly value: FacilityAnalysisGroupResultsValue }
  | { readonly ok: false; readonly message: string };
