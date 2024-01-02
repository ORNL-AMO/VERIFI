import { Injectable } from '@angular/core';
import { IdbAccount, IdbUtilityMeterGroup } from '../models/idb';
import { UtilityMeterGroupdbService } from '../indexedDB/utilityMeterGroup-db.service';
import { AccountdbService } from '../indexedDB/account-db.service';

@Injectable({
  providedIn: 'root'
})
export class UploadDataSharedFunctionsService {

  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService, private accountDbService: AccountdbService) { }

  getMeterGroup(groupName: string, facilityId: string, newGroups: Array<IdbUtilityMeterGroup>): { group: IdbUtilityMeterGroup, newGroups: Array<IdbUtilityMeterGroup> } {
    let accountGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.getAccountMeterGroupsCopy();
    let facilityGroups: Array<IdbUtilityMeterGroup> = accountGroups.filter(accountGroup => { return accountGroup.facilityId == facilityId });
    let dbGroup: IdbUtilityMeterGroup = facilityGroups.find(group => { return group.name == groupName || group.guid == groupName });
    if (dbGroup) {
      return { group: dbGroup, newGroups: newGroups }
    } else {
      let newFacilityGroups: Array<IdbUtilityMeterGroup> = newGroups.filter(group => { return group.facilityId == facilityId });
      dbGroup = newFacilityGroups.find(newGroup => { return newGroup.name == groupName });
      if (dbGroup) {
        return { group: dbGroup, newGroups: newGroups }
      } else if (groupName) {
        let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
        dbGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Energy", groupName, facilityId, account.guid);
        newGroups.push(dbGroup);
        return { group: dbGroup, newGroups: newGroups }
      } else {
        return { group: undefined, newGroups: newGroups }
      }
    }
  }
}
