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
        if (accountFacilities.length != 0) {
            let selectedFacility: IdbFacility = this.selectedFacility.getValue();
            if (selectedFacility) {
                let updatedFacility: IdbFacility = accountFacilities.find(facility => { return facility.id == selectedFacility.id });
                if (!updatedFacility) {
                    this.selectedFacility.next(accountFacilities[0]);
                } else {
                    this.selectedFacility.next(updatedFacility);
                }
            } else {
                this.selectedFacility.next(accountFacilities[0]);
            }
        } else {
            let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
            if (selectedAccount) {
                let newFacility: IdbFacility = this.getNewIdbFacility(selectedAccount.id);
                this.add(newFacility);
            }
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
        for(let i=0; i<pendingFacilities.length; i++) {
            this.dbService.delete('facilities', pendingFacilities[i].id);
        }
    }

    addTestData() {
        TestFacilityData.forEach(facilityDataItem => {
            this.add(facilityDataItem);
        });
    }

    getNewIdbFacility(accountId: number): IdbFacility {
        return {
            accountId: accountId,
            name: 'New Facility',
            country: undefined,
            state: undefined,
            address: undefined,
            type: undefined,
            tier: undefined,
            size: undefined,
            units: undefined,
            division: undefined,
            img: undefined,
            // id: undefined
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
        tier: 1,
        size: 1000,
        units: 'ft',
        division: 'Marketing',
        img: 'https://placthold.it/50x50'
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
        tier: 1,
        size: 1000,
        units: 'ft',
        division: 'Sugar',
        img: 'https://placthold.it/50x50'
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
        tier: 2,
        size: 1000,
        units: 'ft',
        division: 'Boring',
        img: 'https://placthold.it/50x50'
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
        tier: 2,
        size: 10,
        units: 'ft',
        division: 'Fiber',
        img: 'https://placthold.it/50x50'
    }
]