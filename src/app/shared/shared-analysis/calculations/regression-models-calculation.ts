import { AnalysisGroup, JStatRegressionModel } from '@data/models/analysis';
import { CalanderizedMeter } from '@data/models/calanderization';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { RegressionModelsWorkerRequest } from '@platform/web-workers/regression-models-worker.contract';
import { RegressionModelsCalculator } from './regression-models-calculator';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbPredictorData } from '@data/models/idbModels/predictorData';

/** Shared deterministic entry point for Worker and synchronous execution. */
export function calculateRegressionModels(request: RegressionModelsWorkerRequest): JStatRegressionModel[] {
  const calanderizedMeters: CalanderizedMeter[] = getCalanderizedMeterData(
    [...request.meters],
    [...request.meterData],
    request.facility,
    false,
    { energyIsSource: request.analysisItem.energyIsSource, neededUnits: getNeededUnits(request.analysisItem) },
    [],
    [],
    [request.facility],
    request.assessmentReportVersion,
    []
  );
  return new RegressionModelsCalculator([...request.facilityPredictorData]).getModels(
    request.group,
    calanderizedMeters,
    request.facility,
    request.analysisItem
  );
}

export function buildUserDefinedRegressionModel(
  selectedGroup: AnalysisGroup,
  selectedFacility: IdbFacility,
  analysisItem: IdbAnalysisItem,
  reportYear: number,
  facilityPredictorData: readonly IdbPredictorData[]
): JStatRegressionModel {
  const selectedPredictors = selectedGroup.predictorVariables.filter(variable => variable.productionInAnalysis);
  const model: JStatRegressionModel = {
    coef: [selectedGroup.regressionConstant, ...selectedPredictors.map(variable => variable.regressionCoefficient)],
    R2: undefined, SSE: undefined, SSR: undefined, SST: undefined, adjust_R2: undefined,
    df_model: undefined, df_resid: undefined, ybar: undefined,
    t: { se: undefined, sigmaHat: undefined, p: undefined },
    f: { pvalue: undefined, F_statistic: undefined },
    modelYear: selectedGroup.regressionModelYear,
    predictorVariables: selectedPredictors,
    modelId: undefined,
    isValid: false,
    modelPValue: undefined,
    modelNotes: [selectedGroup.regressionModelNotes],
    errorModeling: false,
    SEPValidation: undefined,
    SEPValidationPass: undefined,
    dataValidationNotes: [''],
    modelValidationNotes: [''],
    isUserDefinedModel: true
  };
  return new RegressionModelsCalculator([...facilityPredictorData]).setModelVaildAndNotes(
    model,
    reportYear,
    selectedFacility,
    analysisItem.baselineYear,
    selectedGroup
  );
}
