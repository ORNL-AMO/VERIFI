import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IdbUtilityMeterGroup } from '../models/idbModels/utilityMeterGroup';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterGroupdbService {

    constructor(private dbService: NgxIndexedDBService,
        private indexedDbAccess: IndexedDbAccessService) { }

    getAll(): Observable<Array<IdbUtilityMeterGroup>> {
        return this.dbService.getAll('utilityMeterGroups');
    }

    async getAllAccountMeterGroups(accountId: string): Promise<Array<IdbUtilityMeterGroup>> {
        return this.indexedDbAccess.getAllByIndex<IdbUtilityMeterGroup>(
            'utilityMeterGroups',
            'accountId',
            accountId
        );
    }

    getById(groupId: number): Observable<IdbUtilityMeterGroup> {
        return this.dbService.getByKey('utilityMeterGroups', groupId);
    }

    getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbUtilityMeterGroup> {
        return this.dbService.getByIndex('utilityMeterGroups', indexName, indexValue);
    }

    getStoredByGuid(guid: string): Promise<IdbUtilityMeterGroup | undefined> {
        return this.indexedDbAccess.getByGuid<IdbUtilityMeterGroup>('utilityMeterGroups', guid);
    }

    getStoredFacilityGroups(facilityId: string): Promise<Array<IdbUtilityMeterGroup>> {
        return this.indexedDbAccess.getAllByIndex<IdbUtilityMeterGroup>(
            'utilityMeterGroups',
            'facilityId',
            facilityId
        );
    }

    count() {
        return this.dbService.count('utilityMeterGroups');
    }

    addWithObservable(utilityMeterGroup: IdbUtilityMeterGroup): Observable<IdbUtilityMeterGroup> {
        return this.dbService.add('utilityMeterGroups', utilityMeterGroup);
    }

    updateWithObservable(utilityMeterGroup: IdbUtilityMeterGroup): Observable<IdbUtilityMeterGroup> {
        return this.dbService.update('utilityMeterGroups', utilityMeterGroup);
    }

    deleteWithObservable(meterGroupId: number): Observable<any> {
        return this.dbService.delete('utilityMeterGroups', meterGroupId);
    }
}
