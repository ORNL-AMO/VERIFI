import { Pipe, PipeTransform } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';

@Pipe({
  pure: false,
  name: 'facilityName'
})
export class FacilityNamePipe implements PipeTransform {

  constructor(private facilityDbService: FacilitydbService) {
  }
  
  transform(facilityId: string): string {
    return this.facilityDbService.getFacilityNameById(facilityId);
  }

}
