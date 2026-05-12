import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbFacilityEnergyUseGroup } from '../models/idbModels/facilityEnergyUseGroups';

@Injectable({
  providedIn: 'root'
})
export class FacilityEnergyUseGroupsDbService {


  facilityEnergyUseGroups: BehaviorSubject<Array<IdbFacilityEnergyUseGroup>>;
  accountEnergyUseGroups: BehaviorSubject<Array<IdbFacilityEnergyUseGroup>>;
  constructor(private dbService: NgxIndexedDBService,
    private loadingService: LoadingService) {
    this.facilityEnergyUseGroups = new BehaviorSubject<Array<IdbFacilityEnergyUseGroup>>(new Array());
    this.accountEnergyUseGroups = new BehaviorSubject<Array<IdbFacilityEnergyUseGroup>>(new Array());
  }

  getAll(): Observable<Array<IdbFacilityEnergyUseGroup>> {
    return this.dbService.getAll('facilityEnergyUseGroups');
  }

  async getAllAccountEnergyUseGroups(accountId: string): Promise<Array<IdbFacilityEnergyUseGroup>> {
    let allEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = await firstValueFrom(this.getAll())
    let accountEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = allEnergyUseGroups.filter(group => { return group.accountId == accountId });
    return accountEnergyUseGroups;
  }

  getById(energyUseGroupId: number): Observable<IdbFacilityEnergyUseGroup> {
    return this.dbService.getByKey('facilityEnergyUseGroups', energyUseGroupId);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbFacilityEnergyUseGroup> {
    return this.dbService.getByIndex('facilityEnergyUseGroups', indexName, indexValue);
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
    let accountEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = this.accountEnergyUseGroups.getValue();
    let facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = accountEnergyUseGroups.filter(energyUseGroup => { return energyUseGroup.facilityId == facilityId });
    await this.deleteEnergyUseGroupsAsync(facilityEnergyUseGroups);
  }

  async deleteAllSelectedAccountEnergyUseGroups() {
    let accountEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = this.accountEnergyUseGroups.getValue();
    await this.deleteEnergyUseGroupsAsync(accountEnergyUseGroups);
  }


  async deleteEnergyUseGroupsAsync(energyUseGroups: Array<IdbFacilityEnergyUseGroup>) {
    for (let i = 0; i < energyUseGroups.length; i++) {
      this.loadingService.setLoadingMessage('Deleting Energy UseGroups (' + i + '/' + energyUseGroups.length + ')...');
      await firstValueFrom(this.deleteWithObservable(energyUseGroups[i].id));
    }
  }

  getByGuid(guid: string): IdbFacilityEnergyUseGroup {
    let accountEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = this.accountEnergyUseGroups.getValue();
    return accountEnergyUseGroups.find(energyUseGroup => {
      return energyUseGroup.guid == guid;
    })
  }

  getByFacilityId(facilityId: string): Array<IdbFacilityEnergyUseGroup> {
    let accountEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = this.accountEnergyUseGroups.getValue();
    return accountEnergyUseGroups.filter(energyUseGroup => {
      return energyUseGroup.facilityId == facilityId;
    })
  }

  getFacilityEnergyUseGroupsCopy(facilityId: string): Array<IdbFacilityEnergyUseGroup> {
    let facilityEnergyUseGroups: Array<IdbFacilityEnergyUseGroup> = this.getByFacilityId(facilityId);
    let facilityEnergyUseGroupsCopy: Array<IdbFacilityEnergyUseGroup> = JSON.parse(JSON.stringify(facilityEnergyUseGroups));
    return facilityEnergyUseGroupsCopy;
  }
}
