import { Pipe, PipeTransform } from '@angular/core';
import { ChargesTypes, MeterChargeType } from '@data/models/meter-charges-options';

@Pipe({
  name: 'chargeTypeLabel',
  standalone: false
})
export class ChargeTypeLabelPipe implements PipeTransform {

  transform(chargeType: MeterChargeType): string {
    let chargeTypeOption = ChargesTypes.find(option => option.value === chargeType);
    return chargeTypeOption ? chargeTypeOption.label : null;
  }

}
