import { Pipe, PipeTransform } from '@angular/core';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';
import { MeterSource } from 'src/app/models/constantsAndTypes';

@Pipe({
  name: 'convertEnergyUseResult',
  standalone: false,
})
export class ConvertEnergyUseResultPipe implements PipeTransform {

  transform(energyUse: number, calculatedUnit: string, resultsUnit: string, source: MeterSource): number {
    let siteToSource: number = 1;
    if(source == 'Electricity' && calculatedUnit != 'MMBtu'){
        siteToSource = 3;
    }
    energyUse = energyUse * siteToSource;
    return new ConvertValue(energyUse, calculatedUnit, resultsUnit).convertedValue;
  }

}
