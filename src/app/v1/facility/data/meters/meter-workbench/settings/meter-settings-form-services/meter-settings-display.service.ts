import { Injectable } from '@angular/core';
import { ConvertValue } from '@domain/calculations/conversions/convertValue';
import { FuelTypeOption } from '@shared/fuel-options/fuelTypeOption';

@Injectable({ providedIn: 'root' })
export class MeterSettingsDisplayService {
  getUnitLabel(value: string): string {
    if (!value) { return ''; }
    if (value === 'F') { return '&#8457;'; }
    if (value === 'C') { return '&#8451;'; }
    if (value === 'K') { return '&#8490;'; }
    const foundUnit = new ConvertValue(undefined, undefined, undefined).getUnit(value);
    return foundUnit ? foundUnit.unit.name.display.replace('(', '').replace(')', '') : `${value} (unsupported unit)`;
  }

  getEmissionDisplay(
    selectedFuelType: FuelTypeOption,
    energyUnits: string,
    valueType: 'CO2' | 'CH4' | 'N2O',
    collectionUnit?: string,
    distanceUnit?: string
  ): string {
    const sourceValue = selectedFuelType[valueType];
    if (!sourceValue) {
      return '';
    }
    let result: number;
    if (!selectedFuelType.isMobile) {
      result = sourceValue;
      if (energyUnits !== 'MMBtu') {
        const conversionHelper = new ConvertValue(1, 'MMBtu', energyUnits).convertedValue;
        result = sourceValue / conversionHelper;
      }
    } else if (valueType === 'CO2' || !selectedFuelType.isOnRoad) {
      const conversionHelper = new ConvertValue(1, 'gal', collectionUnit).convertedValue;
      result = sourceValue / conversionHelper;
    } else {
      const conversionHelper = new ConvertValue(1, 'mi', distanceUnit).convertedValue;
      result = sourceValue / conversionHelper;
    }
    return result.toLocaleString(undefined, { maximumSignificantDigits: 5 });
  }
}
