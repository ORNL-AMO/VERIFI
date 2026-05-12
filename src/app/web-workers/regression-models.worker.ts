/// <reference lib="webworker" />

import { getCalanderizedMeterData } from '../calculations/calanderization/calanderizeMeters';
import { getNeededUnits } from '../calculations/shared-calculations/calanderizationFunctions';
import { CalanderizedMeter } from '../models/calanderization';
import { JStatRegressionModel } from '../models/analysis';
import { RegressionModelsCalculator } from '../shared/shared-analysis/calculations/regression-models-calculator';

addEventListener('message', ({ data }) => {
  try {
    const calanderizationOptions = {
      energyIsSource: data.analysisItem.energyIsSource,
      neededUnits: getNeededUnits(data.analysisItem)
    };
    const calanderizedMeters: Array<CalanderizedMeter> = getCalanderizedMeterData(
      data.meters,
      data.meterData,
      data.facility,
      false,
      calanderizationOptions,
      [],
      [],
      [data.facility],
      data.assessmentReportVersion,
      []
    );
    const calculator = new RegressionModelsCalculator(data.facilityPredictorData);
    const generatedModels: Array<JStatRegressionModel> = calculator.getModels(
      data.group,
      calanderizedMeters,
      data.facility,
      data.analysisItem
    );
    postMessage({ generatedModels, error: false });
  } catch (err) {
    console.error(err);
    postMessage({ generatedModels: undefined, error: true });
  }
});
