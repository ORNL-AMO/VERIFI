import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IdbAccount, IdbFacility, IdbPredictorEntry, PredictorData } from '../models/idb';
import { FacilitydbService } from './facility-db.service';
import * as _ from 'lodash';
import { AccountdbService } from './account-db.service';

@Injectable({
    providedIn: 'root'
})
export class PredictordbService {

    accountPredictorEntries: BehaviorSubject<Array<IdbPredictorEntry>>;
    facilityPredictorEntries: BehaviorSubject<Array<IdbPredictorEntry>>;
    facilityPredictors: BehaviorSubject<Array<PredictorData>>;
    constructor(private dbService: NgxIndexedDBService, private facilityDbService: FacilitydbService, private accountDbService: AccountdbService) {
        this.facilityPredictorEntries = new BehaviorSubject<Array<IdbPredictorEntry>>(new Array());
        this.facilityPredictors = new BehaviorSubject<Array<PredictorData>>(new Array());
        this.accountPredictorEntries = new BehaviorSubject<Array<IdbPredictorEntry>>(new Array());
    }

    getAll(): Observable<Array<IdbPredictorEntry>> {
        return this.dbService.getAll('predictors');
    }

    getById(predictorId: number): Observable<IdbPredictorEntry> {
        return this.dbService.getByKey('predictors', predictorId);
    }

    getByIndex(indexName: string, indexValue: number): Observable<IdbPredictorEntry> {
        return this.dbService.getByIndex('predictors', indexName, indexValue);
    }

    getAllByIndexRange(indexName: string, indexValue: number | string): Observable<Array<IdbPredictorEntry>> {
        let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
        return this.dbService.getAllByIndex('predictors', indexName, idbKeyRange);
    }

    count() {
        return this.dbService.count('predictors');
    }

    updateOnImport(values: IdbPredictorEntry): Observable<any> {
        values.dbDate = new Date();
        return this.dbService.update('predictors', values);
    }

    deleteIndexWithObservable(predictorId: number): Observable<any> {
        return this.dbService.delete('predictors', predictorId)
    }

