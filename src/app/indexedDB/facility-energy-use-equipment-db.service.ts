import { Injectable } from '@angular/core';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { firstValueFrom, Observable } from 'rxjs';
import { IdbFacilityEnergyUseEquipment } from '../models/idbModels/facilityEnergyUseEquipment';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
  providedIn: 'root'
})
export class FacilityEnergyUseEquipmentDbService {

  constructor(private dbService: NgxIndexedDBService,
    private indexedDbAccess: IndexedDbAccessService) { }

  getAll(): Observable<Array<IdbFacilityEnergyUseEquipment>> {
    return this.dbService.getAll('facilityEnergyUseEquipment');
  }

  async getAllAccountEnergyUseEquipment(accountId: string): Promise<Array<IdbFacilityEnergyUseEquipment>> {
    return this.indexedDbAccess.getAllByIndex<IdbFacilityEnergyUseEquipment>(
      'facilityEnergyUseEquipment',
      'accountId',
      accountId
    );
  }

  getById(energyUseEquipmentId: number): Observable<IdbFacilityEnergyUseEquipment> {
    return this.dbService.getByKey('facilityEnergyUseEquipment', energyUseEquipmentId);
  }

  getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbFacilityEnergyUseEquipment> {
    return this.dbService.getByIndex('facilityEnergyUseEquipment', indexName, indexValue);
  }

  getStoredByGuid(guid: string): Promise<IdbFacilityEnergyUseEquipment | undefined> {
    return this.indexedDbAccess.getByGuid<IdbFacilityEnergyUseEquipment>('facilityEnergyUseEquipment', guid);
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
    await this.indexedDbAccess.deleteAllByIndex('facilityEnergyUseEquipment', 'facilityId', facilityId);
  }


  async deleteEnergyUseEquipmentAsync(energyUseEquipment: Array<IdbFacilityEnergyUseEquipment>) {
    for (let i = 0; i < energyUseEquipment.length; i++) {
      await firstValueFrom(this.deleteWithObservable(energyUseEquipment[i].id));
    }
  }

  async deleteEnergyUseGroup(groupId: string){
    const equipmentToDelete = (await firstValueFrom(this.getAll()))
      .filter(equipment => equipment.energyUseGroupId === groupId);
    await this.deleteEnergyUseEquipmentAsync(equipmentToDelete);
  }
}
