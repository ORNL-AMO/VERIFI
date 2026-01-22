import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbFacilityEnergyUseEquipment } from '../models/idbModels/facilityEnergyUseEquipment';

@Injectable({
  providedIn: 'root'
})
export class FacilityEnergyUseEquipmentDbService {

  facilityEnergyUseEquipment: BehaviorSubject<Array<IdbFacilityEnergyUseEquipment>>;
  accountEnergyUseEquipment: BehaviorSubject<Array<IdbFacilityEnergyUseEquipment>>;
  selectedFacilityEnergyUseEquipment: BehaviorSubject<IdbFacilityEnergyUseEquipment>;
  constructor(private dbService: NgxIndexedDBService,
    private loadingService: LoadingService) {
    this.facilityEnergyUseEquipment = new BehaviorSubject<Array<IdbFacilityEnergyUseEquipment>>(new Array());
    this.accountEnergyUseEquipment = new BehaviorSubject<Array<IdbFacilityEnergyUseEquipment>>(new Array());
  }

  getAll(): Observable<Array<IdbFacilityEnergyUseEquipment>> {
    return this.dbService.getAll('facilityEnergyUseEquipment');
  }

  async getAllAccountEnergyUseEquipment(accountId: string): Promise<Array<IdbFacilityEnergyUseEquipment>> {
    let allEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = await firstValueFrom(this.getAll())
    let accountEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = allEnergyUseEquipment.filter(group => { return group.accountId == accountId });
    return accountEnergyUseEquipment;
  }

  getById(energyUseEquipmentId: number): Observable<IdbFacilityEnergyUseEquipment> {
    return this.dbService.getByKey('facilityEnergyUseEquipment', energyUseEquipmentId);
  }

  getByIndex(indexName: string, indexValue: number): Observable<IdbFacilityEnergyUseEquipment> {
    return this.dbService.getByIndex('facilityEnergyUseEquipment', indexName, indexValue);
  }

  count() {
    return this.dbService.count('facilityEnergyUseEquipment');
  }

  addWithObservable(energyUseEquipment: IdbFacilityEnergyUseEquipment): Observable<IdbFacilityEnergyUseEquipment> {
    return this.dbService.add('facilityEnergyUseEquipment', energyUseEquipment);
  }

  updateWithObservable(energyUseEquipment: IdbFacilityEnergyUseEquipment): Observable<IdbFacilityEnergyUseEquipment> {
    energyUseEquipment.modifiedDate = new Date();
    return this.dbService.update('facilityEnergyUseEquipment', energyUseEquipment);
  }

  deleteWithObservable(energyUseEquipmentId: number): Observable<any> {
    return this.dbService.delete('facilityEnergyUseEquipment', energyUseEquipmentId)
  }

  async deleteAllFacilityEnergyUseEquipment(facilityId: string) {
    let accountEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = this.accountEnergyUseEquipment.getValue();
    let facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = accountEnergyUseEquipment.filter(energyUseEquipment => { return energyUseEquipment.facilityId == facilityId });
    await this.deleteEnergyUseEquipmentAsync(facilityEnergyUseEquipment);
  }

  async deleteAllSelectedAccountEnergyUseEquipment() {
    let accountEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = this.accountEnergyUseEquipment.getValue();
    await this.deleteEnergyUseEquipmentAsync(accountEnergyUseEquipment);
  }


  async deleteEnergyUseEquipmentAsync(energyUseEquipment: Array<IdbFacilityEnergyUseEquipment>) {
    for (let i = 0; i < energyUseEquipment.length; i++) {
      this.loadingService.setLoadingMessage('Deleting Energy UseEquipment (' + i + '/' + energyUseEquipment.length + ')...');
      await firstValueFrom(this.deleteWithObservable(energyUseEquipment[i].id));
    }
  }

  getByGuid(guid: string): IdbFacilityEnergyUseEquipment {
    let accountEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = this.accountEnergyUseEquipment.getValue();
    return accountEnergyUseEquipment.find(energyUseEquipment => {
      return energyUseEquipment.guid == guid;
    })
  }

  getByFacilityId(facilityId: string): Array<IdbFacilityEnergyUseEquipment> {
    let accountEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = this.accountEnergyUseEquipment.getValue();
    return accountEnergyUseEquipment.filter(energyUseEquipment => {
      return energyUseEquipment.facilityId == facilityId;
    })
  }

  getFacilityEnergyUseEquipmentCopy(facilityId: string): Array<IdbFacilityEnergyUseEquipment> {
    let facilityEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = this.getByFacilityId(facilityId);
    let facilityEnergyUseEquipmentCopy: Array<IdbFacilityEnergyUseEquipment> = JSON.parse(JSON.stringify(facilityEnergyUseEquipment));
    return facilityEnergyUseEquipmentCopy;
  }

  async deleteEnergyUseGroup(groupId: string){
    let accountEnergyUseEquipment: Array<IdbFacilityEnergyUseEquipment> = this.accountEnergyUseEquipment.getValue();
    let equipmentToDelete: Array<IdbFacilityEnergyUseEquipment> = accountEnergyUseEquipment.filter(equipment => { return equipment.energyUseGroupId == groupId });
    await this.deleteEnergyUseEquipmentAsync(equipmentToDelete);
  }
}
