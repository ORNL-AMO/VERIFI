import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { IdbAccount } from '../models/idbModels/account';
import { IndexedDbAccessService } from './indexed-db-access.service';

@Injectable({
    providedIn: 'root'
})
export class AccountdbService {

    constructor(private dbService: NgxIndexedDBService,
        private indexedDbAccess: IndexedDbAccessService) { }

    getAll(): Observable<Array<IdbAccount>> {
        return this.dbService.getAll('accounts');
    }

    getById(accountId: number): Observable<IdbAccount> {
        return this.dbService.getByKey('accounts', accountId);
    }

    getStoredByGuid(accountGuid: string): Promise<IdbAccount | undefined> {
        return this.indexedDbAccess.getByGuid<IdbAccount>('accounts', accountGuid);
    }

    count() {
        return this.dbService.count('accounts');
    }

    addWithObservable(account: IdbAccount): Observable<IdbAccount> {
        account.modifiedDate = new Date();
        return this.dbService.add('accounts', account);
    }

    updateWithObservable(account: IdbAccount): Observable<IdbAccount> {
        account.modifiedDate = new Date();
        return this.dbService.update('accounts', account);
    }

    deleteAccountWithObservable(accountId: number): Observable<any> {
        return this.dbService.delete('accounts', accountId);
    }

    // *WARNING* Can not be undone
    // deleteDatabase() {
    //     try {
    //         this.dbService.deleteDatabase().subscribe(
    //             () => {
    //                 console.log('database deleted..');
    //                 this.finishDelete();
    //             },
    //             error => {
    //                 console.log(error);
    //                 this.finishDelete();
    //             }
    //         );
    //     } catch (err) {
    //         console.log('ERROR')
    //         console.log(err);
    //         this.finishDelete();
    //     }
    // }

    async deleteDatabase(): Promise<boolean> {
        try {
            await firstValueFrom(this.dbService.deleteDatabase());
            return true
        } catch (err) {
            console.log(err);
            return false
        }
    }

}
