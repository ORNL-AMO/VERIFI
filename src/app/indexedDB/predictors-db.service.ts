import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IdbFacility, IdbPredictorEntry, PredictorData } from '../models/idb';
import { FacilitydbService } from './facility-db.service';
import * as _ from 'lodash';

@Injectable({
    providedIn: 'root'
})
export class PredictordbService {

    facilityPredictorEntries: BehaviorSubject<Array<IdbPredictorEntry>>;
    facilityPredictors: BehaviorSubject<Array<PredictorData>>;
    constructor(private dbService: NgxIndexedDBService, private facilityDbService: FacilitydbService) {
        this.facilityPredictorEntries = new BehaviorSubject<Array<IdbPredictorEntry>>(new Array());
        this.facilityPredictors = new BehaviorSubject<Array<PredictorData>>(new Array());
        this.facilityDbService.selectedFacility.subscribe(() => {
            this.facilityPredictors.next(new Array());
            this.facilityPredictorEntries.next(new Array());
            this.setFacilityPredictors();
        });
    }

    setFacilityPredictors() {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        if (selectedFacility) {
            this.getAllByIndexRange('facilityId', selectedFacility.id).subscribe(facilityPredictorEntries => {
                if (facilityPredictorEntries.length != 0) {
                    this.facilityPredictorEntries.next(facilityPredictorEntries);
                    if (facilityPredictorEntries.length != 0) {
                        this.facilityPredictors.next(facilityPredictorEntries[0].predictors);
                    }
                } else {
                    this.addNewPredictorEntry();
                }
            });
        }
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

    add(predictor: IdbPredictorEntry): void {
        this.dbService.add('predictors', predictor).subscribe(() => {
            this.setFacilityPredictors();
            // this.setAllFacilities();
            // this.setAccountFacilities();
        });
    }

    update(values: IdbPredictorEntry): void {
        this.dbService.update('predictors', values).subscribe(() => {
            this.setFacilityPredictors();
            // this.setAllFacilities();
            // this.setAccountFacilities();
        });
    }

    updateOnImport(values: IdbPredictorEntry): Observable<any> {
        return this.dbService.update('predictors', values);
    }


    deleteById(predictorId: number): void {
        this.dbService.delete('predictors', predictorId).subscribe(() => {
            this.setFacilityPredictors();
            // this.setAccountFacilities();
        });
    }

    deleteAllFacilityPredictors(facilityId: number): void {
        this.getAllByIndexRange('facilityId', facilityId).subscribe(facilityPredictorEntries => {
            for(let i=0; i<facilityPredictorEntries.length; i++) {
                this.dbService.delete('predictors', facilityPredictorEntries[i].id);
            }
        });
    }

    deleteAllAccountPredictors(accountId: number): void {
        this.getAllByIndexRange('accountId', accountId).subscribe(accountPredictorEntries => {
            for(let i=0; i<accountPredictorEntries.length; i++) {
                this.dbService.delete('predictors', accountPredictorEntries[i].id);
            }
        });
    }

    getNewIdbPredictorEntry(facilityId: number, accountId: number, date: Date): IdbPredictorEntry {
        return {
            facilityId: facilityId,
            accountId: accountId,
            date: date,
            predictors: new Array(),
        }
    }

    addNewPredictor() {
        let newPredictor: PredictorData = this.getNewPredictor();
        let facilityPredictorEntries: Array<IdbPredictorEntry> = this.facilityPredictorEntries.getValue();
        facilityPredictorEntries.forEach(predictorEntry => {
            predictorEntry.predictors.push(newPredictor);
            this.update(predictorEntry);
        });
    }

    async importNewPredictor(newPredictor: PredictorData) {
        let facilityPredictorEntries: Array<IdbPredictorEntry> = this.facilityPredictorEntries.getValue();
        await facilityPredictorEntries.forEach(predictorEntry => {
            predictorEntry.predictors.push(newPredictor);
            this.updateOnImport(predictorEntry);
        });
    }

    getNewPredictor(): PredictorData {
        let facilityPredictors: Array<PredictorData> = this.facilityPredictors.getValue();
        return {
            name: 'Predictor #' + (facilityPredictors.length + 1),
            amount: undefined,
            unit: undefined,
            description: undefined,
            id: Math.random().toString(36).substr(2, 9),
        }
    }


    addNewPredictorEntry(): void {
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
            facilityId: selectedFacility.id,
            accountId: selectedFacility.accountId,
            predictors: predictors,
            date: newPredictorDate
        };
        this.add(newPredictorEntry);
    }

    getNewImportPredictorEntry(headers: Array<string>, dataRow: Array<any>, missingPredictors: Array<PredictorData>): IdbPredictorEntry {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        let newPredictorDate: Date = new Date(dataRow[0]);
        let predictors: Array<PredictorData> = JSON.parse(JSON.stringify(this.facilityPredictors.getValue()))
        //not working unless I use copy...
        let combinedPredictors: Array<PredictorData> = JSON.parse(JSON.stringify(predictors.concat(missingPredictors)));
        for (let i = 0; i < combinedPredictors.length; i++) {
            let dataIndex: number = headers.findIndex(header => { return header == combinedPredictors[i].name });
            if (dataIndex != -1) {
                combinedPredictors[i].amount = dataRow[dataIndex];
            }
        }
        let newPredictorEntry: IdbPredictorEntry = {
            facilityId: selectedFacility.id,
            accountId: selectedFacility.accountId,
            predictors: combinedPredictors,
            date: newPredictorDate
        };
        return newPredictorEntry;
    }

    importNewPredictorEntries(entries: Array<IdbPredictorEntry>) {
        entries.forEach(entry => {
            this.add(entry);
        });
    }



    updateFacilityPredictorEntries(updatedPredictors: Array<PredictorData>) {
        let facilityPredictorEntries: Array<IdbPredictorEntry> = this.facilityPredictorEntries.getValue();
        //iterate entries
        facilityPredictorEntries.forEach(entry => {
            //update entry predictors
            entry.predictors = this.updateEntryPredictors(entry.predictors, updatedPredictors);
            this.update(entry);
        });
    }

    updateEntryPredictors(entryPredictors: Array<PredictorData>, updatedPredictors: Array<PredictorData>): Array<PredictorData> {
        //remove deleted predictors
        let newPredictorIds: Array<string> = updatedPredictors.map(predictor => { return predictor.id });
        entryPredictors = entryPredictors.filter(predictor => {
            return newPredictorIds.includes(predictor.id);
        });
        //update name and unit
        entryPredictors = _.map(entryPredictors, (predictor) => {
            let updatedPredictor: PredictorData = updatedPredictors.find(val => { return val.id == predictor.id });
            predictor.name = updatedPredictor.name;
            predictor.unit = updatedPredictor.unit;
            return predictor;
        });
        return entryPredictors;
    }
}
