import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UtilityMeterDataService {

  electricityDataFilters: BehaviorSubject<Array<ElectricityDataFilter>>;
  constructor() {
    let defaultFilters: Array<ElectricityDataFilter> = this.getDefaultFilters();
    this.electricityDataFilters = new BehaviorSubject<Array<ElectricityDataFilter>>(defaultFilters);
  }

  getDefaultFilters(): Array<ElectricityDataFilter> {
    return [
      { id: 0, filter: true, name: 'basicCharge', display: 'Basic Charge' },
      { id: 1, filter: false, name: 'supplyBlockAmount', display: 'Supply Block Amt' },
      { id: 2, filter: false, name: 'supplyBlockCharge', display: 'Supply Block Charge' },
      { id: 3, filter: false, name: 'flatRateAmount', display: 'Flat Rate Amt' },
      { id: 4, filter: false, name: 'flatRateCharge', display: 'Flat Rate Charge' },
      { id: 5, filter: false, name: 'peakAmount', display: 'Peak Amt' },
      { id: 6, filter: false, name: 'peakCharge', display: 'Peak Charge' },
      { id: 7, filter: false, name: 'offPeakAmount', display: 'Off-Peak Amt' },
      { id: 8, filter: false, name: 'offPeakCharge', display: 'Off-Peak Charge' },
      { id: 9, filter: false, name: 'demandBlockAmount', display: 'Demand Block Amt' },
      { id: 10, filter: false, name: 'demandBlockCharge', display: 'Demand Block Charge' },
      { id: 11, filter: false, name: 'generationTransmissionCharge', display: 'Generation and Transmission Charge' },
      { id: 12, filter: true, name: 'deliveryCharge', display: 'Delivery Charge' },
      { id: 13, filter: false, name: 'transmissionCharge', display: 'Transmission Charge' },
      { id: 14, filter: false, name: 'powerFactorCharge', display: 'Power Factor Charge' },
      { id: 15, filter: false, name: 'businessCharge', display: 'Local Business Charge' },
      { id: 16, filter: true, name: 'utilityTax', display: 'Utility Tax' },
      { id: 17, filter: true, name: 'latePayment', display: 'Late Payment' },
      { id: 18, filter: true, name: 'otherCharge', display: 'Other Charge' }
    ]
  }
}


export interface ElectricityDataFilter {
  filter: boolean,
  display: string,
  id: number,
  name: string
}