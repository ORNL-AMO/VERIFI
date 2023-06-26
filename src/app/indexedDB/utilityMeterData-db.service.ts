import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from '../models/idb';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { FacilitydbService } from './facility-db.service';
import { AccountdbService } from './account-db.service';
import { ConvertMeterDataService } from '../shared/helper-services/convert-meter-data.service';
import * as _ from 'lodash';
import { CalanderizationOptions } from '../models/calanderization';

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
    }

    getAll(): Observable<Array<IdbUtilityMeterData>> {
        return this.dbService.getAll('utilityMeterData');
    }

    async getAllAccountMeterData(accountId: string): Promise<Array<IdbUtilityMeterData>> {
        let allMeterData: Array<IdbUtilityMeterData> = await firstValueFrom(this.getAll());
        let accountMeterData: Array<IdbUtilityMeterData> = allMeterData.filter(data => { return data.accountId == accountId });
        return accountMeterData;
    }

    getById(meterDataId: number): Observable<IdbUtilityMeterData> {
        return this.dbService.getByKey('utilityMeterData', meterDataId);
    }

    getByIndex(indexName: string, indexValue: number): Observable<IdbUtilityMeterData> {
        return this.dbService.getByIndex('utilityMeterData', indexName, indexValue);
    }

    count() {
        return this.dbService.count('utilityMeterData');
    }

    addWithObservable(meterData: IdbUtilityMeterData): Observable<IdbUtilityMeterData> {
        meterData.dbDate = new Date();
        return this.dbService.add('utilityMeterData', meterData);
    }

    updateWithObservable(meterData: IdbUtilityMeterData): Observable<IdbUtilityMeterData> {
        meterData.dbDate = new Date();
        return this.dbService.update('utilityMeterData', meterData);
    }

    deleteWithObservable(meterDataId: number): Observable<any> {
        return this.dbService.delete('utilityMeterData', meterDataId);
    }

    async deleteAllFacilityMeterData(facilityId: string) {
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
            await firstValueFrom(this.deleteWithObservable(meterDataEntries[i].id));
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
            meterId: meter.guid,
            guid: Math.random().toString(36).substr(2, 9),
            facilityId: meter.facilityId,
            accountId: meter.accountId,
            readDate: newDate,
            totalVolume: undefined,
            totalEnergyUse: undefined,
            totalCost: undefined,
            commodityCharge: undefined,
            deliveryCharge: undefined,
            checked: false,
            // Electricity Use Only
            totalRealDemand: undefined,
            totalBilledDemand: undefined,
            nonEnergyCharge: undefined,
            block1Consumption: undefined,
            block1ConsumptionCharge: undefined,
            block2Consumption: undefined,
            block2ConsumptionCharge: undefined,
            block3Consumption: undefined,
            block3ConsumptionCharge: undefined,
            otherConsumption: undefined,
            otherConsumptionCharge: undefined,
            onPeakAmount: undefined,
            onPeakCharge: undefined,
            offPeakAmount: undefined,
            offPeakCharge: undefined,
            transmissionAndDeliveryCharge: undefined,
            powerFactor: undefined,
            powerFactorCharge: undefined,
            localSalesTax: undefined,
            stateSalesTax: undefined,
            latePayment: undefined,
            otherCharge: undefined,
            //non-electricity
            demandUsage: undefined,
            demandCharge: undefined,
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
            return this.checkSameDate(newDate, dataItem);
        });
        return existingData;
    }

    checkSameDate(date: Date, dataItem: IdbUtilityMeterData): boolean {
        let dataItemDate: Date = new Date(dataItem.readDate);
        return (dataItemDate.getUTCMonth() == date.getUTCMonth()) && (dataItemDate.getUTCFullYear() == date.getUTCFullYear()) && (dataItemDate.getUTCDate() == date.getUTCDate());
    }

    private getMeterDataFromMeterId(meterId: string): Array<IdbUtilityMeterData> {
        let facilityMeterData: Array<IdbUtilityMeterData> = this.accountMeterData.getValue();
        return facilityMeterData.filter(meterData => { return meterData.meterId == meterId });
    }

    getMeterDataForFacility(meter: IdbUtilityMeter, convertData: boolean, isMeterReadings?: boolean, calanderizationOptions?: CalanderizationOptions): Array<IdbUtilityMeterData> {
        let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
        let facility: IdbFacility = facilities.find(facility => { return facility.guid == meter.facilityId });
        let meterData: Array<IdbUtilityMeterData> = this.getMeterDataFromMeterId(meter.guid);
        let meterDataCopy: Array<IdbUtilityMeterData> = meterData.map(data => {return this.getMeterDataCopy(data)});
        if (!calanderizationOptions) {
            if (facility && facility.energyIsSource && !isMeterReadings) {
                meterDataCopy = this.convertMeterDataService.applySiteToSourceMultiplier(meter, meterDataCopy);
            }
        } else if (calanderizationOptions.energyIsSource) {
            meterDataCopy = this.convertMeterDataService.applySiteToSourceMultiplier(meter, meterDataCopy);
        }
        if (convertData) {
            meterDataCopy = this.convertMeterDataService.convertMeterDataToFacility(meter, meterDataCopy, facility);
        }
        return meterDataCopy;
    }

    getMeterDataForAccount(meter: IdbUtilityMeter, convertData: boolean, calanderizationOptions?: CalanderizationOptions): Array<IdbUtilityMeterData> {
        let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
        let meterData: Array<IdbUtilityMeterData> = this.getMeterDataFromMeterId(meter.guid);
        let meterDataCopy: Array<IdbUtilityMeterData> = meterData.map(data => {return this.getMeterDataCopy(data)});
        if (!calanderizationOptions) {
            if (account.energyIsSource) {
                meterDataCopy = this.convertMeterDataService.applySiteToSourceMultiplier(meter, meterDataCopy);
            }
        } else if (calanderizationOptions.energyIsSource) {
            meterDataCopy = this.convertMeterDataService.applySiteToSourceMultiplier(meter, meterDataCopy);
        }
        if (convertData) {
            meterDataCopy = this.convertMeterDataService.convertMeterDataToAccount(meter, meterDataCopy, account);
        }
        return meterDataCopy;
    }

    getAccountMeterDataCopy() {
        let accountMeterData: Array<IdbUtilityMeterData> = this.accountMeterData.getValue();
        let meterDataCopy: Array<IdbUtilityMeterData> = JSON.parse(JSON.stringify(accountMeterData));
        return meterDataCopy;
    }

    // getYearOptions(facilityId?: string): Array<number> {
    //     let meterData: Array<IdbUtilityMeterData>;
    //     let accountMeterData: Array<IdbUtilityMeterData> = this.accountMeterData.getValue();
    //     if (facilityId) {
    //         meterData = accountMeterData.filter(meterData => { return meterData.facilityId == facilityId });
    //     } else {
    //         meterData = accountMeterData
    //     }
    //     if (meterData.length != 0) {
    //         let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    //         let firstBill: IdbUtilityMeterData = orderedMeterData[0];
    //         let lastBill: IdbUtilityMeterData = orderedMeterData[orderedMeterData.length - 1];
    //         let yearStart: number = new Date(firstBill.readDate).getUTCFullYear();
    //         let yearEnd: number = new Date(lastBill.readDate).getUTCFullYear();
    //         let yearOptions: Array<number> = new Array();
    //         for (let i = yearStart; i <= yearEnd; i++) {
    //             yearOptions.push(i);
    //         }
    //         return yearOptions;
    //     } else {
    //         return
    //     }
    // }

    getMeterDataCopy(meterData: IdbUtilityMeterData): IdbUtilityMeterData {
        return {
            //keys (id primary)
            id: meterData.id,
            guid: meterData.guid,
            meterId: meterData.meterId,
            facilityId: meterData.facilityId,
            accountId: meterData.accountId,
            //data
            readDate: meterData.readDate,
            dbDate: meterData.dbDate,
            totalVolume: meterData.totalVolume,
            totalEnergyUse: meterData.totalEnergyUse,
            totalCost: meterData.totalCost,
            commodityCharge: meterData.commodityCharge,
            deliveryCharge: meterData.deliveryCharge,
            checked: meterData.checked,
            meterNumber: meterData.meterNumber,
            totalImportConsumption: meterData.totalImportConsumption,
            totalMarketEmissions: meterData.totalMarketEmissions,
            totalLocationEmissions: meterData.totalLocationEmissions,
            RECs: meterData.RECs,
            excessRECs: meterData.excessRECs,
            excessRECsEmissions: meterData.excessRECsEmissions,
            isEstimated: meterData.isEstimated,


            //electricity
            totalRealDemand: meterData.totalRealDemand,
            totalBilledDemand: meterData.totalBilledDemand,
            nonEnergyCharge: meterData.nonEnergyCharge,
            block1Consumption: meterData.block1Consumption,
            block1ConsumptionCharge: meterData.block1ConsumptionCharge,
            block2Consumption: meterData.block2Consumption,
            block2ConsumptionCharge: meterData.block2ConsumptionCharge,
            block3Consumption: meterData.block3Consumption,
            block3ConsumptionCharge: meterData.block3ConsumptionCharge,
            otherConsumption: meterData.otherConsumption,
            otherConsumptionCharge: meterData.otherConsumptionCharge,
            onPeakAmount: meterData.onPeakAmount,
            onPeakCharge: meterData.onPeakCharge,
            offPeakAmount: meterData.offPeakAmount,
            offPeakCharge: meterData.offPeakCharge,
            transmissionAndDeliveryCharge: meterData.transmissionAndDeliveryCharge,
            powerFactor: meterData.powerFactor,
            powerFactorCharge: meterData.powerFactorCharge,
            localSalesTax: meterData.localSalesTax,
            stateSalesTax: meterData.stateSalesTax,
            latePayment: meterData.latePayment,
            otherCharge: meterData.otherCharge,
            //non-electricity
            demandUsage: meterData.demandUsage,
            demandCharge: meterData.demandCharge
        }
    }
}
