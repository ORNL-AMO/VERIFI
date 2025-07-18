import { Pipe, PipeTransform } from '@angular/core';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Pipe({
  name: 'hideFacilityLinks',
  standalone: false
})
export class HideFacilityLinksPipe implements PipeTransform {

  transform(url: string, index: number, sidebarOpen: boolean, showAllFacilities: boolean, hoverIndex: number, selectedFacility: IdbFacility, facilityId: string): boolean {
    if (showAllFacilities && index > 0 && index != hoverIndex) {
      return true;
    } else {
      if (sidebarOpen && !showAllFacilities) {
        return false;
      } else if (url.includes('account') && !url.includes('facility')) {
        if (index == hoverIndex) {
          return false;
        } else {
          return true;
        }
      } else if (selectedFacility) {
        if (index == hoverIndex) {
          return false;
        } else if (selectedFacility.guid != facilityId) {
          return true;
        }
      }
    }
    return false;
  }

}
