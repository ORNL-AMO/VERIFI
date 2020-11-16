import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { IdbFacility } from '../models/idb';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class FacilitydbService {
    constructor(private dbService: NgxIndexedDBService) { }

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

    add(facility: IdbFacility): Observable<any> {
        return this.dbService.add('facilities', facility);
    }

    update(values: IdbFacility): Observable<any> {
        return this.dbService.update('facilities', values);
    }

    deleteIndex(facilityId: number): Observable<any> {
        return this.dbService.delete('facilities', facilityId);
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