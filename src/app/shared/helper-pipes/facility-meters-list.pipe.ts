import { Pipe, PipeTransform } from '@angular/core';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
@Pipe({
  name: 'facilityMetersList'
})
export class FacilityMetersListPipe implements PipeTransform {

  transform(facilityId: string, accountMeters: Array<IdbUtilityMeter>): Array<IdbUtilityMeter> {
    return accountMeters.filter(meter => {
      return meter.facilityId == facilityId
    });
  }

}
