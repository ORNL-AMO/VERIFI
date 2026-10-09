/// <reference lib="webworker" />

import { calculateFacilityAnalysisOutcomeResults } from '@domain/calculations/analysis-calculations/facility-analysis-results-calculation';
import {
  FacilityAnalysisResultsWorkerRequest,
  FacilityAnalysisResultsWorkerResponse
} from './facility-analysis-results-worker.contract';

addEventListener('message', ({ data }: MessageEvent<FacilityAnalysisResultsWorkerRequest>) => {
  let response: FacilityAnalysisResultsWorkerResponse;
  try {
    response = { ok: true, value: calculateFacilityAnalysisOutcomeResults(data) };
  } catch (error) {
    response = {
      ok: false,
      message: error instanceof Error ? error.message : 'Facility analysis outcome calculation failed.'
    };
  }
  postMessage(response);
});
