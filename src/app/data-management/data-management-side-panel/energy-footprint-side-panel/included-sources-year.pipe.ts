import { Pipe, PipeTransform } from '@angular/core';
import { FootprintAnnualResult, IncludedSourcesAnnualResult } from 'src/app/calculations/energy-footprint/energyFootprintModels';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Pipe({
  name: 'includedSourcesYear',
  standalone: false,
  pure: false
})
export class IncludedSourcesYearPipe implements PipeTransform {

  transform(includedSourcesAnnualResults: Array<IncludedSourcesAnnualResult>, year: number, source: MeterSource): FootprintAnnualResult {
    let sourceResult = includedSourcesAnnualResults.find(result => result.source === source);
    if (!sourceResult) {
      return {
        year: year,
        energyUse: 0,
        percentOfTotal: 0
      }
    }
    let annualResult = sourceResult.annualTotals.find(result => result.year === year);
    if (!annualResult) {
      return {
        year: year,
        energyUse: 0,
        percentOfTotal: 0
      }
    }
    console.log('annualResult', annualResult)
    return annualResult;
  }

}
