import { Injectable } from '@angular/core';
import { IdbElectronBackup } from '../models/idb';
import { Observable, firstValueFrom } from 'rxjs';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { BackupFile } from '../shared/helper-services/backup-data.service';

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
        console.log('add')
        return this.dbService.add('electronBackups', electronBackup);
    }

    updateWithObservable(electronBackup: IdbElectronBackup): Observable<IdbElectronBackup> {
        return this.dbService.update('electronBackups', electronBackup);
    }

    deleteWithObservable(accountId: string): Observable<any> {
        let backup: IdbElectronBackup = this.accountBackups.find(backup => {
            return backup.accountId == accountId;
        });
        if (backup) {
            return this.dbService.delete('electronBackups', backup.id);
        }
        return;
    }

    async addOrUpdateFile(backupFile: BackupFile) {
        let accountBackupIndex: number = this.accountBackups.findIndex(backup => {
            return backup.accountId == backupFile.account.guid
        });
        if (accountBackupIndex != -1) {
            this.accountBackups[accountBackupIndex].dataBackupId = backupFile.dataBackupId;
            this.accountBackups[accountBackupIndex].timeStamp = backupFile.timeStamp;
            await firstValueFrom(this.updateWithObservable(this.accountBackups[accountBackupIndex]));
        } else {
            let newBackup: IdbElectronBackup = {
                accountId: backupFile.account.guid,
                dataBackupId: backupFile.dataBackupId,
                guid: Math.random().toString(36).substr(2, 9),
                timeStamp: new Date()
            };
            this.accountBackups.push(newBackup);
            await firstValueFrom(this.addWithObservable(newBackup));

        }
    }
}
