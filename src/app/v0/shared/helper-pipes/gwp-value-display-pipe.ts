import { Pipe, PipeTransform } from '@angular/core';
import { getGlobalWarmingPotential } from '@domain/calculations/emissions-calculations/emissions';
import { GlobalWarmingPotential } from '@data/models/globalWarmingPotentials';
import { AssessmentReportVersion } from '@data/models/idbModels/account';

@Pipe({
  name: 'gwpValueDisplay',
  standalone: false,
})
export class GwpValueDisplayPipe implements PipeTransform {

  transform(globalWarmingPotentialOption: number,
    assessmentReportVersion: AssessmentReportVersion,
    startingUnit: string,
    globalWarmingPotentials: Array<GlobalWarmingPotential>): number {
    return getGlobalWarmingPotential(globalWarmingPotentialOption, assessmentReportVersion, startingUnit, globalWarmingPotentials);
  }

}
