import { NgxIndexedDBService } from 'ngx-indexed-db';
import { Injectable } from '@angular/core';
import { resolve } from 'url';

@Injectable({
    providedIn: 'root'
})
export class UtilityMeterDatadbService {
  constructor(private dbService: NgxIndexedDBService) {}

    getAll() {
        return this.dbService.getAll('utilityMeterData');
    }

    getByKey(index) {
        return this.dbService.getByKey('utilityMeterData', index);
    }

    getById(meterid) {
        return this.dbService.getByIndex('utilityMeterData', 'meterid', meterid);
    }

    getByIndex(facilityid) {
        return this.dbService.getByIndex('utilityMeterData', 'facilityid', facilityid);
    }

    getAllByFacility(facilityid) {
        return this.dbService.getAllByIndex('utilityMeterData', 'facilityid', facilityid);
    }
    
    getAllByIndex(meterid) {
        return this.dbService.getAllByIndex('utilityMeterData', 'meterid', meterid);
    }

    count() {
        return this.dbService.count('utilityMeterData');
    }

    add(meterid,facilityid,accountid) {
        return this.dbService.add('utilityMeterData', { 
            meterid: meterid,
            facilityid: facilityid,
            accountid: accountid,
            readDate: '',
            unit: '',
            totalEnergyUse: '',
            totalCost: '',
            commodityCharge: '',
            deliveryCharge: '',
            otherCharge: '',
            checked: false,
            // Electricity Use Only
            totalDemand: '',
            basicCharge: '',
            supplyBlockAmt: '',
            supplyBlockCharge: '',
            flatRateAmt: '',
            flatRateCharge: '',
            peakAmt: '',
            peakCharge: '',
            offpeakAmt: '',
            offpeakCharge: '',
            demandBlockAmt: '',
            demandBlockCharge: '',
            genTransCharge: '',
            transCharge: '',
            powerFactorCharge: '',
            businessCharge: '',
            utilityTax: '',
            latePayment: ''
        });
    }

    update(values) {
        return this.dbService.update('utilityMeterData', values);
    }
    
    deleteIndex(index) {
        return this.dbService.delete('utilityMeterData', index);
    }
}
