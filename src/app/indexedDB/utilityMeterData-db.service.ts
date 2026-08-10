import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterDatadbService {

    constructor(private dbService: NgxIndexedDBService,
        private indexedDbAccess: IndexedDbAccessService) { }

    getAll(): Observable<Array<IdbUtilityMeterData>> {
        return this.dbService.getAll('utilityMeterData');
    }

    async getAllAccountMeterData(accountId: string): Promise<Array<IdbUtilityMeterData>> {
        return this.indexedDbAccess.getAllByIndex<IdbUtilityMeterData>(
            'utilityMeterData',
            'accountId',
            accountId
        );
    }

    getById(meterDataId: number): Observable<IdbUtilityMeterData> {
        return this.dbService.getByKey('utilityMeterData', meterDataId);
    }

    getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbUtilityMeterData> {
        return this.dbService.getByIndex('utilityMeterData', indexName, indexValue);
    }

    getStoredByGuid(guid: string): Promise<IdbUtilityMeterData | undefined> {
        return this.indexedDbAccess.getByGuid<IdbUtilityMeterData>('utilityMeterData', guid);
    }

    getStoredMeterData(meterId: string): Promise<Array<IdbUtilityMeterData>> {
        return this.indexedDbAccess.getAllByIndex<IdbUtilityMeterData>('utilityMeterData', 'meterId', meterId);
    }

    getStoredFacilityMeterData(facilityId: string): Promise<Array<IdbUtilityMeterData>> {
        return this.indexedDbAccess.getAllByIndex<IdbUtilityMeterData>(
            'utilityMeterData',
            'facilityId',
            facilityId
        );
    }

    count() {
        return this.dbService.count('utilityMeterData');
    }

    addWithObservable(meterData: IdbUtilityMeterData): Observable<IdbUtilityMeterData> {
        meterData.dbDate = new Date();
        return this.dbService.add('utilityMeterData', meterData);
    }

    updateWithObservable(meterData: IdbUtilityMeterData): Observable<IdbUtilityMeterData> {
        meterData.dbDate = new Date();
        return this.dbService.update('utilityMeterData', meterData);
    }

    deleteWithObservable(meterDataId: number): Observable<any> {
        return this.dbService.delete('utilityMeterData', meterDataId);
    }
}
