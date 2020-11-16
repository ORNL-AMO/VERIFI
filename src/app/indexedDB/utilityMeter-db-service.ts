import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbUtilityMeter } from '../models/idb';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterdbService {
    constructor(private dbService: NgxIndexedDBService) { }

    getAll(): Promise<Array<IdbUtilityMeter>> {
        return this.dbService.getAll('utilityMeter');
    }

    getById(meterId: number): Promise<IdbUtilityMeter> {
        return this.dbService.getByKey('utilityMeter', meterId);
    }

    getByIndex(indexName: string, indexValue: number): Promise<IdbUtilityMeter> {
        return this.dbService.getByIndex('utilityMeter', indexName, indexValue);
    }

    getAllByIndexRange(indexName: string, indexValue: number | string): Promise<Array<IdbUtilityMeter>> {
        let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
        return this.dbService.getAllByIndex('utilityMeter', indexName, idbKeyRange);
    }

    count() {
        return this.dbService.count('utilityMeter');
    }

    add(utilityMeter: IdbUtilityMeter): Promise<any> {
        return this.dbService.add('utilityMeter', utilityMeter);
    }

    update(values: IdbUtilityMeter): Promise<any> {
        return this.dbService.update('utilityMeter', values);
    }

    deleteIndex(utilityMeterId: number): Promise<any> {
        return this.dbService.delete('utilityMeter', utilityMeterId);
    }

    getNewIdbUtilityMeter(facilityId: number, accountId: number): IdbUtilityMeter {
        return {
            facilityId: facilityId,
            accountId: accountId,
            // id: undefined,
            groupId: undefined,
            meterNumber: undefined,
            accountNumber: undefined,
            type: undefined,
            phase: undefined,
            unit: undefined,
            heatCapacity: undefined,
            siteToSource: undefined,
            name: undefined,
            location: undefined,
            supplier: undefined,
            notes: undefined
        }
    }
}
