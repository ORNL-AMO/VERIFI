import { Pipe, PipeTransform } from '@angular/core';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import * as _ from 'lodash';

@Pipe({
  name: 'dataManagementSidebarFacilitiesList',
  standalone: false
})
export class DataManagementSidebarFacilitiesListPipe implements PipeTransform {

  transform(facilityList: Array<IdbFacility>): Array<IdbFacility> {
    return _.orderBy(facilityList, (facilityListItem: IdbFacility) => {
      return facilityListItem.facilityOrder;
    }, ['asc']);
  }
}
