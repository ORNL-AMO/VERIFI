import { Pipe, PipeTransform } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { isMeterInvalid } from '../../validation/meterValidation';

@Pipe({
  name: 'invalidMeters',
  standalone: false,
  pure: false
})
export class InvalidMetersPipe implements PipeTransform {

  constructor(
    private utilityMeterDbService: UtilityMeterdbService
  ) { }

  transform(facilityId: string): boolean {
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(facilityId);
    let hasInvalidMeter: boolean = facilityMeters.some(meter => {
      return isMeterInvalid(meter);
    });
    return hasInvalidMeter;
  }

}
