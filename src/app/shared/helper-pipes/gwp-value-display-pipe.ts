import { Pipe, PipeTransform } from '@angular/core';
import { getGlobalWarmingPotential } from 'src/app/calculations/emissions-calculations/emissions';
import { GlobalWarmingPotential } from 'src/app/models/globalWarmingPotentials';
import { AssessmentReportVersion } from 'src/app/models/idbModels/account';

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
