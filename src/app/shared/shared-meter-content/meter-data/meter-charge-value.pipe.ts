import { Pipe, PipeTransform } from '@angular/core';
import { MeterDataCharge } from 'src/app/models/idbModels/utilityMeterData';

@Pipe({
  name: 'meterChargeValue',
  standalone: false
})
export class MeterChargeValuePipe implements PipeTransform {

  transform(meterCharges: Array<MeterDataCharge>,chargeGuid: string, amountOrUsage: 'amount' | 'usage'): number {
    if (chargeGuid && meterCharges) {
      const charge = meterCharges.find(c => c.chargeGuid === chargeGuid);
      if (charge) {
        if (amountOrUsage === 'amount') {
          return charge.chargeAmount;
        } else if (amountOrUsage === 'usage') {
          return charge.chargeUsage;
        }
      }
    }
    return null;
  }

}
