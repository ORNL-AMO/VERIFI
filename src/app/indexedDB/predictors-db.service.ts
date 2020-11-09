import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class PredictordbService {
  constructor(private dbService: NgxIndexedDBService) {}

    getAll() {
        return this.dbService.getAll('predictors');
    }

    getByKey(index) {
        return this.dbService.getByKey('predictors', index);
    }

    getById(id) {
        return this.dbService.getByIndex('predictors', 'id', id);
    }
    
    getAllByFacility(facilityid) {
        return this.dbService.getAllByIndex('predictors', 'facilityid', facilityid);
    }

    getAllByName(name) {
        return this.dbService.getAllByIndex('predictors', 'name', name);
    }

    count() {
        return this.dbService.count('predictors');
    }

    async add(name,facilityid,accountid,date) {

        return this.dbService.add('predictors', { 
            facilityid: facilityid,
            accountid: accountid,
            name: name,
            desc: '',
            unit: '',
            date: date,
            amount: 0
        });
    }

    update(values) {
        return this.dbService.update('predictors', values);
    }
    
    deleteIndex(index) {
        return this.dbService.delete('predictors', index);
    }
}
