import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbUtilityMeterGroup } from '../models/idb';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterGroupdbService {
    constructor(private dbService: NgxIndexedDBService) { }

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

    add(utilityMeterGroup: IdbUtilityMeterGroup): Observable<any> {
        return this.dbService.add('utilityMeterGroups', utilityMeterGroup);
    }

    update(utilityMeterGroup: IdbUtilityMeterGroup): Observable<any> {
        return this.dbService.update('utilityMeterGroups', utilityMeterGroup);
    }

    deleteIndex(meterGroupId: number): Observable<any> {
        return this.dbService.delete('utilityMeterGroups', meterGroupId);
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
