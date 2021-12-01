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
        this.accountDbService.selectedAccount.subscribe(() => {
            this.setAccountFacilities();
        });
        this.accountFacilities.subscribe(() => {
            this.setSelectedFacility();
        });
    }

    async initializeFacilityFromLocalStorage() {
        let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
        if (selectedAccount) {
            let allFacilities: Array<IdbFacility> = await this.getAll().toPromise();
            let accountFacilities: Array<IdbFacility> = allFacilities.filter(facility => { return facility.accountId == selectedAccount.id });
            let storedFacilityId: number = this.localStorageService.retrieve("facilityId");
            if (storedFacilityId) {
                let selectedFacility: IdbFacility = accountFacilities.find(facility => { return facility.id == storedFacilityId });
                this.selectedFacility.next(selectedFacility);
            } else if (accountFacilities.length != 0) {
                this.selectedFacility.next(accountFacilities[0]);
            }
            this.allFacilities.next(allFacilities);
            this.accountFacilities.next(accountFacilities);
        }
        //subscribe after initialization
        this.selectedFacility.subscribe(facility => {
            if (facility) {
                this.localStorageService.store('facilityId', facility.id);
            }
        });
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
                if (accountFacilities.length != 0) {
                    this.selectedFacility.next(accountFacilities[0]);
                } else {
                    this.selectedFacility.next(undefined);
                }
            } else {
                this.selectedFacility.next(updatedFacility);
            }
        }
        else if (accountFacilities.length != 0) {
            this.selectedFacility.next(accountFacilities[0]);
        } else {
            this.selectedFacility.next(undefined);
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

    addWithObservable(facility: IdbFacility): Observable<IdbFacility> {
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
            await this.deleteWithObservable(accountFacilities[i].id).toPromise();
        }
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
            naics1: undefined,
            naics2: undefined,
            naics3: undefined,
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
            massUnit: account.massUnit,
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
            energyIsSource: true

        }
    }
}