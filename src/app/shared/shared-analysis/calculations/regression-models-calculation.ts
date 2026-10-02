import { JStatRegressionModel } from '@data/models/analysis';
import { CalanderizedMeter } from '@data/models/calanderization';
import { getCalanderizedMeterData } from '@domain/calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from '@domain/calculations/shared-calculations/calanderizationFunctions';
import { RegressionModelsWorkerRequest } from '@platform/web-workers/regression-models-worker.contract';
import { RegressionModelsCalculator } from './regression-models-calculator';

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
