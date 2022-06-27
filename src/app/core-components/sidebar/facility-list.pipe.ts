import { Pipe, PipeTransform } from '@angular/core';
import { FacilityListItem } from './sidebar.component';
import * as _ from 'lodash';

@Pipe({
  name: 'facilityList',
  pure: false
})
export class FacilityListPipe implements PipeTransform {

  transform(facilityList: Array<FacilityListItem>, showAll?: boolean): Array<FacilityListItem> {
    if (facilityList.length > 4) {
      let orderedList: Array<FacilityListItem> = _.orderBy(facilityList, (facilityListItem: FacilityListItem) => {
        if (facilityListItem.modifiedDate) {
          return new Date(facilityListItem.modifiedDate)
        } else {
          return undefined;
        }
      }, ['desc']);
      if (!showAll) {
        return orderedList.splice(0, 4)
      } else {
        return orderedList;
      }
    } else {
      return facilityList;
    }
  }

}
