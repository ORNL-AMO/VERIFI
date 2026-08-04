import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { LoadingService } from '../core-components/loading/loading.service';
import { IdbUtilityMeterGroup } from '../models/idbModels/utilityMeterGroup';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterGroupdbService {

    facilityMeterGroups: BehaviorSubject<Array<IdbUtilityMeterGroup>>;
    accountMeterGroups: BehaviorSubject<Array<IdbUtilityMeterGroup>>;
    constructor(private dbService: NgxIndexedDBService, private loadingService: LoadingService,
        private indexedDbAccess: IndexedDbAccessService = new IndexedDbAccessService(dbService)) {
        this.facilityMeterGroups = new BehaviorSubject<Array<IdbUtilityMeterGroup>>(new Array());
        this.accountMeterGroups = new BehaviorSubject<Array<IdbUtilityMeterGroup>>(new Array());
    }

    getAll(): Observable<Array<IdbUtilityMeterGroup>> {
        return this.dbService.getAll('utilityMeterGroups');
    }

    async getAllAccountMeterGroups(accountId: string): Promise<Array<IdbUtilityMeterGroup>> {
        return this.indexedDbAccess.getAllByIndex<IdbUtilityMeterGroup>(
            'utilityMeterGroups',
            'accountId',
            accountId
        );
    }

    getById(groupId: number): Observable<IdbUtilityMeterGroup> {
        return this.dbService.getByKey('utilityMeterGroups', groupId);
    }

    getByIndex(indexName: string, indexValue: IDBValidKey): Observable<IdbUtilityMeterGroup> {
        return this.dbService.getByIndex('utilityMeterGroups', indexName, indexValue);
    }

    getStoredByGuid(guid: string): Promise<IdbUtilityMeterGroup | undefined> {
        return this.indexedDbAccess.getByGuid<IdbUtilityMeterGroup>('utilityMeterGroups', guid);
    }

    getStoredFacilityGroups(facilityId: string): Promise<Array<IdbUtilityMeterGroup>> {
        return this.indexedDbAccess.getAllByIndex<IdbUtilityMeterGroup>(
            'utilityMeterGroups',
            'facilityId',
            facilityId
        );
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

    async deleteAllFacilityMeterGroups(facilityId: string): Promise<void> {
        this.loadingService.setLoadingMessage('Deleting Facility Meter Groups...');
        await this.indexedDbAccess.deleteAllByIndex('utilityMeterGroups', 'facilityId', facilityId);
    }

    deleteAllSelectedAccountMeterGroups(): void {
        let accountMeterGroups: Array<IdbUtilityMeterGroup> = this.accountMeterGroups.getValue();
        this.deleteMeterGroupAsync(accountMeterGroups);
    }

    async deleteMeterGroupAsync(meterGroups: Array<IdbUtilityMeterGroup>) {
        for (let i = 0; i < meterGroups.length; i++) {
            this.loadingService.setLoadingMessage('Deleting Meter Groups (' + i + '/' + meterGroups.length + ')...');
            await firstValueFrom(this.deleteWithObservable(meterGroups[i].id));
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

    getFacilityGroups(facilityId: string): Array<IdbUtilityMeterGroup> {
        let groups: Array<IdbUtilityMeterGroup> = this.accountMeterGroups.getValue();
        return groups.filter(group => { return group.facilityId == facilityId });
    }
}
