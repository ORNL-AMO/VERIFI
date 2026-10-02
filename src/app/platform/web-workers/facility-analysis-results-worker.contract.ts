import { AnalysisGroup, AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { CalanderizedMeter } from '@data/models/calanderization';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictor } from '@data/models/idbModels/predictor';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';

export interface FacilityAnalysisGroupCalculationResult {
  readonly group: AnalysisGroup;
  readonly monthlyAnalysisSummaryData: readonly MonthlyAnalysisSummaryData[];
  readonly annualAnalysisSummaryData: readonly AnnualAnalysisSummary[];
}

export interface FacilityAnalysisResultsWorkerRequest {
  readonly analysisItem: IdbAnalysisItem;
  readonly facility: IdbFacility;
  readonly calanderizedMeters: readonly CalanderizedMeter[];
  readonly accountPredictorEntries: readonly IdbPredictorData[];
  readonly accountPredictors: readonly IdbPredictor[];
  readonly accountAnalysisItems: readonly IdbAnalysisItem[];
  readonly calculateAllMonthlyData: boolean;
  readonly includeGroupSummaries: boolean;
  readonly reportYear?: number;
}

export interface FacilityAnalysisResultsValue {
  readonly itemId: string;
  readonly annualAnalysisSummaries: readonly AnnualAnalysisSummary[];
  readonly monthlyAnalysisSummaryData: readonly MonthlyAnalysisSummaryData[];
  readonly groupSummaries: readonly FacilityAnalysisGroupCalculationResult[];
  readonly reportYear?: number;
}

export type FacilityAnalysisResultsWorkerResponse =
  | { readonly ok: true; readonly value: FacilityAnalysisResultsValue }
  | { readonly ok: false; readonly message: string };
