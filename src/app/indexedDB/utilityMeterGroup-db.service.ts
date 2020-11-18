import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbFacility, IdbUtilityMeterGroup } from '../models/idb';
import { BehaviorSubject, Observable } from 'rxjs';
import { FacilitydbService } from './facility-db-service';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterGroupdbService {

    facilityMeterGroups: BehaviorSubject<Array<IdbUtilityMeterGroup>>;

    constructor(private dbService: NgxIndexedDBService, private facilityDbService: FacilitydbService) {
        this.facilityMeterGroups = new BehaviorSubject<Array<IdbUtilityMeterGroup>>(new Array());
        this.facilityDbService.selectedFacility.subscribe(() => {
            this.setFacilityMeterGroups();
        });
    }

    setFacilityMeterGroups() {
        let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        if (facility) {
            this.getAllByIndexRange('facilityId', facility.id).subscribe(meterGroups => {
                this.facilityMeterGroups.next(meterGroups);
            });
        }
    }
    getAll(): Observable<Array<IdbUtilityMeterGroup>> {
        return this.dbService.getAll('utilityMeterGroups');
    }

    getById(groupId: number): Observable<IdbUtilityMeterGroup> {
        return this.dbService.getByKey('utilityMeterGroups', groupId);
    }

    getByIndex(indexName: string, indexValue: number): Observable<IdbUtilityMeterGroup> {
        return this.dbService.getByIndex('utilityMeterGroups', indexName, indexValue);
    }

    getAllByIndexRange(indexName: string, indexValue: number | string): Observable<Array<IdbUtilityMeterGroup>> {
        let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
        return this.dbService.getAllByIndex('utilityMeterGroups', indexName, idbKeyRange);
    }

    count() {
        return this.dbService.count('utilityMeterGroups');
    }

    add(utilityMeterGroup: IdbUtilityMeterGroup): void {
        this.dbService.add('utilityMeterGroups', utilityMeterGroup).subscribe(() => {
            this.setFacilityMeterGroups();
        });
    }

    addFromImport(utilityMeterGroup: IdbUtilityMeterGroup): Observable<number> {
        return this.dbService.add('utilityMeterGroups', utilityMeterGroup);
    }

    update(utilityMeterGroup: IdbUtilityMeterGroup): void {
        this.dbService.update('utilityMeterGroups', utilityMeterGroup).subscribe(() => {
            this.setFacilityMeterGroups();
        });
    }

    deleteIndex(meterGroupId: number): void {
        this.dbService.delete('utilityMeterGroups', meterGroupId).subscribe(() => {
            this.setFacilityMeterGroups();
        });
    }

    getNewIdbUtilityMeterGroup(type: string, unit: string, name: string, facilityId: number, accountId: number): IdbUtilityMeterGroup {
        return {
            facilityId: facilityId,
            accountId: accountId,
            groupType: type,
            name: name,
            description: undefined,
            unit: unit,
            dateModified: undefined,
            factionOfTotalEnergy: undefined,
            // id: undefined
        }
    }
}
