import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbAccount } from '../models/idb';
import { BehaviorSubject, Observable } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';
import { ElectronService } from '../electron/electron.service';

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


    //TODO: MOVE
    // *WARNING* Can not be undone
    deleteDatabase() {
        try {
            this.dbService.deleteDatabase().subscribe(
                () => {
                    console.log('database deleted..');
                    this.finishDelete();
                },
                error => {
                    console.log(error);
                    this.finishDelete();
                }
            );
        } catch (err) {
            console.log('ERROR')
            console.log(err);
            this.finishDelete();
        }
    }

    finishDelete() {
        if (this.electronService.isElectron) {
            this.electronService.sendAppRelaunch();
        } else {
            location.reload()
        }
    }

    getNewIdbAccount(): IdbAccount {
        let baselineYear: number = new Date().getUTCFullYear();
        let targetYear: number = baselineYear + 10;
        return {
            guid: Math.random().toString(36).substr(2, 9),
            name: 'New Account',
            city: '',
            state: '',
            zip: undefined,
            country: 'US',
            address: '',
            size: 0,
            naics1: undefined,
            naics2: undefined,
            naics3: undefined,
            notes: '',
            img: '',
            // id: undefined,            
            unitsOfMeasure: 'Imperial',
            energyUnit: 'MMBtu',
            electricityUnit: 'kWh',
            volumeLiquidUnit: 'gal',
            volumeGasUnit: 'SCF',
            massUnit: 'lb',
            sustainabilityQuestions: {
                energyReductionGoal: true,
                energyReductionPercent: 25,
                energyReductionBaselineYear: baselineYear,
                energyReductionTargetYear: targetYear,
                energyIsAbsolute: false,
                greenhouseReductionGoal: false,
                greenhouseReductionPercent: 0,
                greenhouseReductionBaselineYear: baselineYear,
                greenhouseReductionTargetYear: targetYear,
                greenhouseIsAbsolute: true,
                renewableEnergyGoal: false,
                renewableEnergyPercent: 0,
                renewableEnergyBaselineYear: baselineYear,
                renewableEnergyTargetYear: targetYear,
                wasteReductionGoal: false,
                wasteReductionPercent: 0,
                wasteReductionBaselineYear: baselineYear,
                wasteReductionTargetYear: targetYear,
                wasteIsAbsolute: true,
                waterReductionGoal: false,
                waterReductionPercent: 0,
                waterReductionBaselineYear: baselineYear,
                waterReductionTargetYear: targetYear,
                waterIsAbsolute: false
            },
            fiscalYear: 'calendarYear',
            fiscalYearMonth: 0,
            fiscalYearCalendarEnd: true,
            setupWizard: true,
            setupWizardComplete: false,
            energyIsSource: true,
            contactName: undefined,
            contactEmail: undefined,
            contactPhone: undefined
        }
    }
}