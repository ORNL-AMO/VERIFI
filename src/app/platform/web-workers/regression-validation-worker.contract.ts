import { AnalysisGroup, JStatRegressionModel, MonthlyAnalysisSummaryData } from '@data/models/analysis';
import { AssessmentReportVersion } from '@data/models/idbModels/account';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';

export type RegressionValidationSource = 'user-defined' | 'generated';

export interface RegressionValidationComparisonRequest {
  readonly group: AnalysisGroup;
  readonly model: JStatRegressionModel;
}

export interface RegressionValidationWorkerRequest {
  readonly source: RegressionValidationSource;
  readonly group: AnalysisGroup;
  readonly model?: JStatRegressionModel;
  readonly comparison?: RegressionValidationComparisonRequest;
  readonly analysisItem: IdbAnalysisItem;
  readonly facility: IdbFacility;
  readonly meters: readonly IdbUtilityMeter[];
  readonly meterData: readonly IdbUtilityMeterData[];
  readonly facilityPredictorData: readonly IdbPredictorData[];
  readonly accountPredictorEntries: readonly IdbPredictorData[];
  readonly accountAnalysisItems: readonly IdbAnalysisItem[];
  readonly assessmentReportVersion: AssessmentReportVersion;
}

export interface RegressionValidationValue {
  readonly reportYear: number;
  readonly model: JStatRegressionModel;
  readonly monthly: readonly MonthlyAnalysisSummaryData[];
  readonly comparison?: {
    readonly model: JStatRegressionModel;
    readonly monthly: readonly MonthlyAnalysisSummaryData[];
  };
}

export type RegressionValidationWorkerResponse =
  | { readonly ok: true; readonly value: RegressionValidationValue }
  | { readonly ok: false; readonly message: string };
