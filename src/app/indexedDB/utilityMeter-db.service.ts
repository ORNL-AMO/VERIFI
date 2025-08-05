import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbUtilityMeter } from '../models/idbModels/utilityMeter';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterdbService {

    facilityMeters: BehaviorSubject<Array<IdbUtilityMeter>>;
    accountMeters: BehaviorSubject<Array<IdbUtilityMeter>>;
    selectedMeter: BehaviorSubject<IdbUtilityMeter>;
    constructor(private dbService: NgxIndexedDBService,
        private loadingService: LoadingService) {
        this.facilityMeters = new BehaviorSubject<Array<IdbUtilityMeter>>(new Array());
        this.accountMeters = new BehaviorSubject<Array<IdbUtilityMeter>>(new Array());
        this.selectedMeter = new BehaviorSubject<IdbUtilityMeter>(undefined);
    }

    getAll(): Observable<Array<IdbUtilityMeter>> {
        return this.dbService.getAll('utilityMeter');
    }

    async getAllAccountMeters(accountId: string): Promise<Array<IdbUtilityMeter>> {
        let allMeters: Array<IdbUtilityMeter> = await firstValueFrom(this.getAll())
        let accountMeters: Array<IdbUtilityMeter> = allMeters.filter(meter => { return meter.accountId == accountId });
        return accountMeters;
    }

    getById(meterId: number): Observable<IdbUtilityMeter> {
        return this.dbService.getByKey('utilityMeter', meterId);
    }

    getByIndex(indexName: string, indexValue: number): Observable<IdbUtilityMeter> {
        return this.dbService.getByIndex('utilityMeter', indexName, indexValue);
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
            this.loadingService.setLoadingMessage('Deleting Meters (' + i + '/' + meterEntries.length + ')...');
            await firstValueFrom(this.deleteIndexWithObservable(meterEntries[i].id));
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

    setTemporaryMeterNumbersForExport() {
        let accountMeters: Array<IdbUtilityMeter> = this.accountMeters.getValue();
        accountMeters.forEach(meter => {
            if (meter.meterNumber == undefined) {
                let noSpaceSource: string = meter.source.replace(' ', '_');
                meter.meterNumber = noSpaceSource + '_' + meter.guid;
            }
        });
    }

    getFacilityMetersByFacilityGuid(facilityGuid: string): Array<IdbUtilityMeter> {
        let accountMeters: Array<IdbUtilityMeter> = this.accountMeters.getValue();
        return accountMeters.filter(meter => { return meter.facilityId == facilityGuid });
    }

}
