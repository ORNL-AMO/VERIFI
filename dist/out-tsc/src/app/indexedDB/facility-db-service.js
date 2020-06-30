import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
let FacilitydbService = class FacilitydbService {
    constructor(dbService) {
        this.dbService = dbService;
    }
    getAll() {
        return this.dbService.getAll('facilities');
    }
    getByKey(index) {
        return this.dbService.getByKey('facilities', index);
    }
    getById(facilityid) {
        return this.dbService.getByIndex('facilities', 'facilityid', facilityid);
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
            facilityid: 1,
            accountid: 1,
            name: 'Crunch-a-tize',
            country: 'USA',
            state: 'TN',
            address: '',
            type: 'Breakfast',
            tier: '1',
            size: '1000',
            units: 'ft',
            division: 'Marketing',
            img: 'https://placthold.it/50x50'
        });
        this.dbService.add('facilities', {
            facilityid: 2,
            accountid: 2,
            name: 'Frosted Side',
            country: 'USA',
            state: 'TN',
            address: '',
            type: 'Breakfast',
            tier: '1',
            size: '1000',
            units: 'ft',
            division: 'Sugar',
            img: 'https://placthold.it/50x50'
        });
        this.dbService.add('facilities', {
            facilityid: 3,
            accountid: 2,
            name: 'Plain Side',
            country: 'USA',
            state: 'TN',
            address: '',
            type: 'Breakfast',
            tier: '2',
            size: '1000',
            units: 'ft',
            division: 'Boring',
            img: 'https://placthold.it/50x50'
        });
        return this.dbService.add('facilities', {
            facilityid: 4,
            accountid: 3,
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
        });
    }
};
FacilitydbService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], FacilitydbService);
export { FacilitydbService };
//# sourceMappingURL=facility-db-service.js.map