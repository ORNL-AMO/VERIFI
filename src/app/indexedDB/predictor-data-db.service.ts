import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { IdbPredictorData } from '../models/idbModels/predictorData';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { LoadingService } from '../core-components/loading/loading.service';

@Injectable({
    providedIn: 'root'
})
export class PredictorDataDbService {

    facilityPredictorData: BehaviorSubject<Array<IdbPredictorData>>;
    accountPredictorData: BehaviorSubject<Array<IdbPredictorData>>;
    constructor(private dbService: NgxIndexedDBService,
        private loadingService: LoadingService) {
        this.facilityPredictorData = new BehaviorSubject<Array<IdbPredictorData>>(new Array());
        this.accountPredictorData = new BehaviorSubject<Array<IdbPredictorData>>(new Array());
    }

    getAll(): Observable<Array<IdbPredictorData>> {
        return this.dbService.getAll('predictorData');
    }

    async getAllAccountPredictorData(accountId: string): Promise<Array<IdbPredictorData>> {
        let allPredictors: Array<IdbPredictorData> = await firstValueFrom(this.getAll())
        let accountPredictors: Array<IdbPredictorData> = allPredictors.filter(predictor => { return predictor.accountId == accountId });
        return accountPredictors;
    }

    getById(predictorDataId: number): Observable<IdbPredictorData> {
        return this.dbService.getByKey('predictorData', predictorDataId);
    }

    getByIndex(indexName: string, indexValue: number): Observable<IdbPredictorData> {
        return this.dbService.getByIndex('predictorData', indexName, indexValue);
    }

    count() {
        return this.dbService.count('predictorData');
    }

    addWithObservable(predictorData: IdbPredictorData): Observable<IdbPredictorData> {
        return this.dbService.add('predictorData', predictorData);
    }

    updateWithObservable(predictorData: IdbPredictorData): Observable<IdbPredictorData> {
        predictorData.modifiedDate = new Date();
        return this.dbService.update('predictorData', predictorData);
    }

    deleteIndexWithObservable(predictorDataId: number): Observable<any> {
        return this.dbService.delete('predictorData', predictorDataId)
    }

    async deleteAllFacilityPredictorData(facilityId: string) {
        let accountPredictorData: Array<IdbPredictorData> = this.accountPredictorData.getValue();
        let facilityPredictorData: Array<IdbPredictorData> = accountPredictorData.filter(predictor => { return predictor.facilityId == facilityId });
        await this.deletePredictorDataAsync(facilityPredictorData);
    }

    async deleteAllSelectedAccountPredictorData() {
        let accountPredictorData: Array<IdbPredictorData> = this.accountPredictorData.getValue();
        await this.deletePredictorDataAsync(accountPredictorData);
    }


    async deletePredictorDataAsync(predictorData: Array<IdbPredictorData>) {
        for (let i = 0; i < predictorData.length; i++) {
            this.loadingService.setLoadingMessage('Deleting Predictor Data (' + i + '/' + predictorData.length + ')...');
            await firstValueFrom(this.deleteIndexWithObservable(predictorData[i].id));
        }
    }

    getByPredictorId(predictorGuid: string): Array<IdbPredictorData> {
        let predictorData: Array<IdbPredictorData> = this.accountPredictorData.getValue();
        return predictorData.filter(predictor => {
            return predictor.predictorId == predictorGuid;
        });
    }

    getByGuid(predictorDataGuid: string): IdbPredictorData {
        let predictorData: Array<IdbPredictorData> = this.accountPredictorData.getValue();
        return predictorData.find(predictor => {
            return predictor.guid == predictorDataGuid;
        });
    }

    getByFacilityId(facilityGuid: string): Array<IdbPredictorData> {
        let predictorData: Array<IdbPredictorData> = this.accountPredictorData.getValue();
        return predictorData.filter(predictor => {
            return predictor.facilityId == facilityGuid;
        });
    }
}
