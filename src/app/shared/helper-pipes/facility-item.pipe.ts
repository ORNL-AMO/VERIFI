import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Pipe({
  name: 'facilityItem',
  standalone: false
})
export class FacilityItemPipe implements PipeTransform {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  constructor(private facilityDbService: FacilitydbService) {
  }

  transform(facilityId: string): IdbFacility {
    return this.accountWorkspaceStore.facilities().find(facility => facility.guid === (facilityId));
  }

}
