import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterDatadbService {

    constructor(private dbService: NgxIndexedDBService, private loadingService: LoadingService,
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

    async deleteAllFacilityMeterData(facilityId: string) {
        this.loadingService.setLoadingMessage('Deleting Facility Meter Data...');
        await this.indexedDbAccess.deleteAllByIndex('utilityMeterData', 'facilityId', facilityId);
    }

    async deleteMeterDataEntriesAsync(meterDataEntries: Array<IdbUtilityMeterData>) {
        for (let i = 0; i < meterDataEntries.length; i++) {
            if (i % 25 == 0 || i == 1) {
                this.loadingService.setLoadingMessage('Deleting Meter Data Entries (' + i + '/' + meterDataEntries.length + ')...');
            }
            await firstValueFrom(this.deleteWithObservable(meterDataEntries[i].id));
        }
    }

}
