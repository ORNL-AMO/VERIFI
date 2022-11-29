import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbUtilityMeterGroup } from '../models/idb';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterGroupdbService {

    facilityMeterGroups: BehaviorSubject<Array<IdbUtilityMeterGroup>>;
    accountMeterGroups: BehaviorSubject<Array<IdbUtilityMeterGroup>>;
    constructor(private dbService: NgxIndexedDBService) {
        this.facilityMeterGroups = new BehaviorSubject<Array<IdbUtilityMeterGroup>>(new Array());
        this.accountMeterGroups = new BehaviorSubject<Array<IdbUtilityMeterGroup>>(new Array());
    }


    getAllByFacilityWithObservable(facilityId: string): Observable<Array<IdbUtilityMeterGroup>> {
        return this.getAllByIndexRange('facilityId', facilityId);
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

    addWithObservable(utilityMeterGroup: IdbUtilityMeterGroup): Observable<IdbUtilityMeterGroup> {
        return this.dbService.add('utilityMeterGroups', utilityMeterGroup);
    }

    updateWithObservable(utilityMeterGroup: IdbUtilityMeterGroup): Observable<IdbUtilityMeterGroup> {
        return this.dbService.update('utilityMeterGroups', utilityMeterGroup);
    }

    deleteWithObservable(meterGroupId: number): Observable<any> {
        return this.dbService.delete('utilityMeterGroups', meterGroupId);
    }

    deleteAllFacilityMeterGroups(facilityId: string): void {
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


    getNewIdbUtilityMeterGroup(type: 'Energy' | 'Water' | 'Other', name: string, facilityId: string, accountId: string): IdbUtilityMeterGroup {
        return {
            facilityId: facilityId,
            accountId: accountId,
            guid: Math.random().toString(36).substr(2, 9),
            groupType: type,
            name: name,
            description: undefined,
            dateModified: undefined,
            factionOfTotalEnergy: undefined,
            // id: undefined
            visible: true
        }
    }

    getGroupById(groupId: string): IdbUtilityMeterGroup {
        let groups: Array<IdbUtilityMeterGroup> = this.accountMeterGroups.getValue();
        return groups.find(group => { return group.guid == groupId });
    }

    getGroupName(guid: string) {
        let group: IdbUtilityMeterGroup = this.getGroupById(guid)
        if (group) {
            return group.name;
        } else {
            return;
        }
    }

    getAccountMeterGroupsCopy(): Array<IdbUtilityMeterGroup> {
        let groups: Array<IdbUtilityMeterGroup> = this.accountMeterGroups.getValue();
        let groupsCopy: Array<IdbUtilityMeterGroup> = JSON.parse(JSON.stringify(groups));
        return groupsCopy;
    }
}
