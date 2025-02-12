import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbFacility } from '../models/idbModels/facility';
import { IdbPredictorEntryDeprecated, PredictorDataDeprecated } from '../models/idbModels/deprecatedPredictors';

@Injectable({
    providedIn: 'root'
})
export class PredictordbServiceDeprecated {

    accountPredictorEntries: BehaviorSubject<Array<IdbPredictorEntryDeprecated>>;
    facilityPredictorEntries: BehaviorSubject<Array<IdbPredictorEntryDeprecated>>;
    facilityPredictors: BehaviorSubject<Array<PredictorDataDeprecated>>;
    constructor(private dbService: NgxIndexedDBService,
        private loadingService: LoadingService) {
        this.facilityPredictorEntries = new BehaviorSubject<Array<IdbPredictorEntryDeprecated>>(new Array());
        this.facilityPredictors = new BehaviorSubject<Array<PredictorDataDeprecated>>(new Array());
        this.accountPredictorEntries = new BehaviorSubject<Array<IdbPredictorEntryDeprecated>>(new Array());
    }

    getAll(): Observable<Array<IdbPredictorEntryDeprecated>> {
        return this.dbService.getAll('predictors');
    }

    async getAllAccountPredictors(accountId: string): Promise<Array<IdbPredictorEntryDeprecated>> {
        let allPredictors: Array<IdbPredictorEntryDeprecated> = await firstValueFrom(this.getAll());
        let predictors: Array<IdbPredictorEntryDeprecated> = allPredictors.filter(predictor => { return predictor.accountId == accountId });
        return predictors;
    }

    getById(predictorId: number): Observable<IdbPredictorEntryDeprecated> {
        return this.dbService.getByKey('predictors', predictorId);
    }

    getByIndex(indexName: string, indexValue: number): Observable<IdbPredictorEntryDeprecated> {
        return this.dbService.getByIndex('predictors', indexName, indexValue);
    }

    count() {
        return this.dbService.count('predictors');
    }

    deleteIndexWithObservable(predictorId: number): Observable<any> {
        return this.dbService.delete('predictors', predictorId)
    }

    async deleteAllFacilityPredictors(facilityId: string) {
        let accountPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.accountPredictorEntries.getValue();
        let facilityPredictorEntries: Array<IdbPredictorEntryDeprecated> = accountPredictorEntries.filter(entry => { return entry.facilityId == facilityId });
        await this.deletePredictorsAsync(facilityPredictorEntries);
    }

    async deleteAllSelectedAccountPredictors() {
        let accountPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.accountPredictorEntries.getValue();
        await this.deletePredictorsAsync(accountPredictorEntries);
    }

    async deletePredictorsAsync(accountPredictorEntries: Array<IdbPredictorEntryDeprecated>) {
        for (let i = 0; i < accountPredictorEntries.length; i++) {
            if (i % 25 == 0 || i == 1) {
                this.loadingService.setLoadingMessage('Deleting Predictors (' + i + '/' + accountPredictorEntries.length + ')...');
            }
            await firstValueFrom(this.deleteIndexWithObservable(accountPredictorEntries[i].id));
        }
    }

    async finishPredictorChanges(facility: IdbFacility) {
        let accountPredictorEntries: Array<IdbPredictorEntryDeprecated> = await this.getAllAccountPredictors(facility.accountId);
        this.accountPredictorEntries.next(accountPredictorEntries);
        let updatedFacilityPredictorEntries: Array<IdbPredictorEntryDeprecated> = accountPredictorEntries.filter(predictor => { return predictor.facilityId == facility.guid });
        this.facilityPredictorEntries.next(updatedFacilityPredictorEntries);
        if (updatedFacilityPredictorEntries.length > 0) {
            this.facilityPredictors.next(updatedFacilityPredictorEntries[0].predictors);
        } else {
            this.facilityPredictors.next([]);
        }
    }

    getAccountPerdictorsCopy(): Array<IdbPredictorEntryDeprecated> {
        let accountPredictorEntries: Array<IdbPredictorEntryDeprecated> = this.accountPredictorEntries.getValue();
        let predictorsCopy: Array<IdbPredictorEntryDeprecated> = JSON.parse(JSON.stringify(accountPredictorEntries));
        return predictorsCopy;
    }

}
