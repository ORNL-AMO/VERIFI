import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from '../models/idb';
import { BehaviorSubject, Observable } from 'rxjs';
import { FacilitydbService } from './facility-db.service';
import { AccountdbService } from './account-db.service';
import { ConvertMeterDataService } from '../shared/helper-services/convert-meter-data.service';
import * as _ from 'lodash';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterDatadbService {

    facilityMeterData: BehaviorSubject<Array<IdbUtilityMeterData>>;
    accountMeterData: BehaviorSubject<Array<IdbUtilityMeterData>>;
    constructor(private dbService: NgxIndexedDBService, private facilityDbService: FacilitydbService, private accountDbService: AccountdbService,
        private convertMeterDataService: ConvertMeterDataService) {
        this.facilityMeterData = new BehaviorSubject<Array<IdbUtilityMeterData>>(new Array());
        this.accountMeterData = new BehaviorSubject<Array<IdbUtilityMeterData>>(new Array());

        this.accountDbService.selectedAccount.subscribe(() => {
            this.setAccountMeterData();
        });
        this.facilityDbService.selectedFacility.subscribe(() => {
            this.setFacilityMeterData();
        });
    }

    async initializeMeterData() {
        let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
        if (selectedAccount) {
            let accountMeterData: Array<IdbUtilityMeterData> = await this.getAllByIndexRange('accountId', selectedAccount.id).toPromise();
            this.accountMeterData.next(accountMeterData);
            let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
            if (selectedFacility) {
                let facilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.filter(meterData => { return meterData.facilityId == selectedFacility.id });
                this.facilityMeterData.next(facilityMeterData);
            }
        }
    }

    setFacilityMeterData() {
        let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        if (facility) {
            this.getAllByIndexRange('facilityId', facility.id).subscribe(meterData => {
                this.facilityMeterData.next(meterData);
            });
        }
    }

    setAccountMeterData() {
        let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
        if (account) {
            this.getAllByIndexRange('accountId', account.id).subscribe(meterData => {
                this.accountMeterData.next(meterData);
            });
        }
    }

    getAll(): Observable<Array<IdbUtilityMeterData>> {
        return this.dbService.getAll('utilityMeterData');
    }

    getById(meterDataId: number): Observable<IdbUtilityMeterData> {
        return this.dbService.getByKey('utilityMeterData', meterDataId);
    }

    getByIndex(indexName: string, indexValue: number): Observable<IdbUtilityMeterData> {
        return this.dbService.getByIndex('utilityMeterData', indexName, indexValue);
    }

    getAllByIndexRange(indexName: string, indexValue: number | string): Observable<Array<IdbUtilityMeterData>> {
        let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
        return this.dbService.getAllByIndex('utilityMeterData', indexName, idbKeyRange);
    }

    count() {
        return this.dbService.count('utilityMeterData');
    }

    add(meterData: IdbUtilityMeterData): void {
        this.dbService.add('utilityMeterData', meterData).subscribe(() => {
            this.setFacilityMeterData();
            this.setAccountMeterData();
        });
    }

    addWithObservable(meterData: IdbUtilityMeterData): Observable<number> {
        return this.dbService.add('utilityMeterData', meterData);
    }

    update(meterData: IdbUtilityMeterData): void {
        this.dbService.update('utilityMeterData', meterData).subscribe(() => {
            this.setFacilityMeterData();
            this.setAccountMeterData();
        });
    }

    updateWithObservable(meterData: IdbUtilityMeterData): Observable<any> {
        return this.dbService.update('utilityMeterData', meterData);
    }

    deleteIndex(meterDataId: number): void {
        this.dbService.delete('utilityMeterData', meterDataId).subscribe(() => {
            this.setFacilityMeterData();
            this.setAccountMeterData();
        });
    }

    deleteMeterDataByMeterId(meterId: number): void {
        this.getAllByIndexRange('meterId', meterId).subscribe(meterData => {
            meterData.forEach(dataItem => {
                this.deleteIndex(dataItem.id);
            });
        });
    }

    deleteWithObservable(meterDataId: number): Observable<any> {
        return this.dbService.delete('utilityMeterData', meterDataId);
    }

    async deleteAllFacilityMeterData(facilityId: number) {
        let accountMeterDataEntries: Array<IdbUtilityMeterData> = this.accountMeterData.getValue();
        let facilityMeterDataEntries: Array<IdbUtilityMeterData> = accountMeterDataEntries.filter(meterData => { return meterData.facilityId == facilityId });
        await this.deleteMeterDataEntriesAsync(facilityMeterDataEntries);
    }

    async deleteAllSelectedAccountMeterData() {
        let accountMeterDataEntries: Array<IdbUtilityMeterData> = this.accountMeterData.getValue();
        await this.deleteMeterDataEntriesAsync(accountMeterDataEntries);
    }

    async deleteMeterDataEntriesAsync(meterDataEntries: Array<IdbUtilityMeterData>) {
        for (let i = 0; i < meterDataEntries.length; i++) {
            await this.deleteWithObservable(meterDataEntries[i].id).toPromise();
        }
    }

    getNewIdbUtilityMeterData(meter: IdbUtilityMeter): IdbUtilityMeterData {
        let lastMeterDate: Date = this.getLastMeterReadingDate(meter);
        let newDate: Date = new Date();
        if (lastMeterDate) {
            newDate = new Date(lastMeterDate);
            newDate.setMonth(newDate.getMonth() + 1);
        }

        return {
            // id: undefined,
            meterId: meter.id,
            facilityId: meter.facilityId,
            accountId: meter.accountId,
            readDate: newDate,
            totalVolume: undefined,
            totalEnergyUse: undefined,
            totalCost: undefined,
            commodityCharge: undefined,
            deliveryCharge: undefined,
            otherCharge: undefined,
            checked: false,
            // Electricity Use Only
            totalDemand: undefined,
            basicCharge: undefined,
            supplyBlockAmount: undefined,
            supplyBlockCharge: undefined,
            flatRateAmount: undefined,
            flatRateCharge: undefined,
            peakAmount: undefined,
            peakCharge: undefined,
            offPeakAmount: undefined,
            offPeakCharge: undefined,
            demandBlockAmount: undefined,
            demandBlockCharge: undefined,
            generationTransmissionCharge: undefined,
            transmissionCharge: undefined,
            powerFactorCharge: undefined,
            businessCharge: undefined,
            utilityTax: undefined,
            latePayment: undefined,
            meterNumber: meter.meterNumber
        }
    }


    getLastMeterReadingDate(meter: IdbUtilityMeter): Date {
        let allSelectedMeterData: Array<IdbUtilityMeterData> = this.getMeterDataForFacility(meter, false);
        if (allSelectedMeterData.length != 0) {
            let lastMeterReading: IdbUtilityMeterData = _.maxBy(allSelectedMeterData, 'readDate');
            return new Date(lastMeterReading.readDate);
        }
        return undefined;
    }

    checkMeterReadingExistForDate(date: Date, meter: IdbUtilityMeter): IdbUtilityMeterData {
        let newDate: Date = new Date(date);
        let allSelectedMeterData: Array<IdbUtilityMeterData> = this.getMeterDataForFacility(meter, false);
        let existingData: IdbUtilityMeterData = allSelectedMeterData.find(dataItem => {
            return this.checkSameMonthYear(newDate, dataItem);
        });
        return existingData;
    }

    checkSameMonthYear(date: Date, dataItem: IdbUtilityMeterData): boolean {
        let dataItemDate: Date = new Date(dataItem.readDate);
        return (dataItemDate.getUTCMonth() == date.getUTCMonth()) && (dataItemDate.getUTCFullYear() == date.getUTCFullYear());
    }

    private getMeterDataFromMeterId(meterId: number): Array<IdbUtilityMeterData> {
        let facilityMeterData: Array<IdbUtilityMeterData> = this.accountMeterData.getValue();
        return facilityMeterData.filter(meterData => { return meterData.meterId == meterId });
    }

    getMeterDataForFacility(meter: IdbUtilityMeter, convertData: boolean): Array<IdbUtilityMeterData> {
        let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        let meterData: Array<IdbUtilityMeterData> = this.getMeterDataFromMeterId(meter.id);
        if (convertData) {
            meterData = this.convertMeterDataService.convertMeterDataToFacility(meter, JSON.parse(JSON.stringify(meterData)), facility);
        }
        return meterData;
    }

    getMeterDataForAccount(meter: IdbUtilityMeter, convertData: boolean): Array<IdbUtilityMeterData> {
        let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
        let meterData: Array<IdbUtilityMeterData> = this.getMeterDataFromMeterId(meter.id);
        if (convertData) {
            meterData = this.convertMeterDataService.convertMeterDataToAccount(meter, JSON.parse(JSON.stringify(meterData)), account);
        }
        return meterData;
    }
}
