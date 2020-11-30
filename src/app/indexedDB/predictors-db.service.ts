import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IdbFacility, IdbPredictor } from '../models/idb';
import { FacilitydbService } from './facility-db.service';

@Injectable({
    providedIn: 'root'
})
export class PredictordbService {

    facilityPredictors: BehaviorSubject<Array<IdbPredictor>>
    constructor(private dbService: NgxIndexedDBService, private facilityDbService: FacilitydbService) {
        this.facilityPredictors = new BehaviorSubject<Array<IdbPredictor>>(new Array());
        this.facilityDbService.selectedFacility.subscribe(() => {
            this.setFacilityPredictors();
        });
    }

    setFacilityPredictors() {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        if (selectedFacility) {
            this.getAllByIndexRange('facilityId', selectedFacility.id).subscribe(facilityPredictors => {
                this.facilityPredictors.next(facilityPredictors);
            });
        }
    }


    getAll(): Observable<Array<IdbPredictor>> {
        return this.dbService.getAll('predictors');
    }

    getById(predictorId: number): Observable<IdbPredictor> {
        return this.dbService.getByKey('predictors', predictorId);
    }

    getByIndex(indexName: string, indexValue: number): Observable<IdbPredictor> {
        return this.dbService.getByIndex('predictors', indexName, indexValue);
    }

    getAllByIndexRange(indexName: string, indexValue: number | string): Observable<Array<IdbPredictor>> {
        let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
        return this.dbService.getAllByIndex('predictors', indexName, idbKeyRange);
    }

    count() {
        return this.dbService.count('predictors');
    }

    add(predictor: IdbPredictor): void {
        this.dbService.add('predictors', predictor).subscribe(() => {
            this.setFacilityPredictors();
            // this.setAllFacilities();
            // this.setAccountFacilities();
        });
    }

    update(values: IdbPredictor): void {
        this.dbService.update('predictors', values).subscribe(() => {
            this.setFacilityPredictors();
            // this.setAllFacilities();
            // this.setAccountFacilities();
        });
    }

    deleteById(predictorId: number): void {
        this.dbService.delete('predictors', predictorId).subscribe(() => {
            this.setFacilityPredictors();
            // this.setAccountFacilities();
        });
    }



    // async add(name, facilityid, accountid, date) {

    //     return this.dbService.add('predictors', {
    //         facilityid: facilityid,
    //         accountid: accountid,
    //         name: name,
    //         desc: '',
    //         unit: '',
    //         date: date,
    //         amount: 0
    //     });
    // }

    // update(values) {
    //     return this.dbService.update('predictors', values);
    // }

    // deleteIndex(index) {
    //     return this.dbService.delete('predictors', index);
    // }

    getNewIdbPredictor(name: string, facilityId: number, accountId: number, date: Date): IdbPredictor {
        return {
            facilityId: facilityId,
            accountId: accountId,
            name: name,
            description: undefined,
            unit: undefined,
            date: date,
            amount: 0
        }
    }
}
