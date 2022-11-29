import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbAccount, IdbFacility, IdbUtilityMeter, MeterSource } from '../models/idb';
import { BehaviorSubject, Observable } from 'rxjs';
import { FacilitydbService } from './facility-db.service';
import { AccountdbService } from './account-db.service';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterdbService {

    facilityMeters: BehaviorSubject<Array<IdbUtilityMeter>>;
    accountMeters: BehaviorSubject<Array<IdbUtilityMeter>>;
    constructor(private dbService: NgxIndexedDBService, private facilityDbService: FacilitydbService, private accountdbService: AccountdbService) {
        this.facilityMeters = new BehaviorSubject<Array<IdbUtilityMeter>>(new Array());
        this.accountMeters = new BehaviorSubject<Array<IdbUtilityMeter>>(new Array());
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

    addWithObservable(utilityMeter: IdbUtilityMeter): Observable<IdbUtilityMeter> {
        utilityMeter.visible = true;
        return this.dbService.add('utilityMeter', utilityMeter);
    }

    updateWithObservable(utilityMeter: IdbUtilityMeter): Observable<IdbUtilityMeter> {
        return this.dbService.update('utilityMeter', utilityMeter);
    }

    deleteIndexWithObservable(utilityMeterId: number): Observable<any> {
        return this.dbService.delete('utilityMeter', utilityMeterId)
    }

    async deleteAllFacilityMeters(facilityId: string) {
        let accountMeterEntries: Array<IdbUtilityMeter> = this.accountMeters.getValue();
        let facilityMeterEntries: Array<IdbUtilityMeter> = accountMeterEntries.filter(meter => { return meter.facilityId == facilityId });
        await this.deleteMeterEntriesAsync(facilityMeterEntries);
    }

    async deleteAllSelectedAccountMeters() {
        let accountMeterEntries: Array<IdbUtilityMeter> = this.accountMeters.getValue();
        await this.deleteMeterEntriesAsync(accountMeterEntries);
    }


    async deleteMeterEntriesAsync(meterEntries: Array<IdbUtilityMeter>) {
        for (let i = 0; i < meterEntries.length; i++) {
            await this.deleteIndexWithObservable(meterEntries[i].id).toPromise();
        }
    }

    getNewIdbUtilityMeter(facilityId: string, accountId: string, setDefaults: boolean, energyUnit: string): IdbUtilityMeter {
        let source: MeterSource;
        let startingUnit: string;
        if (setDefaults) {
            source = 'Electricity';
            startingUnit = energyUnit;
            // startingUnit = 'kWh';
            // energyUnit = 'kWh';
        }
        return {
            facilityId: facilityId,
            accountId: accountId,
            guid: Math.random().toString(36).substr(2, 9),
            // id: undefined,
            groupId: undefined,
            meterNumber: undefined,
            accountNumber: undefined,
            phase: "Gas",
            heatCapacity: undefined,
            siteToSource: 3,
            name: "New Meter",
            location: undefined,
            supplier: undefined,
            notes: undefined,
            source: source,
            group: undefined,
            startingUnit: startingUnit,
            energyUnit: energyUnit,
            fuel: undefined,
            scope: 3,
            agreementType: 1,
            includeInEnergy: true,
            retainRECs: false,
            directConnection: false,
            locationGHGMultiplier: 1,
            marketGHGMultiplier: 1,
            recsMultiplier: 0,
            greenPurchaseFraction: .5
        }
    }

    getGroupMetersByGroupId(groupId: string): Array<IdbUtilityMeter> {
        let facilityMeters: Array<IdbUtilityMeter> = this.accountMeters.getValue();
        return facilityMeters.filter(meter => { return meter.groupId == groupId });
    }

    getFacilityMeterById(meterGuid: string): IdbUtilityMeter {
        let facilityMeters: Array<IdbUtilityMeter> = this.accountMeters.getValue();
        return facilityMeters.find(meter => { return meter.guid == meterGuid });
    }

    getAccountMetersCopy() {
        let accountMeters: Array<IdbUtilityMeter> = this.accountMeters.getValue();
        let metersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
        return metersCopy;
    }
}
