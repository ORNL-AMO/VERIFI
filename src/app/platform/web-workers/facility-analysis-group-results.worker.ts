/// <reference lib="webworker" />

import { calculateFacilityAnalysisGroupResults } from '@domain/calculations/analysis-calculations/facility-analysis-group-results-calculation';
import {
  FacilityAnalysisGroupResultsWorkerRequest,
  FacilityAnalysisGroupResultsWorkerResponse
} from './facility-analysis-group-results-worker.contract';

addEventListener('message', ({ data }: MessageEvent<FacilityAnalysisGroupResultsWorkerRequest>) => {
  let response: FacilityAnalysisGroupResultsWorkerResponse;
  try {
    response = { ok: true, value: calculateFacilityAnalysisGroupResults(data) };
  } catch (error) {
    response = {
      ok: false,
      message: error instanceof Error ? error.message : 'Analysis group calculation failed.'
    };
  }
  postMessage(response);
});
