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

    // allFacilities: BehaviorSubject<Array<IdbFacility>>;
    accountFacilities: BehaviorSubject<Array<IdbFacility>>;
    selectedFacility: BehaviorSubject<IdbFacility>;

    constructor(private dbService: NgxIndexedDBService, private localStorageService: LocalStorageService, private accountDbService: AccountdbService) {
        this.accountFacilities = new BehaviorSubject<Array<IdbFacility>>(new Array());
        // this.allFacilities = new BehaviorSubject<Array<IdbFacility>>(new Array());
        this.selectedFacility = new BehaviorSubject<IdbFacility>(undefined);
        // this.accountDbService.selectedAccount.subscribe(() => {
        //     this.setAccountFacilities();
        // });
        // this.accountFacilities.subscribe(() => {
        //     this.setSelectedFacility();
        // });
        //subscribe after initialization
        this.selectedFacility.subscribe(facility => {
            if (facility) {
                this.localStorageService.store('facilityId', facility.id);
            }
        });
    }

    getInitialFacility(): number {
        let localStorageFacilityId: number = this.localStorageService.retrieve("facilityId");
        return localStorageFacilityId;
    }

    async initializeFacilityFromLocalStorage() {
        let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
        if (selectedAccount) {
            let allFacilities: Array<IdbFacility> = await this.getAll().toPromise();
            let accountFacilities: Array<IdbFacility> = allFacilities.filter(facility => { return facility.accountId == selectedAccount.guid });
            let storedFacilityId: number = this.localStorageService.retrieve("facilityId");
            if (storedFacilityId) {
                let selectedFacility: IdbFacility = accountFacilities.find(facility => { return facility.id == storedFacilityId });
                this.selectedFacility.next(selectedFacility);
            } else if (accountFacilities.length != 0) {
                this.selectedFacility.next(accountFacilities[0]);
            }
            // this.allFacilities.next(allFacilities);
            this.accountFacilities.next(accountFacilities);
        }
    }

    setAccountFacilities() {
        let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
        if (selectedAccount) {
            this.getAllByIndexRange('accountId', selectedAccount.guid).subscribe(facilities => {
                this.accountFacilities.next(facilities);
            });
        }else{
            this.accountFacilities.next([]);
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


    // setAllFacilities() {
    //     this.getAll().subscribe(allFacilities => {
    //         this.allFacilities.next(allFacilities);
    //     });
    // }

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
            // this.setAllFacilities();
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
            // this.setAllFacilities();
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
        let baselineYear: number = new Date().getUTCFullYear();
        let targetYear: number = baselineYear + 10;
        return {
            accountId: account.guid,
            guid: Math.random().toString(36).substr(2, 9),
            name: 'New Facility',
            country: 'US',
            city: account.city,
            state: account.state,
            zip: account.zip,
            address: account.address,
            naics1: account.naics1,
            naics2: account.naics2,
            naics3: account.naics3,
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
                energyReductionGoal: true,
                energyReductionPercent: 0,
                energyReductionBaselineYear: baselineYear,
                energyReductionTargetYear: targetYear,
                energyIsAbsolute: true,
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
                waterIsAbsolute: true
            },
            fiscalYear: 'calendarYear',
            fiscalYearMonth: 0,
            fiscalYearCalendarEnd: true,
            energyIsSource: true,
            contactName: undefined,
            contactEmail: undefined,
            contactPhone: undefined

        }
    }

    getFacilityNameById(id: number): string {
        let accountFacilites: Array<IdbFacility> = this.accountFacilities.getValue();
        let selectedFacility: IdbFacility = accountFacilites.find(facility => { return facility.id == id });
        if (selectedFacility) {
            return selectedFacility.name;
        }
        return '';
    }
}