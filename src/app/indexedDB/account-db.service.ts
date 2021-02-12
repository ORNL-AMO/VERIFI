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
        this.setAllAccounts();
        let localStorageAccountId: number = this.localStorageService.retrieve("accountId");
        this.setSelectedAccount(localStorageAccountId);

        this.selectedAccount.subscribe(account => {
            if (account) {
                this.localStorageService.store("accountId", account.id);
            }
        });
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
                this.addTestData();
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
        this.dbService.add('accounts', account).subscribe(newAccountId => {
            this.setAllAccounts();
            this.setSelectedAccount(newAccountId);
        });
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
    addTestData() {
        TestAccountData.forEach(accountItem => {
            this.add(accountItem);
        });
    }

    getNewIdbAccount(): IdbAccount {
        return {
            name: 'New Account',
            city: '',
            state: '',
            zip: 90210,
            country: '',
            address: '',
            size: 0,
            naics: '000000',
            notes: '',
            img: 'https://placehold.it/50x50',
            // id: undefined,            
            unitsOfMeasure: 'Imperial',
            energyUnit: 'kWh',
            volumeLiquidUnit: 'SCF',
            volumeGasUnit: 'SCF',
            chilledWaterUnit: undefined,
            massUnit: 'lb',
            sustainabilityQuestions: {
                energyReductionGoal: false,
                energyReductionPercent: 0,
                energyReductionBaselineYear: 0,
                energyReductionTargetYear: 0,
                greenhouseReductionGoal: false,
                greenhouseReductionPercent: 0,
                greenhouseReductionBaselineYear: 0,
                greenhouseReductionTargetYear: 0,
                renewableEnergyGoal: false,
                renewableEnergyPercent: 0,
                renewableEnergyBaselineYear: 0,
                renewableEnergyTargetYear: 0,
                wasteReductionGoal: false,
                wasteReductionPercent: 0,
                wasteReductionBaselineYear: 0,
                wasteReductionTargetYear: 0,
                waterReductionGoal: false,
                waterReductionPercent: 0,
                waterReductionBaselineYear: 0,
                waterReductionTargetYear: 0,
            },
            fiscalYear: 'calendarYear',
            fiscalYearMonth: 'January',
            fiscalYearCalendarEnd: true,

        }
    }
}


export const TestAccountData: Array<IdbAccount> = [
    {
        // id: undefined,
        name: 'Captain Crunch',
        city: '',
        state: '',
        zip: 90210,
        country: '',
        address: '',
        size: 0,
        naics: '123456',
        notes: 'Delicious',
        img: 'https://placehold.it/50x50',
        unitsOfMeasure: 'Imperial',
        energyUnit: 'kWh',
        volumeLiquidUnit: 'SCF',
        volumeGasUnit: 'SCF',
        chilledWaterUnit: undefined,
        massUnit: 'lb',
        sustainabilityQuestions: {
            energyReductionGoal: false,
            energyReductionPercent: 0,
            energyReductionBaselineYear: 0,
            energyReductionTargetYear: 0,
            greenhouseReductionGoal: false,
            greenhouseReductionPercent: 0,
            greenhouseReductionBaselineYear: 0,
            greenhouseReductionTargetYear: 0,
            renewableEnergyGoal: false,
            renewableEnergyPercent: 0,
            renewableEnergyBaselineYear: 0,
            renewableEnergyTargetYear: 0,
            wasteReductionGoal: false,
            wasteReductionPercent: 0,
            wasteReductionBaselineYear: 0,
            wasteReductionTargetYear: 0,
            waterReductionGoal: false,
            waterReductionPercent: 0,
            waterReductionBaselineYear: 0,
            waterReductionTargetYear: 0,
        },
        fiscalYear: 'calendarYear',
        fiscalYearMonth: 'January',
        fiscalYearCalendarEnd: true,

    },
    {
        // id: undefined,
        name: 'Mini Wheets',
        city: '',
        state: '',
        zip: 90210,
        country: '',
        address: '',
        size: 0,
        naics: '555555',
        notes: 'The frosted kind',
        img: 'https://placehold.it/50x50',
        unitsOfMeasure: 'Imperial',
        energyUnit: 'kWh',
        volumeLiquidUnit: 'SCF',
        volumeGasUnit: 'SCF',
        chilledWaterUnit: undefined,
        massUnit: 'lb',
        sustainabilityQuestions: {
            energyReductionGoal: false,
            energyReductionPercent: 0,
            energyReductionBaselineYear: 0,
            energyReductionTargetYear: 0,
            greenhouseReductionGoal: false,
            greenhouseReductionPercent: 0,
            greenhouseReductionBaselineYear: 0,
            greenhouseReductionTargetYear: 0,
            renewableEnergyGoal: false,
            renewableEnergyPercent: 0,
            renewableEnergyBaselineYear: 0,
            renewableEnergyTargetYear: 0,
            wasteReductionGoal: false,
            wasteReductionPercent: 0,
            wasteReductionBaselineYear: 0,
            wasteReductionTargetYear: 0,
            waterReductionGoal: false,
            waterReductionPercent: 0,
            waterReductionBaselineYear: 0,
            waterReductionTargetYear: 0,
        },
        fiscalYear: 'calendarYear',
        fiscalYearMonth: 'January',
        fiscalYearCalendarEnd: true,
    },
    {
        // id: undefined,
        name: 'Special K',
        city: '',
        state: '',
        zip: 90210,
        country: '',
        address: '',
        size: 0,
        naics: '234567',
        notes: 'Not the worst',
        img: 'https://placehold.it/50x50',
        unitsOfMeasure: 'Imperial',
        energyUnit: 'kWh',
        volumeLiquidUnit: 'SCF',
        volumeGasUnit: 'SCF',
        chilledWaterUnit: undefined,
        massUnit: 'lb',
        sustainabilityQuestions: {
            energyReductionGoal: false,
            energyReductionPercent: 0,
            energyReductionBaselineYear: 0,
            energyReductionTargetYear: 0,
            greenhouseReductionGoal: false,
            greenhouseReductionPercent: 0,
            greenhouseReductionBaselineYear: 0,
            greenhouseReductionTargetYear: 0,
            renewableEnergyGoal: false,
            renewableEnergyPercent: 0,
            renewableEnergyBaselineYear: 0,
            renewableEnergyTargetYear: 0,
            wasteReductionGoal: false,
            wasteReductionPercent: 0,
            wasteReductionBaselineYear: 0,
            wasteReductionTargetYear: 0,
            waterReductionGoal: false,
            waterReductionPercent: 0,
            waterReductionBaselineYear: 0,
            waterReductionTargetYear: 0,
        },
        fiscalYear: 'calendarYear',
        fiscalYearMonth: 'January',
        fiscalYearCalendarEnd: true,
    }
]