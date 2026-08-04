import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { IdbPredictor } from '../models/idbModels/predictor';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LoadingService } from '../core-components/loading/loading.service';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
    providedIn: 'root'
})
export class PredictorDbService {

    facilityPredictors: BehaviorSubject<Array<IdbPredictor>>;
    accountPredictors: BehaviorSubject<Array<IdbPredictor>>;
    constructor(private dbService: NgxIndexedDBService,
        private loadingService: LoadingService,
        private indexedDbAccess: IndexedDbAccessService = new IndexedDbAccessService(dbService)) {
        this.facilityPredictors = new BehaviorSubject<Array<IdbPredictor>>(new Array());
        this.accountPredictors = new BehaviorSubject<Array<IdbPredictor>>(new Array());
    }

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

    async deleteAllFacilityPredictors(facilityId: string) {
        this.loadingService.setLoadingMessage('Deleting Facility Predictors...');
        await this.indexedDbAccess.deleteAllByIndex('predictor', 'facilityId', facilityId);
    }

    async deleteAllSelectedAccountPredictor() {
        let accountPredictors: Array<IdbPredictor> = this.accountPredictors.getValue();
        await this.deletePredictorsAsync(accountPredictors);
    }


    async deletePredictorsAsync(predictors: Array<IdbPredictor>) {
        for (let i = 0; i < predictors.length; i++) {
            this.loadingService.setLoadingMessage('Deleting Predictors (' + i + '/' + predictors.length + ')...');
            await firstValueFrom(this.deleteWithObservable(predictors[i].id));
        }
    }

    getByGuid(guid: string): IdbPredictor {
        let accountPredictors: Array<IdbPredictor> = this.accountPredictors.getValue();
        return accountPredictors.find(predictor => {
            return predictor.guid == guid;
        })
    }

    getByFacilityId(facilityId: string): Array<IdbPredictor> {
        let accountPredictors: Array<IdbPredictor> = this.accountPredictors.getValue();
        return accountPredictors.filter(predictor => {
            return predictor.facilityId == facilityId;
        })
    }

    getFacilityPredictorsCopy(facilityId: string): Array<IdbPredictor> {
        let facilityPredictors: Array<IdbPredictor> = this.getByFacilityId(facilityId);
        let facilityPredictorsCopy: Array<IdbPredictor> = JSON.parse(JSON.stringify(facilityPredictors));
        return facilityPredictorsCopy;
    }
}
