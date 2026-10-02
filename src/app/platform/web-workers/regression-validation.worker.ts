/// <reference lib="webworker" />

import { calculateRegressionValidation } from '@domain/calculations/analysis-calculations/regression-validation-calculation';
import {
  RegressionValidationWorkerRequest,
  RegressionValidationWorkerResponse
} from './regression-validation-worker.contract';

addEventListener('message', ({ data }: MessageEvent<RegressionValidationWorkerRequest>) => {
  let response: RegressionValidationWorkerResponse;
  try {
    response = { ok: true, value: calculateRegressionValidation(data) };
  } catch (error) {
    response = {
      ok: false,
      message: error instanceof Error ? error.message : 'Model validation could not be calculated.'
    };
  }
  postMessage(response);
});
