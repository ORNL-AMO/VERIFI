import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IdbFacility } from '../models/idbModels/facility';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
    providedIn: 'root'
})
export class FacilitydbService {

    constructor(private dbService: NgxIndexedDBService,
        private indexedDbAccess: IndexedDbAccessService) { }

    getAll(): Observable<Array<IdbFacility>> {
        return this.dbService.getAll('facilities');
    }

    async getAllAccountFacilities(accountId: string): Promise<Array<IdbFacility>> {
        return this.indexedDbAccess.getAllByIndex<IdbFacility>('facilities', 'accountId', accountId);
    }

    getById(facilityId: number): Observable<IdbFacility> {
        return this.dbService.getByKey('facilities', facilityId);
    }

    getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbFacility> {
        return this.dbService.getByIndex('facilities', indexName, indexValue);
    }

    getStoredByGuid(facilityGuid: string): Promise<IdbFacility | undefined> {
        return this.indexedDbAccess.getByGuid<IdbFacility>('facilities', facilityGuid);
    }

    count() {
        return this.dbService.count('facilities');
    }

    addWithObservable(facility: IdbFacility): Observable<IdbFacility> {
        facility.modifiedDate = new Date();
        return this.dbService.add('facilities', facility);
    }

    deleteWithObservable(facilityId: number): Observable<any> {
        return this.dbService.delete('facilities', facilityId);
    }


    updateWithObservable(values: IdbFacility): Observable<IdbFacility> {
        values.modifiedDate = new Date();
        return this.dbService.update('facilities', values);
    }
}
