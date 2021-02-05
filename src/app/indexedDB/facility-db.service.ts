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

    deleteAllAccountFacilities(): void {
        let pendingFacilities = JSON.parse(JSON.stringify(this.accountFacilities.value));
        for (let i = 0; i < pendingFacilities.length; i++) {
            this.dbService.delete('facilities', pendingFacilities[i].id);
        }
    }

    addTestData() {
        TestFacilityData.forEach(facilityDataItem => {
            this.add(facilityDataItem);
        });
    }

    getNewIdbFacility(account: IdbAccount): IdbFacility {
        return {
            accountId: account.id,
            name: 'New Facility',
            country: undefined,
            state: undefined,
            address: undefined,
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
            }

        }
    }
}


export const TestFacilityData: Array<IdbFacility> = [
    {
        // id: undefined,
        // facilityid: 1, // Captin Crunch
        accountId: 1, // Captin Crunch
        name: 'Crunch-a-tize',
        country: 'USA',
        state: 'TN',
        address: '',
        type: 'Breakfast',
        size: 1000,
        units: 'ft',
        notes: 'Marketing',
        img: 'https://placthold.it/50x50',
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
        }
    },
    {
        // id: undefined,
        // facilityid: 2,
        accountId: 2, // Mini Wheats
        name: 'Frosted Side',
        country: 'USA',
        state: 'TN',
        address: '',
        type: 'Breakfast',
        size: 1000,
        units: 'ft',
        notes: 'Sugar',
        img: 'https://placthold.it/50x50',
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
        }
    },
    {
        // id: undefined,
        // facilityid: 3,
        accountId: 2, // Mini Wheats
        name: 'Plain Side',
        country: 'USA',
        state: 'TN',
        address: '',
        type: 'Breakfast',
        size: 1000,
        units: 'ft',
        notes: 'Boring',
        img: 'https://placthold.it/50x50',
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
        }
    },
    {
        // id: undefined,
        // facilityid: 4,
        accountId: 3, // Special K
        name: 'Almond Milk',
        country: 'USA',
        state: 'TN',
        address: '',
        type: 'Breakfast',
        size: 10,
        units: 'ft',
        notes: 'Fiber',
        img: 'https://placthold.it/50x50',
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
        }
    }
]