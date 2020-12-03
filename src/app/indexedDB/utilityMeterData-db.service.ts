import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbFacility, IdbUtilityMeterData } from '../models/idb';
import { BehaviorSubject, Observable } from 'rxjs';
import { FacilitydbService } from './facility-db.service';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterDatadbService {

    facilityMeterData: BehaviorSubject<Array<IdbUtilityMeterData>>;
    constructor(private dbService: NgxIndexedDBService, private facilityDbService: FacilitydbService) {
        this.facilityMeterData = new BehaviorSubject<Array<IdbUtilityMeterData>>(new Array());
        this.facilityDbService.selectedFacility.subscribe(() => {
            this.setFacilityMeterData();
        });
    }

    setFacilityMeterData() {
        let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        if (facility) {
            this.getAllByIndexRange('facilityId', facility.id).subscribe(meterData => {
                this.facilityMeterData.next(meterData);
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
        });
    }

    update(meterData: IdbUtilityMeterData): void {
        this.dbService.update('utilityMeterData', meterData).subscribe(() => {
            this.setFacilityMeterData();
        });
    }

    deleteIndex(meterDataId: number): void {
        this.dbService.delete('utilityMeterData', meterDataId).subscribe(() => {
            this.setFacilityMeterData();
        });
    }

    deleteMeterDataByMeterId(meterId: number): void {
        this.getAllByIndexRange('meterId', meterId).subscribe(meterData => {
            meterData.forEach(dataItem => {
                this.deleteIndex(dataItem.id);
            });
        });
    }

    getNewIdbUtilityMeterData(meterId: number, facilityId: number, accountId: number): IdbUtilityMeterData {
        return {
            // id: undefined,
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
            generationTransmissionCharge: undefined,
            transmissionCharge: undefined,
            powerFactorCharge: undefined,
            businessCharge: undefined,
            utilityTax: undefined,
            latePayment: undefined
        }
    }

    getMeterDataFromMeterId(meterId: number): Array<IdbUtilityMeterData> {
        let facilityMeterData: Array<IdbUtilityMeterData> = this.facilityMeterData.getValue();
        return facilityMeterData.filter(meterData => { return meterData.meterId == meterId });
    }

    getMeterDataFromMeterIds(meterIds: Array<number>): Array<IdbUtilityMeterData> {
        let facilityMeterData: Array<IdbUtilityMeterData> = this.facilityMeterData.getValue();
        return facilityMeterData.filter(meterData => { return meterIds.includes(meterData.meterId) });
    }
}
