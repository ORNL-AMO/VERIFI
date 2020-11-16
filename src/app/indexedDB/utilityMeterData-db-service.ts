import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbUtilityMeterData } from '../models/idb';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterDatadbService {
    constructor(private dbService: NgxIndexedDBService) { }

    getAll(): Promise<Array<IdbUtilityMeterData>> {
        return this.dbService.getAll('utilityMeterData');
    }

    getById(meterDataId: number): Promise<IdbUtilityMeterData> {
        return this.dbService.getByKey('utilityMeterData', meterDataId);
    }

    getByIndex(indexName: string, indexValue: number): Promise<IdbUtilityMeterData> {
        return this.dbService.getByIndex('utilityMeterData', indexName, indexValue);
    }

    getAllByIndexRange(indexName: string, indexValue: number | string): Promise<Array<IdbUtilityMeterData>> {
        let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
        return this.dbService.getAllByIndex('utilityMeterData', indexName, idbKeyRange);
    }

    count() {
        return this.dbService.count('utilityMeterData');
    }

    add(meterData: IdbUtilityMeterData): Promise<any> {
        return this.dbService.add('utilityMeterData', meterData);
    }

    update(meterData: IdbUtilityMeterData): Promise<any> {
        return this.dbService.update('utilityMeterData', meterData);
    }

    deleteIndex(meterDataId: number): Promise<any> {
        return this.dbService.delete('utilityMeterData', meterDataId);
    }

    getNewIdbUtilityMeterData(meterId: number, facilityId: number, accountId: number): IdbUtilityMeterData {
        return {
            id: undefined,
            meterId: meterId,
            facilityId: facilityId,
            accountId: accountId,
            readDate: undefined,
            unit: undefined,
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
            generalTransCharge: undefined,
            transCharge: undefined,
            powerFactorCharge: undefined,
            businessCharge: undefined,
            utilityTax: undefined,
            latePayment: undefined
        }
    }
}
