import { Pipe, PipeTransform } from '@angular/core';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';

@Pipe({
  name: 'emissionsDisplay'
})
export class EmissionsDisplayPipe implements PipeTransform {

  transform(value: number, energyUnits: string, valType: 'HHV' | 'CO2' | 'CH4' | 'N2O'): number {
    if (energyUnits != 'MMBtu') {
      if (valType == 'HHV') {
        return new ConvertValue(value, 'MMBtu', energyUnits).convertedValue;
      } else {
        let conversionHelper: number = new ConvertValue(1, 'MMBtu', energyUnits).convertedValue;
        return value / conversionHelper;
      }
    }
    return value;
  }

}
