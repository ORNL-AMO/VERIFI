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

    addWithObservable(account: IdbAccount): Observable<any> {
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



    async addTestData() {
        await TestAccountData.forEach(accountItem => {
            this.addWithObservable(accountItem);
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
            volumeLiquidUnit: 'gal',
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
            setupWizard: true,
            setupWizardComplete: false,
        }
    }
}


export const TestAccountData: Array<IdbAccount> = [
    {
        // id: undefined,
        name: 'Mini Wheats',
        city: 'Marysville',
        state: 'KANSAS',
        zip: 66508,
        country: 'USA',
        address: '3474  Sigley Road',
        size: 16000,
        naics: '311',
        notes: 'The frosted kind',
        img: 'https://placehold.it/50x50',
        unitsOfMeasure: 'Imperial',
        energyUnit: 'kWh',
        volumeLiquidUnit: 'gal',
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
        setupWizard: false,
        setupWizardComplete: true,
    },
    {
        // id: undefined,
        name: 'Special K',
        city: 'New York',
        state: 'NEW YORK',
        zip: 10013,
        country: 'USA',
        address: '3539  Rosewood Lane',
        size: 100,
        naics: '311',
        notes: 'Good fiber',
        img: 'https://placehold.it/50x50',
        unitsOfMeasure: 'Imperial',
        energyUnit: 'kWh',
        volumeLiquidUnit: 'gal',
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
        setupWizard: false,
        setupWizardComplete: true,
    },
    {
        // id: undefined,
        name: 'Captain Crunch',
        city: 'Cleveland',
        state: 'OHIO',
        zip: 90210,
        country: 'USA',
        address: '4272  Vineyard Drive',
        size: 20000,
        naics: '311',
        notes: 'Not the berry kind.',
        img: 'https://placehold.it/50x50',
        unitsOfMeasure: 'Imperial',
        energyUnit: 'kWh',
        volumeLiquidUnit: 'gal',
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
        setupWizard: false,
        setupWizardComplete: true,
    }
]