import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';
import { ElectronService } from '../electron/electron.service';
import { IdbAccount } from '../models/idbModels/account';

@Injectable({
    providedIn: 'root'
})
export class AccountdbService {

    selectedAccount: BehaviorSubject<IdbAccount>;
    allAccounts: BehaviorSubject<Array<IdbAccount>>;
    constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService, private electronService: ElectronService) {
        this.selectedAccount = new BehaviorSubject<IdbAccount>(undefined);
        this.allAccounts = new BehaviorSubject<Array<IdbAccount>>(new Array());
        this.selectedAccount.subscribe(account => {
            if (account) {
                this.localStorageService.store("accountId", account.id);
            }
        });
    }

    getInitialAccount(): number {
        let localStorageAccountId: number = this.localStorageService.retrieve("accountId");
        return localStorageAccountId;
    }

    getAll(): Observable<Array<IdbAccount>> {
        return this.dbService.getAll('accounts');
    }

    getById(accountId: number): Observable<IdbAccount> {
        return this.dbService.getByKey('accounts', accountId);
    }

    count() {
        return this.dbService.count('accounts');
    }

    addWithObservable(account: IdbAccount): Observable<IdbAccount> {
        return this.dbService.add('accounts', account);
    }

    updateWithObservable(account: IdbAccount): Observable<IdbAccount> {
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

    async deleteDatabase() {
        try {
            await firstValueFrom(this.dbService.deleteDatabase());
        } catch (err) {
            console.log(err);
        }
    }

    finishDelete() {
        if (this.electronService.isElectron) {
            this.electronService.sendAppRelaunch();
        } else {
            location.reload()
        }
    }
}