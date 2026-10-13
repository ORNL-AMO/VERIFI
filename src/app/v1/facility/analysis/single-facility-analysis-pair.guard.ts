import { inject } from '@angular/core';
import { CanActivateChildFn } from '@angular/router';
import { SingleFacilityAnalysisPairService } from './single-facility-analysis-pair.service';

export const singleFacilityAnalysisPairGuard: CanActivateChildFn = async () => {
  await inject(SingleFacilityAnalysisPairService).ensurePairs();
  return true;
};
