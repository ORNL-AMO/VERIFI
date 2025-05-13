import { Pipe, PipeTransform } from '@angular/core';
import { ConvertValue } from 'src/app/calculations/conversions/convertValue';
import { FuelTypeOption } from '../fuel-options/fuelTypeOption';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';

@Pipe({
    name: 'emissionsDisplay',
    standalone: false
})
export class EmissionsDisplayPipe implements PipeTransform {

  transform(selectedFuelType: FuelTypeOption | IdbCustomFuel, energyUnits: string, valType: 'HHV' | 'CO2' | 'CH4' | 'N2O', collectionUnit?: string, distanceUnit?: string): string {
    let value: number;
    if (valType == 'HHV') {
      value = selectedFuelType.heatCapacityValue;
    } else if (valType == 'CH4') {
      value = selectedFuelType.CH4;
    } else if (valType == 'CO2') {
      value = selectedFuelType.CO2;
    } else if (valType == 'N2O') {
      value = selectedFuelType.N2O;
    }
    let results: number;
    if (!selectedFuelType.isMobile) {
      if (energyUnits != 'MMBtu') {
        if (valType == 'HHV') {
          results = new ConvertValue(value, 'MMBtu', energyUnits).convertedValue;
        } else {
          let conversionHelper: number = new ConvertValue(1, 'MMBtu', energyUnits).convertedValue;
          results = value / conversionHelper;
        }
      }
      results = value;
    } else {
      if (valType == 'CO2' || !selectedFuelType.isOnRoad) {
        let conversionHelper: number = new ConvertValue(1, 'gal', collectionUnit).convertedValue;
        results = value / conversionHelper;
      } else {
        let conversionHelper: number = new ConvertValue(1, 'mi', distanceUnit).convertedValue;
        results = value / conversionHelper;
      }
    }
    return (results).toLocaleString(undefined, { maximumSignificantDigits: 5 });
  }

}
