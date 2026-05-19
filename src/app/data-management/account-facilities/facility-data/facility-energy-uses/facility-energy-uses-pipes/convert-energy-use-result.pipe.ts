import { Pipe, PipeTransform } from '@angular/core';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Pipe({
  name: 'convertEnergyUseResult',
  standalone: false,
})
export class ConvertEnergyUseResultPipe implements PipeTransform {

  transform(energyUse: number, calculatedUnit: string, resultsUnit: string, source: MeterSource): number {
    // let siteToSource: number = 1;
    //remove site to source
    // if(source == 'Electricity' && calculatedUnit != 'MMBtu'){
    //     siteToSource = 3;
    // }
    // energyUse = energyUse * siteToSource;
    let convertedResult: number = new ConvertValue(energyUse, calculatedUnit, resultsUnit).convertedValue;
    //round to 2 decimals
    return Math.round(convertedResult * 100) / 100;
  }

}
