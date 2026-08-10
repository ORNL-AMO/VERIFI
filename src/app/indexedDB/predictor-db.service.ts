import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IdbPredictor } from '../models/idbModels/predictor';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
    providedIn: 'root'
})
export class PredictorDbService {

    constructor(private dbService: NgxIndexedDBService,
        private indexedDbAccess: IndexedDbAccessService) { }

    getAll(): Observable<Array<IdbPredictor>> {
        return this.dbService.getAll('predictor');
    }

    async getAllAccountPredictors(accountId: string): Promise<Array<IdbPredictor>> {
        return this.indexedDbAccess.getAllByIndex<IdbPredictor>('predictor', 'accountId', accountId);
    }

    getById(predictorId: number): Observable<IdbPredictor> {
        return this.dbService.getByKey('predictor', predictorId);
    }

    getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbPredictor> {
        return this.dbService.getByIndex('predictor', indexName, indexValue);
    }

    getStoredByGuid(guid: string): Promise<IdbPredictor | undefined> {
        return this.indexedDbAccess.getByGuid<IdbPredictor>('predictor', guid);
    }

    getStoredFacilityPredictors(facilityId: string): Promise<Array<IdbPredictor>> {
        return this.indexedDbAccess.getAllByIndex<IdbPredictor>('predictor', 'facilityId', facilityId);
    }

    count() {
        return this.dbService.count('predictor');
    }

    addWithObservable(predictor: IdbPredictor): Observable<IdbPredictor> {
        return this.dbService.add('predictor', predictor);
    }

    updateWithObservable(predictor: IdbPredictor): Observable<IdbPredictor> {
        predictor.modifiedDate = new Date();
        return this.dbService.update('predictor', predictor);
    }

    deleteWithObservable(predictorId: number): Observable<any> {
        return this.dbService.delete('predictor', predictorId)
    }
}
