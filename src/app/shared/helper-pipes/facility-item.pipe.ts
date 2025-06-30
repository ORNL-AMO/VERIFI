import { Pipe, PipeTransform } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Pipe({
  name: 'facilityItem',
  standalone: false
})
export class FacilityItemPipe implements PipeTransform {

  constructor(private facilityDbService: FacilitydbService) {
  }

  transform(facilityId: string): IdbFacility {
    return this.facilityDbService.getFacilityById(facilityId);
  }

}
