import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbFacility, IdbUtilityMeter } from '../models/idb';
import { BehaviorSubject, Observable } from 'rxjs';
import { FacilitydbService } from './facility-db.service';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterdbService {

    facilityMeters: BehaviorSubject<Array<IdbUtilityMeter>>;

    constructor(private dbService: NgxIndexedDBService, private facilityDbService: FacilitydbService) {
        this.facilityMeters = new BehaviorSubject<Array<IdbUtilityMeter>>(new Array());
        this.facilityDbService.selectedFacility.subscribe(() => {
            this.setFacilityMeters();
        });
    }

    setFacilityMeters() {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        if (selectedFacility) {
            this.getAllByIndexRange('facilityId', selectedFacility.id).subscribe(facilityMeters => {
                this.facilityMeters.next(facilityMeters);
            });
        }
    }

    getAll(): Observable<Array<IdbUtilityMeter>> {
        return this.dbService.getAll('utilityMeter');
    }

    getById(meterId: number): Observable<IdbUtilityMeter> {
        return this.dbService.getByKey('utilityMeter', meterId);
    }

    getByIndex(indexName: string, indexValue: number): Observable<IdbUtilityMeter> {
        return this.dbService.getByIndex('utilityMeter', indexName, indexValue);
    }

    getAllByIndexRange(indexName: string, indexValue: number | string): Observable<Array<IdbUtilityMeter>> {
        let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
        return this.dbService.getAllByIndex('utilityMeter', indexName, idbKeyRange);
    }

    count() {
        return this.dbService.count('utilityMeter');
    }

    add(utilityMeter: IdbUtilityMeter): void {
        this.dbService.add('utilityMeter', utilityMeter).subscribe(() => {
            this.setFacilityMeters();
        });
    }

    addWithObservable(utilityMeter: IdbUtilityMeter): Observable<number> {
        return this.dbService.add('utilityMeter', utilityMeter);
    }


    update(values: IdbUtilityMeter): void {
        this.dbService.update('utilityMeter', values).subscribe(() => {
            this.setFacilityMeters();
        });
    }

    deleteIndex(utilityMeterId: number): void {
        this.dbService.delete('utilityMeter', utilityMeterId).subscribe(() => {
            this.setFacilityMeters();
        });
    }

    deleteAllFacilityMeters(facilityId: number): void {
        this.getAllByIndexRange('facilityId', facilityId).subscribe(facilityMeterEntries => {
            for(let i=0; i<facilityMeterEntries.length; i++) {
                this.dbService.delete('utilityMeter', facilityMeterEntries[i]['id']);
            }
        });
    }

    deleteAllAccountMeters(accountId: number): void {
        this.getAllByIndexRange('accountId', accountId).subscribe(accountMeterEntries => {
            for(let i=0; i<accountMeterEntries.length; i++) {
                this.dbService.delete('utilityMeter', accountMeterEntries[i]['id']);
            }
        });
    }

    getNewIdbUtilityMeter(facilityId: number, accountId: number): IdbUtilityMeter {
        return {
            facilityId: facilityId,
            accountId: accountId,
            // id: undefined,
            groupId: undefined,
            meterNumber: undefined,
            accountNumber: undefined,
            type: undefined,
            phase: undefined,
            unit: undefined,
            heatCapacity: undefined,
            siteToSource: undefined,
            name: undefined,
            location: undefined,
            supplier: undefined,
            notes: undefined,
            source: 'Electricity',
            group: undefined,
            startingUnit: undefined,
            fuel: undefined
        }
    }

    getGroupMetersByGroupId(groupId: number): Array<IdbUtilityMeter> {
        let facilityMeters: Array<IdbUtilityMeter> = this.facilityMeters.getValue();
        return facilityMeters.filter(meter => { return meter.groupId == groupId });
    }
}
