import { Pipe, PipeTransform } from '@angular/core';
import { MeterCharge } from 'src/app/models/idbModels/utilityMeter';

@Pipe({
  name: 'meterCharge',
  standalone: false
})
export class MeterChargePipe implements PipeTransform {

  transform(chargeGuid: string, charges: Array<MeterCharge>): MeterCharge {
    return charges.find(c => c.guid === chargeGuid);
  }

}
