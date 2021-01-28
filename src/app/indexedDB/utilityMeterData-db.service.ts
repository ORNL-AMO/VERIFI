import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from '../models/idb';
import { BehaviorSubject, Observable } from 'rxjs';
import { FacilitydbService } from './facility-db.service';
import { AccountdbService } from './account-db.service';
import { ConvertMeterDataService } from '../shared/helper-services/convert-meter-data.service';

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

    update(meterData: IdbUtilityMeterData): void {
        this.dbService.update('utilityMeterData', meterData).subscribe(() => {
            this.setFacilityMeterData();
            this.setAccountMeterData();
        });
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

    deleteAllFacilityMeterData(facilityId: number): void {
        this.getAllByIndexRange('facilityId', facilityId).subscribe(facilityMeterDataEntries => {
            for (let i = 0; i < facilityMeterDataEntries.length; i++) {
                this.dbService.delete('utilityMeterData', facilityMeterDataEntries[i].id);
            }
        });
    }

    deleteAllAccountMeterData(accountId: number): void {
        this.getAllByIndexRange('accountId', accountId).subscribe(accountMeterDataEntries => {
            for (let i = 0; i < accountMeterDataEntries.length; i++) {
                this.dbService.delete('utilityMeterData', accountMeterDataEntries[i].id);
            }
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
            latePayment: undefined
        }
    }

    private getMeterDataFromMeterId(meterId: number): Array<IdbUtilityMeterData> {
        let facilityMeterData: Array<IdbUtilityMeterData> = this.accountMeterData.getValue();
        return facilityMeterData.filter(meterData => { return meterData.meterId == meterId });
    }

    getMeterDataForFacility(meter: IdbUtilityMeter): Array<IdbUtilityMeterData> {
        let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        let meterData: Array<IdbUtilityMeterData> = this.getMeterDataFromMeterId(meter.id);
        meterData = this.convertMeterDataService.convertMeterDataToFacility(meter, JSON.parse(JSON.stringify(meterData)), facility);
        return meterData;
    }

    getMeterDataForAccount(meter: IdbUtilityMeter): Array<IdbUtilityMeterData> {
        let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
        let meterData: Array<IdbUtilityMeterData> = this.getMeterDataFromMeterId(meter.id);
        meterData = this.convertMeterDataService.convertMeterDataToAccount(meter, JSON.parse(JSON.stringify(meterData)), account);
        return meterData;
    }

}
