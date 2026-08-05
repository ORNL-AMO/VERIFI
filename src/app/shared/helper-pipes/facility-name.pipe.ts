import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Pipe({
    pure: false,
    name: 'facilityName',
    standalone: false
})
export class FacilityNamePipe implements PipeTransform {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  constructor(private facilityDbService: FacilitydbService) {
  }

  transform(facilityId: string, facilities?: Array<IdbFacility>): string {
    if (facilities) {
      let facility: IdbFacility = facilities.find(f => { return f.guid == facilityId });
      return facility?.name;
    } else {
      return (this.accountWorkspaceStore.facilities().find(facility => facility.guid === (facilityId))?.name ?? '');
    }
  }

}
