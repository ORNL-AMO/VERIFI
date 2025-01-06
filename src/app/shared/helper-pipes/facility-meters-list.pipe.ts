import { Pipe, PipeTransform } from '@angular/core';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import * as _ from 'lodash';
@Pipe({
  name: 'facilityMetersList'
})
export class FacilityMetersListPipe implements PipeTransform {

  transform(facilityId: string, accountMeters: Array<IdbUtilityMeter>): Array<IdbUtilityMeter> {
    let meters: Array<IdbUtilityMeter> = accountMeters.filter(meter => {
      return meter.facilityId == facilityId
    });
    return _.orderBy(meters, (meter: IdbUtilityMeter) => {
      return meter.name
    });
  }

}
