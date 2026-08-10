import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IdbUtilityMeter } from '../models/idbModels/utilityMeter';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterdbService {

    constructor(private dbService: NgxIndexedDBService,
        private indexedDbAccess: IndexedDbAccessService) { }

    getAll(): Observable<Array<IdbUtilityMeter>> {
        return this.dbService.getAll('utilityMeter');
    }

    async getAllAccountMeters(accountId: string): Promise<Array<IdbUtilityMeter>> {
        return this.indexedDbAccess.getAllByIndex<IdbUtilityMeter>('utilityMeter', 'accountId', accountId);
    }

    getById(meterId: number): Observable<IdbUtilityMeter> {
        return this.dbService.getByKey('utilityMeter', meterId);
    }

    getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbUtilityMeter> {
        return this.dbService.getByIndex('utilityMeter', indexName, indexValue);
    }

    getStoredByGuid(guid: string): Promise<IdbUtilityMeter | undefined> {
        return this.indexedDbAccess.getByGuid<IdbUtilityMeter>('utilityMeter', guid);
    }

    getStoredFacilityMeters(facilityId: string): Promise<Array<IdbUtilityMeter>> {
        return this.indexedDbAccess.getAllByIndex<IdbUtilityMeter>('utilityMeter', 'facilityId', facilityId);
    }

    count() {
        return this.dbService.count('utilityMeter');
    }

    addWithObservable(utilityMeter: IdbUtilityMeter): Observable<IdbUtilityMeter> {
        utilityMeter.visible = true;
        return this.dbService.add('utilityMeter', utilityMeter);
    }

    updateWithObservable(utilityMeter: IdbUtilityMeter): Observable<IdbUtilityMeter> {
        return this.dbService.update('utilityMeter', utilityMeter);
    }

    deleteIndexWithObservable(utilityMeterId: number): Observable<any> {
        return this.dbService.delete('utilityMeter', utilityMeterId)
    }
}
