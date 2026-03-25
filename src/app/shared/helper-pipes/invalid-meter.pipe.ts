import { Pipe, PipeTransform } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { isMeterInvalid } from '../validation/meterValidation';

@Pipe({
  name: 'invalidMeter',
  standalone: false,
  pure: false
})
export class InvalidMeterPipe implements PipeTransform {

  constructor(
    private utilityMeterDbService: UtilityMeterdbService
  ) { }

  transform(meterGuid: string): boolean {
    let meter: IdbUtilityMeter = this.utilityMeterDbService.getFacilityMeterById(meterGuid);
    return isMeterInvalid(meter);
  }
}