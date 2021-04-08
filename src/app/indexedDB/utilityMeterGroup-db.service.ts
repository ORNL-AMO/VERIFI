import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbAccount, IdbFacility, IdbUtilityMeterGroup } from '../models/idb';
import { BehaviorSubject, Observable } from 'rxjs';
import { FacilitydbService } from './facility-db.service';
import { AccountdbService } from './account-db.service';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterGroupdbService {

    facilityMeterGroups: BehaviorSubject<Array<IdbUtilityMeterGroup>>;
    accountMeterGroups: BehaviorSubject<Array<IdbUtilityMeterGroup>>;
    constructor(private dbService: NgxIndexedDBService, private facilityDbService: FacilitydbService, private accountDbService: AccountdbService) {
        this.facilityMeterGroups = new BehaviorSubject<Array<IdbUtilityMeterGroup>>(new Array());
        this.accountMeterGroups = new BehaviorSubject<Array<IdbUtilityMeterGroup>>(new Array());
        this.facilityDbService.selectedFacility.subscribe(() => {
            this.setFacilityMeterGroups();
        });

        this.accountDbService.selectedAccount.subscribe(() => {
            this.setAccountMeterGroups();
        });

    }

    setFacilityMeterGroups() {
        let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
        if (facility) {
            this.getAllByIndexRange('facilityId', facility.id).subscribe(meterGroups => {
                this.facilityMeterGroups.next(meterGroups);
            });
        }
    }

    setAccountMeterGroups() {
        let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
        if (selectedAccount) {
            this.getAllByIndexRange('accountId', selectedAccount.id).subscribe(meterGroups => {
                this.accountMeterGroups.next(meterGroups);
            });
        }
    }


    getAll(): Observable<Array<IdbUtilityMeterGroup>> {
        return this.dbService.getAll('utilityMeterGroups');
    }

    getById(groupId: number): Observable<IdbUtilityMeterGroup> {
        return this.dbService.getByKey('utilityMeterGroups', groupId);
    }

    getByIndex(indexName: string, indexValue: number): Observable<IdbUtilityMeterGroup> {
        return this.dbService.getByIndex('utilityMeterGroups', indexName, indexValue);
    }

    getAllByIndexRange(indexName: string, indexValue: number | string): Observable<Array<IdbUtilityMeterGroup>> {
        let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
        return this.dbService.getAllByIndex('utilityMeterGroups', indexName, idbKeyRange);
    }

    count() {
        return this.dbService.count('utilityMeterGroups');
    }

    add(utilityMeterGroup: IdbUtilityMeterGroup): void {
        this.dbService.add('utilityMeterGroups', utilityMeterGroup).subscribe(() => {
            this.setFacilityMeterGroups();
            this.setAccountMeterGroups();
        });
    }

    addFromImport(utilityMeterGroup: IdbUtilityMeterGroup): Observable<number> {
        return this.dbService.add('utilityMeterGroups', utilityMeterGroup);
    }

    update(utilityMeterGroup: IdbUtilityMeterGroup): void {
        this.dbService.update('utilityMeterGroups', utilityMeterGroup).subscribe(() => {
            this.setFacilityMeterGroups();
            this.setAccountMeterGroups();
        });
    }

    deleteIndex(meterGroupId: number): void {
        this.dbService.delete('utilityMeterGroups', meterGroupId).subscribe(() => {
            this.setFacilityMeterGroups();
            this.setAccountMeterGroups();
        });
    }

    deleteWithObservable(meterGroupId: number): Observable<any> {
        return this.dbService.delete('utilityMeterGroups', meterGroupId);
    }

    deleteAllFacilityMeterGroups(facilityId: number): void {
        let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.accountMeterGroups.getValue();
        let facilityGroupEntries: Array<IdbUtilityMeterGroup> = accountMeterGroups.filter(group => { return group.facilityId == facilityId });
        this.deleteMeterGroupAsync(facilityGroupEntries);
    }

    deleteAllSelectedAccountMeterGroups(): void {
        let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.accountMeterGroups.getValue();
        this.deleteMeterGroupAsync(accountMeterGroups);
    }

    async deleteMeterGroupAsync(meterGroups: Array<IdbUtilityMeterGroup>) {
        for (let i = 0; i < meterGroups.length; i++) {
            await this.deleteWithObservable(meterGroups[i].id).toPromise();
        }
    }


    getNewIdbUtilityMeterGroup(type: string, name: string, facilityId: number, accountId: number): IdbUtilityMeterGroup {
        return {
            facilityId: facilityId,
            accountId: accountId,
            groupType: type,
            name: name,
            description: undefined,
            dateModified: undefined,
            factionOfTotalEnergy: undefined,
            // id: undefined
            visible: true
        }
    }

    getGroupById(groupId: number): IdbUtilityMeterGroup {
        let groups: Array<IdbUtilityMeterGroup> = this.facilityMeterGroups.getValue();
        return groups.find(group => { return group.id == groupId });
    }
}
