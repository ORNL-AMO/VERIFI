import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class NaturalGasdbService {
  constructor(private dbService: NgxIndexedDBService) {}

    getAll() {
        return this.dbService.getAll('naturalGasData');
    }

    getByKey(index) {
        return this.dbService.getByKey('naturalGasData', index);
    }

    getById(meterid) {
        return this.dbService.getByIndex('naturalGasData', 'meterid', meterid);
    }

    getByIndex(facilityid) {
        return this.dbService.getByIndex('naturalGasData', 'facilityid', facilityid);
    }
    
    getAllByIndex(meterid) {
        return this.dbService.getAllByIndex('naturalGasData', 'meterid', meterid);
    }

    count() {
        return this.dbService.count('naturalGasData');
    }

    add(meterid,facilityid,accountid) {
        return this.dbService.add('naturalGasData', { 
            meterid: meterid,
            facilityid: facilityid,
            accountid: accountid,
            readDate: '',
            totalVolume: '',
            commodityCharge: '',
            deliveryCharge: '',
            otherCharge: '',
        });
    }

    update(values) {
        return this.dbService.update('naturalGasData', values);
    }
    
    deleteIndex(index) {
        return this.dbService.delete('naturalGasData', index);
    }
}
