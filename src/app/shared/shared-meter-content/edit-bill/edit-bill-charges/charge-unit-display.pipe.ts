import { Pipe, PipeTransform } from '@angular/core';
import { ChargeCostUnit } from '../../edit-meter-form/meter-charges-form/meterChargesOptions';

@Pipe({
  name: 'chargeUnitDisplay',
  standalone: false
})
export class ChargeUnitDisplayPipe implements PipeTransform {

  transform(chargeUnit: ChargeCostUnit): string {
    switch (chargeUnit) {
      case 'dollarsPerDTherms':
        return 'DTherm'
      case 'dollarsPerGJ':
        return 'GJ'
      case 'dollarsPerKilowatt':
        return 'kW'
      case 'dollarsPerKilowattHour':
        return 'kWh'
      case 'dollarsPerKVa':
        return 'kVA'
      case 'dollarsPerMW':
        return 'MW'
      case 'dollarsPerMVA':
        return 'MVA'
      case 'dollarsPerMWh':
        return 'MWh'
      case 'dollarsPerMMBtu':
        return 'MMBtu'
      case 'dollarsPerMJ':
        return 'MJ'
      case 'dollarsPerkJ':
        return 'kJ'
      case 'dollarsPerTherms':
        return 'Therms'
      case 'dollarsPerKcal':
        return 'Kcal'
    }
    return '';
  }
}
