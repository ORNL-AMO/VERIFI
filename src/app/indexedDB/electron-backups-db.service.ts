import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NgxIndexedDBService } from 'ngx-indexed-db';
import { IdbElectronBackup } from '../models/idbModels/electronBackup';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
    providedIn: 'root'
})
export class ElectronBackupsDbService {


    constructor(private dbService: NgxIndexedDBService,
        private indexedDbAccess: IndexedDbAccessService) {
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

    deleteWithObservable(id: number): Observable<any> {
        return this.dbService.delete('electronBackups', id);
    }
}
