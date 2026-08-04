import { Injectable } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { getNewIdbElectronBackup, IdbElectronBackup } from '../models/idbModels/electronBackup';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
    providedIn: 'root'
})
export class ElectronBackupsDbService {


    accountBackups: Array<IdbElectronBackup> = [];
    constructor(private dbService: NgxIndexedDBService,
        private indexedDbAccess: IndexedDbAccessService = new IndexedDbAccessService(dbService)) {
    }

    getAll(): Observable<Array<IdbElectronBackup>> {
        return this.dbService.getAll('electronBackups');
    }

    getById(backupId: number): Observable<IdbElectronBackup> {
        return this.dbService.getByKey('electronBackups', backupId);
    }

    getAllAccountBackups(accountId: string): Promise<Array<IdbElectronBackup>> {
        return this.indexedDbAccess.getAllByIndex<IdbElectronBackup>('electronBackups', 'accountId', accountId);
    }

    getStoredByGuid(guid: string): Promise<IdbElectronBackup | undefined> {
        return this.indexedDbAccess.getByGuid<IdbElectronBackup>('electronBackups', guid);
    }

    count() {
        return this.dbService.count('electronBackups');
    }

    addWithObservable(electronBackup: IdbElectronBackup): Observable<IdbElectronBackup> {
        return this.dbService.add('electronBackups', electronBackup);
    }

    updateWithObservable(electronBackup: IdbElectronBackup): Observable<IdbElectronBackup> {
        return this.dbService.update('electronBackups', electronBackup);
    }

    deleteWithObservable(accountId: string): Observable<any> {
        let accountBackupIndex: number = this.accountBackups.findIndex(backup => {
            return backup.accountId == accountId
        });
        if (accountBackupIndex != -1) {
            this.accountBackups.splice(accountBackupIndex, 1);
            return this.dbService.delete('electronBackups', this.accountBackups[accountBackupIndex].id);
        } else {
            //need to return observable..
            return this.dbService.count('electronBackups');
        }
    }

    async addOrUpdateFile(dataBackupId: string, accountId: string) {
        let accountBackupIndex: number = this.accountBackups.findIndex(backup => {
            return backup.accountId == accountId
        });
        if (accountBackupIndex != -1) {
            this.accountBackups[accountBackupIndex].dataBackupId = dataBackupId;
            this.accountBackups[accountBackupIndex].timeStamp = new Date();
            await firstValueFrom(this.updateWithObservable(this.accountBackups[accountBackupIndex]));
        } else {
            let newBackup: IdbElectronBackup = getNewIdbElectronBackup(accountId, dataBackupId);
            newBackup = await firstValueFrom(this.addWithObservable(newBackup));
            this.accountBackups.push(newBackup);
        }
    }
}
