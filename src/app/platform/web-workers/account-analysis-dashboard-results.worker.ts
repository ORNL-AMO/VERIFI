/// <reference lib="webworker" />

import { calculateAccountAnalysisDashboardResults } from '@domain/calculations/analysis-calculations/account-analysis-results-calculation';
import {
  AccountAnalysisResultsWorkerRequest,
  AccountAnalysisResultsWorkerResponse
} from './account-analysis-results-worker.contract';

addEventListener('message', ({ data }: MessageEvent<AccountAnalysisResultsWorkerRequest>) => {
  let response: AccountAnalysisResultsWorkerResponse;
  try {
    response = { ok: true, value: calculateAccountAnalysisDashboardResults(data) };
  } catch (error) {
    response = {
      ok: false,
      message: error instanceof Error ? error.message : 'Account analysis calculation failed.'
    };
  }
  postMessage(response);
});
