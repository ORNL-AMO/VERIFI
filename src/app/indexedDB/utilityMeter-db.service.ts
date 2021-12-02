import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from '../models/idb';
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
        this.accountdbService.selectedAccount.subscribe(() => {
            this.setAccountMeters();
        })
        this.facilityDbService.selectedFacility.subscribe(() => {
            this.setFacilityMeters();
        });
    }

    async initializeMeterData() {
        let selectedAccount: IdbAccount = this.accountdbService.selectedAccount.getValue();
        if (selectedAccount) {
            let accountMeters: Array<IdbUtilityMeter> = await this.getAllByIndexRange('accountId', selectedAccount.id).toPromise();
            this.accountMeters.next(accountMeters);
            let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
            if (selectedFacility) {
                let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == selectedFacility.id });
                this.facilityMeters.next(facilityMeters);
            }
        }
    }

    setFacilityMeters() {
        let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        if (selectedFacility) {
            this.getAllByIndexRange('facilityId', selectedFacility.id).subscribe(facilityMeters => {
                this.facilityMeters.next(facilityMeters);
            });
        }
    }

    setAccountMeters() {
        let selectedAccount: IdbAccount = this.accountdbService.selectedAccount.getValue();
        if (selectedAccount) {
            this.getAllByIndexRange('accountId', selectedAccount.id).subscribe(facilityMeters => {
                this.accountMeters.next(facilityMeters);
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
        utilityMeter.visible = true;
        this.dbService.add('utilityMeter', utilityMeter).subscribe(() => {
            this.setFacilityMeters();
            this.setAccountMeters();
        });
    }

    addWithObservable(utilityMeter: IdbUtilityMeter): Observable<IdbUtilityMeter> {
        utilityMeter.visible = true;
        return this.dbService.add('utilityMeter', utilityMeter);
    }

    updateWithObservable(utilityMeter: IdbUtilityMeter): Observable<any> {
        return this.dbService.update('utilityMeter', utilityMeter);
    }


    update(values: IdbUtilityMeter): void {
        this.dbService.update('utilityMeter', values).subscribe(() => {
            this.setFacilityMeters();
            this.setAccountMeters();
        });
    }

    deleteIndex(utilityMeterId: number): void {
        this.dbService.delete('utilityMeter', utilityMeterId).subscribe(() => {
            this.setFacilityMeters();
        });
        this.setAccountMeters();
    }

    deleteIndexWithObservable(utilityMeterId: number): Observable<any> {
        return this.dbService.delete('utilityMeter', utilityMeterId)
    }

    async deleteAllFacilityMeters(facilityId: number) {
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

    getNewIdbUtilityMeter(facilityId: number, accountId: number, setDefaults: boolean, emissionsOutputRate: number): IdbUtilityMeter {
        let source: string;
        let startingUnit: string;
        if (setDefaults) {
            source = 'Electricity';
            startingUnit = 'kWh';
        }
        return {
            facilityId: facilityId,
            accountId: accountId,
            // id: undefined,
            groupId: undefined,
            meterNumber: undefined,
            accountNumber: undefined,
            phase: "Gas",
            heatCapacity: undefined,
            siteToSource: undefined,
            name: "New Meter",
            location: undefined,
            supplier: undefined,
            notes: undefined,
            source: source,
            group: undefined,
            startingUnit: startingUnit,
            energyUnit: undefined,
            fuel: undefined,
            emissionsOutputRate: emissionsOutputRate
        }
    }

    getGroupMetersByGroupId(groupId: number): Array<IdbUtilityMeter> {
        let facilityMeters: Array<IdbUtilityMeter> = this.accountMeters.getValue();
        return facilityMeters.filter(meter => { return meter.groupId == groupId });
    }

    getFacilityMeterById(id: number): IdbUtilityMeter {
        let facilityMeters: Array<IdbUtilityMeter> = this.accountMeters.getValue();
        return facilityMeters.find(meter => { return meter.id == id });
    }
}