    async deleteAllFacilityPredictors(facilityId: string) {
        let accountPredictorEntries: Array<IdbPredictorEntry> = this.accountPredictorEntries.getValue();
        let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => { return entry.facilityId == facilityId });
        await this.deletePredictorsAsync(facilityPredictorEntries);
    }

    async deleteAllSelectedAccountPredictors() {
        let accountPredictorEntries: Array<IdbPredictorEntry> = this.accountPredictorEntries.getValue();
        await this.deletePredictorsAsync(accountPredictorEntries);
    }

    async deletePredictorsAsync(accountPredictorEntries: Array<IdbPredictorEntry>) {
        for (let i = 0; i < accountPredictorEntries.length; i++) {
            await this.deleteIndexWithObservable(accountPredictorEntries[i].id).toPromise();
        }
    }

    getNewIdbPredictorEntry(facilityId: string, accountId: string, date: Date): IdbPredictorEntry {
        return {
            facilityId: facilityId,
            accountId: accountId,
            guid: Math.random().toString(36).substr(2, 9),
            date: date,
            predictors: new Array(),
        }
    }

    async importNewPredictor(newPredictor: PredictorData) {
        let facilityPredictorEntries: Array<IdbPredictorEntry> = this.facilityPredictorEntries.getValue();
        for (let i = 0; i < facilityPredictorEntries.length; i++) {
            facilityPredictorEntries[i].predictors.push(newPredictor);
            await this.updateOnImport(facilityPredictorEntries[i]);
            console.log('updated predictor');
        }
    }

    getNewPredictor(facilityPredictors: Array<PredictorData>): PredictorData {
        return {
            name: 'Predictor #' + (facilityPredictors.length + 1),
            amount: undefined,
            unit: undefined,
            description: undefined,
            id: Math.random().toString(36).substr(2, 9),
        }
    }


    getNewPredictorEntry(): IdbPredictorEntry {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        let newPredictorDate: Date = new Date();
        let facilityPredictorEntries: Array<IdbPredictorEntry> = this.facilityPredictorEntries.getValue();
        if (facilityPredictorEntries.length != 0) {
            //find last date and add a month
            let dates: Array<Date> = facilityPredictorEntries.map(entry => { return new Date(entry.date) });
            let maxDateEntry: Date = _.max(dates);
            newPredictorDate = new Date(maxDateEntry);
            newPredictorDate.setMonth(newPredictorDate.getMonth() + 1);
        }

        let predictors: Array<PredictorData> = JSON.parse(JSON.stringify(this.facilityPredictors.getValue()))
        predictors.forEach(predictor => {
            predictor.amount = undefined;
        });

        let newPredictorEntry: IdbPredictorEntry = {
            facilityId: selectedFacility.guid,
            accountId: selectedFacility.accountId,
            guid: Math.random().toString(36).substr(2, 9),
            predictors: predictors,
            date: newPredictorDate
        };
        return newPredictorEntry;
    }

    async importNewPredictorEntries(entries: Array<IdbPredictorEntry>) {
        for (let index = 0; index < entries.length; index++) {
            let entry: IdbPredictorEntry = entries[index];
            await this.addWithObservable(entry).toPromise();
        }
    }

    async updateFacilityPredictorEntries(updatedPredictors: Array<PredictorData>) {
        let facilityPredictorEntries: Array<IdbPredictorEntry> = this.facilityPredictorEntries.getValue();
        let faclilityPredictors: Array<PredictorData> = this.facilityPredictors.getValue();
        let facilityPredictorIds: Array<string> = faclilityPredictors.map(predictor => { return predictor.id });
        //track new predictors to add
        let newPredictors: Array<PredictorData> = new Array();
        updatedPredictors.forEach(predictor => {
            if (!facilityPredictorIds.includes(predictor.id)) {
                newPredictors.push(predictor);
            }
        });

        //iterate entries
        for (let index = 0; index < facilityPredictorEntries.length; index++) {
            facilityPredictorEntries[index].predictors = this.updateEntryPredictors(facilityPredictorEntries[index].predictors, updatedPredictors);
            for (let newIndex = 0; newIndex < newPredictors.length; newIndex++) {
                facilityPredictorEntries[index].predictors.push(newPredictors[newIndex]);
            }
            await this.updateWithObservable(facilityPredictorEntries[index]).toPromise();
        }
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        let accountPredictorEntries: Array<IdbPredictorEntry> = await this.getAllByIndexRange('accountId', selectedFacility.accountId).toPromise()
        this.accountPredictorEntries.next(accountPredictorEntries);
        let updatedFacilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(predictor => { return predictor.facilityId == selectedFacility.guid });
        this.facilityPredictorEntries.next(updatedFacilityPredictorEntries);
        this.facilityPredictors.next(updatedPredictors);
    }

    updateEntryPredictors(entryPredictors: Array<PredictorData>, updatedPredictors: Array<PredictorData>): Array<PredictorData> {
        //remove deleted predictors
        let newPredictorIds: Array<string> = updatedPredictors.map(predictor => { return predictor.id });
        entryPredictors = entryPredictors.filter(predictor => {
            return newPredictorIds.includes(predictor.id);
        });
        //update name and unit
        entryPredictors = _.map(entryPredictors, (predictor: PredictorData) => {
            let updatedPredictor: PredictorData = updatedPredictors.find(val => { return val.id == predictor.id });
            predictor.name = updatedPredictor.name;
            predictor.unit = updatedPredictor.unit;
            predictor.production = updatedPredictor.production;
            predictor.productionInAnalysis = updatedPredictor.production;
            return predictor;
        });
        return entryPredictors;
    }


    updateWithObservable(values: IdbPredictorEntry): Observable<any> {
        values.date = new Date(values.date);
        values.dbDate = new Date();
        return this.dbService.update('predictors', values)
    }

    addWithObservable(predictor: IdbPredictorEntry): Observable<IdbPredictorEntry> {
        predictor.date = new Date(predictor.date);
        predictor.dbDate = new Date();
        return this.dbService.add('predictors', predictor);
    }

    getAccountPerdictorsCopy(): Array<IdbPredictorEntry> {
        let accountPredictorEntries: Array<IdbPredictorEntry> = this.accountPredictorEntries.getValue();
        let predictorsCopy: Array<IdbPredictorEntry> = JSON.parse(JSON.stringify(accountPredictorEntries));
        return predictorsCopy;
    }

}
