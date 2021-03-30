import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbAccount, IdbFacility } from '../models/idb';
import { BehaviorSubject, Observable } from 'rxjs';
import { LocalStorageService } from 'ngx-webstorage';
import { AccountdbService } from './account-db.service';

@Injectable({
    providedIn: 'root'
})
export class FacilitydbService {

    allFacilities: BehaviorSubject<Array<IdbFacility>>;
    accountFacilities: BehaviorSubject<Array<IdbFacility>>;
    selectedFacility: BehaviorSubject<IdbFacility>;

    constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService, private accountDbService: AccountdbService) {
        this.accountFacilities = new BehaviorSubject<Array<IdbFacility>>(new Array());
        this.allFacilities = new BehaviorSubject<Array<IdbFacility>>(new Array());
        this.selectedFacility = new BehaviorSubject<IdbFacility>(undefined);
        this.setAllFacilities();
        this.initializeLocalFromLocalStorage();

        this.accountDbService.selectedAccount.subscribe(() => {
            this.setAccountFacilities();
        });

        this.accountFacilities.subscribe(() => {
            this.setSelectedFacility();
        });

        this.selectedFacility.subscribe(facility => {
            if (facility) {
                this.localStorageService.store('facilityId', facility.id);
            }
        });
    }

    initializeLocalFromLocalStorage() {
        let storedFacilityId: number = this.localStorageService.retrieve("facilityId");
        if (storedFacilityId) {
            this.getById(storedFacilityId).subscribe(facility => {
                this.selectedFacility.next(facility);
            });
        }
    }

    setAccountFacilities() {
        let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
        if (selectedAccount) {
            this.getAllByIndexRange('accountId', selectedAccount.id).subscribe(facilities => {
                this.accountFacilities.next(facilities);
            });
        }
    }

    setSelectedFacility() {
        let accountFacilities: Array<IdbFacility> = this.accountFacilities.getValue();
        let selectedFacility: IdbFacility = this.selectedFacility.getValue();
        if (selectedFacility) {
            let updatedFacility: IdbFacility = accountFacilities.find(facility => { return facility.id == selectedFacility.id });
            if (!updatedFacility) {
                this.selectedFacility.next(accountFacilities[0]);
            } else {
                this.selectedFacility.next(updatedFacility);
            }
        }
        else {
            this.selectedFacility.next(accountFacilities[0]);
        }
    }


    setAllFacilities() {
        this.getAll().subscribe(allFacilities => {
            this.allFacilities.next(allFacilities);
        });
    }

    getAll(): Observable<Array<IdbFacility>> {
        return this.dbService.getAll('facilities');
    }

    getById(facilityId: number): Observable<IdbFacility> {
        return this.dbService.getByKey('facilities', facilityId);
    }

    getByIndex(indexName: string, indexValue: number): Observable<IdbFacility> {
        return this.dbService.getByIndex('facilities', indexName, indexValue);
    }

    getAllByIndexRange(indexName: string, indexValue: number | string): Observable<Array<IdbFacility>> {
        let idbKeyRange: IDBKeyRange = IDBKeyRange.only(indexValue);
        return this.dbService.getAllByIndex('facilities', indexName, idbKeyRange);
    }

    count() {
        return this.dbService.count('facilities');
    }

    add(facility: IdbFacility): void {
        this.dbService.add('facilities', facility).subscribe(() => {
            this.setAllFacilities();
            this.setAccountFacilities();
        });
    }

    addWithObservable(facility: IdbFacility): Observable<any> {
        return this.dbService.add('facilities', facility);
    }

    deleteWithObservable(facilityId: number): Observable<any> {
        return this.dbService.delete('facilities', facilityId);
    }

    update(values: IdbFacility): void {
        this.dbService.update('facilities', values).subscribe(() => {
            this.setAllFacilities();
            this.setAccountFacilities();
        });
    }

    deleteById(facilityId: number): void {
        this.dbService.delete('facilities', facilityId).subscribe(() => {
            this.setAccountFacilities();
        });
    }

    async deleteAllSelectedAccountFacilities() {
        let accountFacilities: Array<IdbFacility> = this.accountFacilities.getValue();
        await this.deleteFacilitiesAsync(accountFacilities);
    }

    async deleteFacilitiesAsync(accountFacilities: Array<IdbFacility>) {
        for (let i = 0; i < accountFacilities.length; i++) {
            await this.deleteWithObservable(accountFacilities[i].id);
        }
    }


    async addTestData(allAccounts: Array<IdbAccount>) {
        await TestFacilityData.forEach(facilityDataItem => {
            //set account ID from corresponding account in db
            if (facilityDataItem.name == 'Frosted Side' || facilityDataItem.name == 'Plain Side') {
                let correspondingAccount: IdbAccount = allAccounts.find(account => { return account.name == 'Mini Wheats' });
                facilityDataItem.accountId = correspondingAccount.id;
            }
            if (facilityDataItem.name == 'Almond Milk') {
                let correspondingAccount: IdbAccount = allAccounts.find(account => { return account.name == 'Special K' });
                facilityDataItem.accountId = correspondingAccount.id;
            }
            if (facilityDataItem.name == 'Crunch-a-tize') {
                let correspondingAccount: IdbAccount = allAccounts.find(account => { return account.name == 'Captain Crunch' });
                facilityDataItem.accountId = correspondingAccount.id;
            }
            this.addWithObservable(facilityDataItem);
        });
    }

    getNewIdbFacility(account: IdbAccount): IdbFacility {
        return {
            accountId: account.id,
            name: 'New Facility',
            country: undefined,
            city: undefined,
            state: undefined,
            zip: undefined,
            address: undefined,
            naics: '',
            type: undefined,
            size: undefined,
            units: undefined,
            notes: undefined,
            img: undefined,
            // id: undefined
            unitsOfMeasure: account.unitsOfMeasure,
            energyUnit: account.energyUnit,
            volumeLiquidUnit: account.volumeLiquidUnit,
            volumeGasUnit: account.volumeGasUnit,
            chilledWaterUnit: account.chilledWaterUnit,
            massUnit: account.massUnit,
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


export const TestFacilityData: Array<IdbFacility> = [
    {
        // id: undefined,
        // facilityid: 2,
        accountId: 1, // Mini Wheats
        name: 'Frosted Side',
        country: 'USA',
        state: 'NEVADA',
        city: 'Reno',
        zip: 89501,
        address: '2193  Sheila Lane',
        naics: '311',
        type: 'Breakfast',
        size: 1000,
        units: 'ft',
        notes: 'Sugar',
        img: 'https://placthold.it/50x50',
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
    },
    {
        // id: undefined,
        // facilityid: 3,
        accountId: 1, // Mini Wheats
        name: 'Plain Side',
        country: 'USA',
        state: 'FLORIDA',
        city: 'Tampa',
        zip: 33602,
        address: '4051  Bernardo Street',
        naics: '311',
        type: 'Breakfast',
        size: 1000,
        units: 'ft',
        notes: 'Boring',
        img: 'https://placthold.it/50x50',
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
    },
    {
        // id: undefined,
        // facilityid: 4,
        accountId: 2, // Special K
        name: 'Almond Milk',
        country: 'USA',
        state: 'OHIO',
        city: 'Burton',
        zip: 44021,
        address: '3954  Shady Pines Drive',
        naics: '311',
        type: 'Breakfast',
        size: 1000,
        units: 'ft',
        notes: 'Fiber',
        img: 'https://placthold.it/50x50',
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
    },
    {
        // id: undefined,
        // facilityid: 1, // Captin Crunch
        accountId: 3, // Captin Crunch
        name: 'Crunch-a-tize',
        country: 'USA',
        state: 'CALIFORNIA',
        city: 'Newport Beach',
        zip: 92660,
        address: '4701  Elk Street',
        naics: '311',
        type: 'Breakfast',
        size: 1000,
        units: 'ft',
        notes: 'Marketing',
        img: 'https://placthold.it/50x50',
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
    }
]