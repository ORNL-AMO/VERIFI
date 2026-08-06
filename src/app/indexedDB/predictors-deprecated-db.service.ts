import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbPredictorEntryDeprecated } from '../models/idbModels/deprecatedPredictors';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
    providedIn: 'root'
})
export class PredictordbServiceDeprecated {

    constructor(private dbService: NgxIndexedDBService,
        private loadingService: LoadingService,
        private indexedDbAccess: IndexedDbAccessService) { }

    getAll(): Observable<Array<IdbPredictorEntryDeprecated>> {
        return this.dbService.getAll('predictors');
    }

    async getAllAccountPredictors(accountId: string): Promise<Array<IdbPredictorEntryDeprecated>> {
        return this.indexedDbAccess.getAllByIndex<IdbPredictorEntryDeprecated>(
            'predictors',
            'accountId',
            accountId
        );
    }

    getById(predictorId: number): Observable<IdbPredictorEntryDeprecated> {
        return this.dbService.getByKey('predictors', predictorId);
    }

    getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbPredictorEntryDeprecated> {
        return this.dbService.getByIndex('predictors', indexName, indexValue);
    }

    getStoredByGuid(guid: string): Promise<IdbPredictorEntryDeprecated | undefined> {
        return this.indexedDbAccess.getByGuid<IdbPredictorEntryDeprecated>('predictors', guid);
    }

    getStoredFacilityPredictors(facilityId: string): Promise<Array<IdbPredictorEntryDeprecated>> {
        return this.indexedDbAccess.getAllByIndex<IdbPredictorEntryDeprecated>(
            'predictors',
            'facilityId',
            facilityId
        );
    }

    count() {
        return this.dbService.count('predictors');
    }

    deleteIndexWithObservable(predictorId: number): Observable<any> {
        return this.dbService.delete('predictors', predictorId)
    }

    async deleteAllFacilityPredictors(facilityId: string) {
        this.loadingService.setLoadingMessage('Deleting Legacy Facility Predictors...');
        await this.indexedDbAccess.deleteAllByIndex('predictors', 'facilityId', facilityId);
    }

}
