import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Observable } from 'rxjs';
import { IdbFacilityEnergyUseGroup } from '../models/idbModels/facilityEnergyUseGroups';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class FacilityEnergyUseGroupsDbService {


  constructor(private dbService: NgxIndexedDBService,
    private indexedDbAccess: IndexedDbAccessService) { }

  getAll(): Observable<Array<IdbFacilityEnergyUseGroup>> {
    return this.dbService.getAll('facilityEnergyUseGroups');
  }

  async getAllAccountEnergyUseGroups(accountId: string): Promise<Array<IdbFacilityEnergyUseGroup>> {
    return this.indexedDbAccess.getAllByIndex<IdbFacilityEnergyUseGroup>(
      'facilityEnergyUseGroups',
      'accountId',
      accountId
    );
  }

  getById(energyUseGroupId: number): Observable<IdbFacilityEnergyUseGroup> {
    return this.dbService.getByKey('facilityEnergyUseGroups', energyUseGroupId);
  }

  getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbFacilityEnergyUseGroup> {
    return this.dbService.getByIndex('facilityEnergyUseGroups', indexName, indexValue);
  }

  getStoredByGuid(guid: string): Promise<IdbFacilityEnergyUseGroup | undefined> {
    return this.indexedDbAccess.getByGuid<IdbFacilityEnergyUseGroup>('facilityEnergyUseGroups', guid);
  }

  count() {
    return this.dbService.count('facilityEnergyUseGroups');
  }

  addWithObservable(energyUseGroup: IdbFacilityEnergyUseGroup): Observable<IdbFacilityEnergyUseGroup> {
    return this.dbService.add('facilityEnergyUseGroups', energyUseGroup);
  }

  updateWithObservable(energyUseGroup: IdbFacilityEnergyUseGroup): Observable<IdbFacilityEnergyUseGroup> {
    energyUseGroup.modifiedDate = new Date();
    return this.dbService.update('facilityEnergyUseGroups', energyUseGroup);
  }

  deleteWithObservable(energyUseGroupId: number): Observable<any> {
    return this.dbService.delete('facilityEnergyUseGroups', energyUseGroupId)
  }

  async deleteAllFacilityEnergyUseGroups(facilityId: string) {
    await this.indexedDbAccess.deleteAllByIndex('facilityEnergyUseGroups', 'facilityId', facilityId);
  }
}
