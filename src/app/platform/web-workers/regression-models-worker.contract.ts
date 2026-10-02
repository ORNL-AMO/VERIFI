import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { AssessmentReportVersion } from '@data/models/idbModels/account';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';

export interface RegressionModelsWorkerRequest {
  readonly group: AnalysisGroup;
  readonly analysisItem: IdbAnalysisItem;
  readonly facility: IdbFacility;
  readonly meters: readonly IdbUtilityMeter[];
  readonly meterData: readonly IdbUtilityMeterData[];
  readonly facilityPredictorData: readonly IdbPredictorData[];
  readonly assessmentReportVersion: AssessmentReportVersion;
}

export type RegressionModelsWorkerResponse =
  | { readonly ok: true; readonly generatedModels: readonly JStatRegressionModel[] }
  | { readonly ok: false; readonly message: string };
