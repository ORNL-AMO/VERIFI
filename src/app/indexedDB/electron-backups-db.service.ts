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

    async addOrUpdateFile(dataBackupId: string, accountId: string) {
        let accountBackupIndex: number = this.accountBackups.findIndex(backup => {
            return backup.accountId == accountId
        });
        console.log('add or update...')
        if (accountBackupIndex != -1) {
            console.log('update');
            this.accountBackups[accountBackupIndex].dataBackupId = dataBackupId;
            this.accountBackups[accountBackupIndex].timeStamp = new Date();
            await firstValueFrom(this.updateWithObservable(this.accountBackups[accountBackupIndex]));
        } else {
            console.log('addddd....')
            let newBackup: IdbElectronBackup = {
                accountId: accountId,
                dataBackupId: dataBackupId,
                guid: Math.random().toString(36).substr(2, 9),
                timeStamp: new Date()
            };
            this.accountBackups.push(newBackup);
            await firstValueFrom(this.addWithObservable(newBackup));
        }
    }
}
