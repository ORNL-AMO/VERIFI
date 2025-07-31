import { Pipe, PipeTransform } from '@angular/core';
import { ChargeCostUnit, ConsumptionCostUnits, DemandCostUnits, MeterChargeType, OtherCostUnits } from './meterChargesOptions';

@Pipe({
  name: 'chargesUnitOptions',
  standalone: false
})
export class ChargesUnitOptionsPipe implements PipeTransform {

  transform(chargeType: MeterChargeType): Array<{ value: ChargeCostUnit, label: string }> {
    return getChargeTypeUnitOptions(chargeType);
  }
}

export function getChargeTypeUnitOptions(chargeType: MeterChargeType): Array<{ value: ChargeCostUnit, label: string }> {
  if (chargeType == 'consumption') {
    return ConsumptionCostUnits;
  } else if (chargeType == 'demand') {
    return DemandCostUnits;
  }
  return OtherCostUnits;
}