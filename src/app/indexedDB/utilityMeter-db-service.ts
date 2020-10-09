import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { resolve } from 'url';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterdbService {
  constructor(private dbService: NgxIndexedDBService) {}

    getAll() {
        return this.dbService.getAll('utilityMeter');
    }

    getByKey(index) {
        return this.dbService.getByKey('utilityMeter', index);
    }

    getById(meterid) {
        return this.dbService.getByIndex('utilityMeter', 'meterid', meterid);
    }

    getByIndex(facilityid) {
        return this.dbService.getByIndex('utilityMeter', 'facilityid', facilityid);
    }
    
    getAllByIndex(facilityid) {
        return this.dbService.getAllByIndex('utilityMeter', 'facilityid', facilityid);
    }

    count() {
        return this.dbService.count('utilityMeter');
    }

    add(facilityid,accountid) {
        return this.dbService.add('utilityMeter', { 
            facilityid: facilityid,
            accountid: accountid,
            meterNumber: '000',
            accountNumber: '000',
            type: '',
            phase: '',
            fuel: '',
            startingUnit: '',
            heatCapacity: '',
            siteToSource:'',
            group: '',
            name: '',
            location: '',
            supplier: '',
            notes: ''
        });
    }

    update(values) {
        return this.dbService.update('utilityMeter', values);
    }
    
    deleteIndex(index) {
        return this.dbService.delete('utilityMeter', index);
    }
}
