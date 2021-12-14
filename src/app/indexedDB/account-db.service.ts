import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbAccount } from '../models/idb';
import { BehaviorSubject, Observable } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';

@Injectable({
    providedIn: 'root'
})
export class AccountdbService {

    selectedAccount: BehaviorSubject<IdbAccount>;
    allAccounts: BehaviorSubject<Array<IdbAccount>>;
    constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService) {
        this.selectedAccount = new BehaviorSubject<IdbAccount>(undefined);
        this.allAccounts = new BehaviorSubject<Array<IdbAccount>>(new Array());
        this.selectedAccount.subscribe(account => {
            if (account) {
                this.localStorageService.store("accountId", account.id);
            }
        });
    }

    async initializeAccountFromLocalStorage() {
        let localStorageAccountId: number = this.localStorageService.retrieve("accountId");
        if (localStorageAccountId) {
            let selectedAcount: IdbAccount = await this.getById(localStorageAccountId).toPromise();
            this.selectedAccount.next(selectedAcount);
        }
        let allAccounts: Array<IdbAccount> = await this.getAll().toPromise();
        this.allAccounts.next(allAccounts);
        if(!localStorageAccountId){
            this.setSelectedAccount(undefined);
        }
    }

    setSelectedAccount(accountId: number) {
        if (accountId) {
            this.getById(accountId).subscribe(account => {
                this.selectedAccount.next(account);
            });
        } else {
            let allAccounts: Array<IdbAccount> = this.allAccounts.getValue();
            if (allAccounts.length != 0) {
                this.setSelectedAccount(allAccounts[0].id);
            } else {
                this.selectedAccount.next(undefined);
            }
        }
    }

    setAllAccounts() {
        this.getAll().subscribe(allAccounts => {
            this.allAccounts.next(allAccounts);
        });
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

    add(account: IdbAccount): void {
        this.dbService.add('accounts', account).subscribe(newAccount => {
            this.setAllAccounts();
            this.setSelectedAccount(newAccount.id);
        });
    }

    addWithObservable(account: IdbAccount): Observable<IdbAccount> {
        return this.dbService.add('accounts', account);
    }


    update(account: IdbAccount): void {
        this.dbService.update('accounts', account).subscribe(() => {
            this.setAllAccounts();
            this.setSelectedAccount(account.id);
        });
    }

    deleteById(accountId: number): void {
        this.dbService.delete('accounts', accountId).subscribe(() => {
            this.setAllAccounts();
        });
    }

    deleteAccountWithObservable(accountId: number): Observable<any> {
        return this.dbService.delete('accounts', accountId);
    }


    //TODO: MOVE
    // *WARNING* Can not be undone
    deleteDatabase() {
        this.dbService.deleteDatabase().subscribe(
            () => {
                console.log('Database deleted successfully');
            },
            error => {
                console.log(error);
            }
        );
    }

    getNewIdbAccount(): IdbAccount {
        return {
            name: 'New Account',
            city: '',
            state: '',
            zip: undefined,
            country: '',
            address: '',
            size: 0,
            naics1: undefined,
            naics2: undefined,
            naics3: undefined,
            notes: '',
            img: 'https://placehold.it/50x50',
            // id: undefined,            
            unitsOfMeasure: 'Imperial',
            energyUnit: 'kWh',
            volumeLiquidUnit: 'gal',
            volumeGasUnit: 'SCF',
            massUnit: 'lb',
            sustainabilityQuestions: {
                energyReductionGoal: false,
                energyReductionPercent: 0,
                energyReductionBaselineYear: 0,
                energyReductionTargetYear: 0,
                energyIsAbsolute: true,
                greenhouseReductionGoal: false,
                greenhouseReductionPercent: 0,
                greenhouseReductionBaselineYear: 0,
                greenhouseReductionTargetYear: 0,
                greenhouseIsAbsolute: true,
                renewableEnergyGoal: false,
                renewableEnergyPercent: 0,
                renewableEnergyBaselineYear: 0,
                renewableEnergyTargetYear: 0,
                wasteReductionGoal: false,
                wasteReductionPercent: 0,
                wasteReductionBaselineYear: 0,
                wasteReductionTargetYear: 0,
                wasteIsAbsolute: true,
                waterReductionGoal: false,
                waterReductionPercent: 0,
                waterReductionBaselineYear: 0,
                waterReductionTargetYear: 0,
                waterIsAbsolute: true
            },
            fiscalYear: 'calendarYear',
            fiscalYearMonth: 'January',
            fiscalYearCalendarEnd: true,
            setupWizard: true,
            setupWizardComplete: false,
            energyIsSource: true
        }
    }
}