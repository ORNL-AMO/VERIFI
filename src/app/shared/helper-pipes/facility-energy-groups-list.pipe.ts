import { Pipe, PipeTransform } from '@angular/core';
import { IdbFacilityEnergyUseGroup } from 'src/app/models/idbModels/facilityEnergyUseGroups';

@Pipe({
  name: 'facilityEnergyGroupsList',
  standalone: false
})
export class FacilityEnergyGroupsListPipe implements PipeTransform {

  transform(facilityGuid: string, accountFacilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup>): Array<IdbFacilityEnergyUseGroup> {
    return accountFacilityEnergyUseGroups.filter(energyUseGroups => {
      return energyUseGroups.facilityId == facilityGuid;
    });
  }
}
