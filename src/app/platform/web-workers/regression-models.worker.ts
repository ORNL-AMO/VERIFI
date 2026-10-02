/// <reference lib="webworker" />

import { calculateRegressionModels } from '@shared/shared-analysis/calculations/regression-models-calculation';
import { RegressionModelsWorkerRequest, RegressionModelsWorkerResponse } from './regression-models-worker.contract';

addEventListener('message', ({ data }: MessageEvent<RegressionModelsWorkerRequest>) => {
  let response: RegressionModelsWorkerResponse;
  try {
    response = { ok: true, generatedModels: calculateRegressionModels(data) };
  } catch (error) {
    response = {
      ok: false,
      message: error instanceof Error ? error.message : 'Regression models could not be generated.'
    };
  }
  postMessage(response);
});
