import { Pipe, PipeTransform } from '@angular/core';
import { FacilityListItem } from './sidebar.component';
import * as _ from 'lodash';

@Pipe({
  name: 'facilityList',
  pure: false
})
export class FacilityListPipe implements PipeTransform {

  transform(facilityList: Array<FacilityListItem>, showAll?: boolean): Array<FacilityListItem> {
    let orderedList: Array<FacilityListItem> = _.orderBy(facilityList, (facilityListItem: FacilityListItem) => {
      return facilityListItem.facilityOrder;
    }, ['asc']);
    if (facilityList.length > 4) {
      if (!showAll) {
        return orderedList.splice(0, 4)
      } else {
        return orderedList;
      }
    } else {
      return orderedList;
    }
  }

}
