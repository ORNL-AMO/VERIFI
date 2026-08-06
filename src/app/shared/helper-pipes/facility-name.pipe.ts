import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { IdbFacility } from 'src/app/models/idbModels/facility';

@Pipe({
    pure: false,
    name: 'facilityName',
    standalone: false
})
export class FacilityNamePipe implements PipeTransform {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);

  transform(facilityId: string, facilities?: readonly Readonly<IdbFacility>[]): string {
    if (facilities) {
      const facility = facilities.find(f => f.guid === facilityId);
      return facility?.name;
    } else {
      return this.accountWorkspaceStore.facilities().find(facility => facility.guid === facilityId)?.name ?? '';
    }
  }

}
