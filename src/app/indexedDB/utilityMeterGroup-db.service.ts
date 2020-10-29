import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterGroupdbService {
  constructor(private dbService: NgxIndexedDBService) {}

    getAll() {
        return this.dbService.getAll('utilityMeterGroups');
    }

    getByKey(index) {
        return this.dbService.getByKey('utilityMeterGroups', index);
    }

    getByName(name) {
        return this.dbService.getByIndex('utilityMeterGroups', 'name', name);
    }

    getById(id) {
        return this.dbService.getByIndex('utilityMeterGroups', 'id', id);
    }

    getByIndex(facilityid) {
        return this.dbService.getByIndex('utilityMeterGroups', 'facilityid', facilityid);
    }
    
    getAllByIndex(facilityid) {
        return this.dbService.getAllByIndex('utilityMeterGroups', 'facilityid', facilityid);
    }

    count() {
        return this.dbService.count('utilityMeterGroups');
    }

    async add(type,unit,name,facilityid,accountid) {
        let groupid = this.count();
        return this.dbService.add('utilityMeterGroups', { 
            groupid: await groupid + 1,
            facilityid: facilityid,
            accountid: accountid,
            groupType: type,
            name: name,
            desc: '',
            unit: unit,
            data: [],
            dateModified: 'Unknown',
            fracTotEnergy: ''
        });
    }

    update(values) {
        return this.dbService.update('utilityMeterGroups', values);
    }
    
    deleteIndex(index) {
        return this.dbService.delete('utilityMeterGroups', index);
    }
}
