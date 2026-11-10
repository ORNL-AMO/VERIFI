/// <reference lib="webworker" />

import { calculateUserDefinedInspection, UserDefinedInspectionRequest, UserDefinedInspectionResponse } from '@domain/calculations/analysis-calculations/user-defined-inspection-calculation';

addEventListener('message', ({ data }: MessageEvent<UserDefinedInspectionRequest>) => {
  let response: UserDefinedInspectionResponse;
  try {
    response = calculateUserDefinedInspection(data);
  } catch {
    response = { error: true };
  }
  postMessage(response);
});
