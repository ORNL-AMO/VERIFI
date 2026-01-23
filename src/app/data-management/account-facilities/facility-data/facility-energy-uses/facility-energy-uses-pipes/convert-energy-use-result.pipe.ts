import { Pipe, PipeTransform } from '@angular/core';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';

@Pipe({
  name: 'convertEnergyUseResult',
  standalone: false,
})
export class ConvertEnergyUseResultPipe implements PipeTransform {

  transform(energyUse: number, calculatedUnit: string, resultsUnit: string): number {
    return new ConvertValue(energyUse, calculatedUnit, resultsUnit).convertedValue;
  }

}
