import { Injectable } from '@angular/core';
import { IdbElectronBackup } from '../models/idb';
import { Observable, firstValueFrom } from 'rxjs';
import { NgxIndexedDBService } from 'ngx-indexed-db';

@Injectable({
    providedIn: 'root'
})
export class ElectronBackupsDbService {


    accountBackups: Array<IdbElectronBackup> = [];
    constructor(private dbService: NgxIndexedDBService) {
    }

    getAll(): Observable<Array<IdbElectronBackup>> {
        return this.dbService.getAll('electronBackups');
    }

    getById(backupId: number): Observable<IdbElectronBackup> {
        return this.dbService.getByKey('electronBackups', backupId);
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
            let newBackup: IdbElectronBackup = {
                accountId: accountId,
                dataBackupId: dataBackupId,
                guid: Math.random().toString(36).substr(2, 9),
                timeStamp: new Date()
            };
            newBackup = await firstValueFrom(this.addWithObservable(newBackup));
            this.accountBackups.push(newBackup);
        }
    }
}
