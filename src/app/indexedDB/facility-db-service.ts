import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { resolve } from 'url';

@Injectable({
    providedIn: 'root'
})
export class FacilitydbService {
  constructor(private dbService: NgxIndexedDBService) {}

    getAll() {
        return this.dbService.getAll('facilities');
    }

    getByKey(index) {
        return this.dbService.getByKey('facilities', index);
    }

    getByIndex(accountid) {
        return this.dbService.getByIndex('facilities', 'accountid', accountid);
    }
    
    getAllByIndex(accountid) {
        return this.dbService.getAllByIndex('facilities', 'accountid', accountid);
    }

    count() {
        return this.dbService.count('facilities');
    }

    add(accountid) {
        return this.dbService.add('facilities', { 
            accountid: accountid,
            name: 'New Facility',
            country: '',
            state: '',
            address: '',
            type: '',
            teir: '',
            size: '',
            units: '',
            division: '',
            img: ''
        });
    }

    update(values) {
        return this.dbService.update('facilities', values);
    }
    
    deleteIndex(index) {
        return this.dbService.delete('facilities', index);
    }

    addTestData() {
        this.dbService.add('facilities', { 
            accountid: 1, // Captin Crunch
            name: 'Crunch-a-tize',
            country: 'USA',
            state: 'TN',
            address: '',
            type: 'Breakfast',
            tier: '1',
            size: '1000',
            units: 'ft',
            division: 'Marketing',
            img: 'https://placthold.it/50x50'}
        );
        this.dbService.add('facilities', { 
            accountid: 2, // Mini Wheats
            name: 'Frosted Side',
            country: 'USA',
            state: 'TN',
            address: '',
            type: 'Breakfast',
            tier: '1',
            size: '1000',
            units: 'ft',
            division: 'Sugar',
            img: 'https://placthold.it/50x50'}
        );
        this.dbService.add('facilities', { 
            accountid: 2, // Mini Wheats
            name: 'Plain Side',
            country: 'USA',
            state: 'TN',
            address: '',
            type: 'Breakfast',
            tier: '2',
            size: '1000',
            units: 'ft',
            division: 'Boring',
            img: 'https://placthold.it/50x50'}
        );
        return this.dbService.add('facilities', { 
            accountid: 3, // Special K
            name: 'Almond Milk',
            country: 'USA',
            state: 'TN',
            address: '',
            type: 'Breakfast',
            tier: '2',
            size: '10',
            units: 'ft',
            division: 'Fiber',
            img: 'https://placthold.it/50x50'
        }
        );
    }
}
