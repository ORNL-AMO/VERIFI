import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Pipe({
  name: 'facilityItem',
  standalone: false
})
export class FacilityItemPipe implements PipeTransform {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);


  transform(facilityId: string): IdbFacility {
    return this.accountWorkspaceStore.facilities().find(facility => facility.guid === (facilityId));
  }

}
