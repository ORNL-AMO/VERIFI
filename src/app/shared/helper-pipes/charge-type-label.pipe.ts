import { Pipe, PipeTransform } from '@angular/core';
import { ChargesTypes, MeterChargeType } from '../shared-meter-content/edit-meter-form/meter-charges-form/meterChargesOptions';

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
