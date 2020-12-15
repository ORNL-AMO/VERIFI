import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { ElectricityDataFilter } from 'src/app/models/electricityFilter';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';

@Injectable({
  providedIn: 'root'
})
export class UtilityMeterDataService {

  tableElectricityFilters: BehaviorSubject<Array<ElectricityDataFilter>>;
  electricityInputFilters: BehaviorSubject<Array<ElectricityDataFilter>>;
  constructor(private formBuilder: FormBuilder, private facilityDbService: FacilitydbService) {
    let defaultFilters: Array<ElectricityDataFilter> = this.getDefaultFilters();
    this.tableElectricityFilters = new BehaviorSubject<Array<ElectricityDataFilter>>(defaultFilters);
    this.electricityInputFilters = new BehaviorSubject<Array<ElectricityDataFilter>>(defaultFilters);
    this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      if (selectedFacility) {
        if (selectedFacility.electricityInputFilters) {
          this.electricityInputFilters.next(selectedFacility.electricityInputFilters);
        }
        if (selectedFacility.tableElectricityFilters) {
          this.electricityInputFilters.next(selectedFacility.tableElectricityFilters);
        }
      }
    });
  }

  getDefaultFilters(): Array<ElectricityDataFilter> {
    return [
      { id: 1, filter: false, name: 'supplyBlockAmount', display: 'Block Rates Supply Amt' },
      { id: 2, filter: false, name: 'supplyBlockCharge', display: 'Block Rates Supply Charge' },
      { id: 3, filter: false, name: 'flatRateAmount', display: 'Flat Rate Amt' },
      { id: 4, filter: false, name: 'flatRateCharge', display: 'Flat Rate Charge' },
      { id: 5, filter: false, name: 'peakAmount', display: 'On-Peak Amt' },
      { id: 6, filter: false, name: 'peakCharge', display: 'On-Peak Charge' },
      { id: 7, filter: false, name: 'offPeakAmount', display: 'Off-Peak Amt' },
      { id: 8, filter: false, name: 'offPeakCharge', display: 'Off-Peak Charge' },
      { id: 9, filter: false, name: 'demandBlockAmount', display: 'Block Rates Demand Amt' },
      { id: 10, filter: false, name: 'demandBlockCharge', display: 'Block Rates Demand Charge' },
      { id: 11, filter: false, name: 'generationTransmissionCharge', display: 'Generation and Transmission Charge' },
      { id: 12, filter: true, name: 'deliveryCharge', display: 'Delivery Charge' },
      { id: 13, filter: false, name: 'transmissionCharge', display: 'Transmission Charge' },
      { id: 14, filter: false, name: 'powerFactorCharge', display: 'Power Factor Charge' },
      { id: 15, filter: false, name: 'businessCharge', display: 'Local Business Charge' },
      { id: 16, filter: true, name: 'utilityTax', display: 'Local Utility Tax' },
      { id: 17, filter: true, name: 'latePayment', display: 'Late Payment' },
      { id: 18, filter: true, name: 'otherCharge', display: 'Other Charge' },
      { id: 0, filter: true, name: 'basicCharge', display: 'Basic Charge' },
    ]
  }

  //TODO validators based off of filters
  getElectricityMeterDataForm(meterData: IdbUtilityMeterData): FormGroup {
    return this.formBuilder.group({
      id: [meterData.id, Validators.required],
      meterId: [meterData.meterId, Validators.required],
      facilityId: [meterData.facilityId, Validators.required],
      accountId: [meterData.accountId, Validators.required],
      readDate: [meterData.readDate, Validators.required],
      unit: [meterData.unit, Validators.required],
      totalEnergyUse: [meterData.totalEnergyUse, Validators.required],
      totalCost: [meterData.totalCost, Validators.required],
      commodityCharge: [meterData.commodityCharge, Validators.required],
      deliveryCharge: [meterData.deliveryCharge, Validators.required],
      otherCharge: [meterData.otherCharge, Validators.required],
      checked: [meterData.checked, Validators.required],
      totalDemand: [meterData.totalDemand, Validators.required],
      basicCharge: [meterData.basicCharge, Validators.required],
      supplyBlockAmount: [meterData.supplyBlockAmount, Validators.required],
      supplyBlockCharge: [meterData.supplyBlockCharge, Validators.required],
      flatRateAmount: [meterData.flatRateAmount, Validators.required],
      flatRateCharge: [meterData.flatRateCharge, Validators.required],
      peakAmount: [meterData.peakAmount, Validators.required],
      peakCharge: [meterData.peakCharge, Validators.required],
      offPeakAmount: [meterData.offPeakAmount, Validators.required],
      offPeakCharge: [meterData.offPeakCharge, Validators.required],
      demandBlockAmount: [meterData.demandBlockAmount, Validators.required],
      demandBlockCharge: [meterData.demandBlockCharge, Validators.required],
      generationTransmissionCharge: [meterData.generationTransmissionCharge, Validators.required],
      transmissionCharge: [meterData.transmissionCharge, Validators.required],
      powerFactorCharge: [meterData.powerFactorCharge, Validators.required],
      businessCharge: [meterData.businessCharge, Validators.required],
      utilityTax: [meterData.utilityTax, Validators.required],
      latePayment: [meterData.latePayment, Validators.required]
    })
  }

  getGeneralMeterDataForm(meterData: IdbUtilityMeterData): FormGroup {
    return this.formBuilder.group({
      id: [meterData.id, Validators.required],
      meterId: [meterData.meterId, Validators.required],
      facilityId: [meterData.facilityId, Validators.required],
      accountId: [meterData.accountId, Validators.required],
      readDate: [meterData.readDate, Validators.required],
      unit: [meterData.unit, Validators.required],
      totalEnergyUse: [meterData.totalEnergyUse, Validators.required],
      totalCost: [meterData.totalCost, Validators.required],
      commodityCharge: [meterData.commodityCharge, Validators.required],
      deliveryCharge: [meterData.deliveryCharge, Validators.required],
      otherCharge: [meterData.otherCharge, Validators.required],
      checked: [meterData.checked, Validators.required]
    });
  }

  meterExport(meterList: Array<{ idbMeter: IdbUtilityMeter, meterDataItems: Array<IdbUtilityMeterData> }>, source: string) {
    let csv;
    for (let i = 0; i < meterList.length; i++) {
      const replacer = (key, value) => value === null ? '' : value; // specify how you want to handle null values here
      const header = Object.keys(meterList[i].meterDataItems[0]);

      header.splice(0, 4); // remove 1st 4 headers
      header.splice(0, 1, "meterNumber"); // add meterNumber

      csv = meterList[i].meterDataItems.map(row => header.map(fieldName => JSON.stringify(row[fieldName], replacer)).join(','));

      // add meterNumber as first cell
      for (let j = 0; j < csv.length; j++) {
        csv[j] = '"' + meterList[i].idbMeter.meterNumber + '"' + csv[j];
      }

      csv.unshift(header.join(','));
      csv = csv.join('\r\n');

      //Download the file as CSV
      var downloadLink = document.createElement("a");
      var blob = new Blob(["\ufeff", csv]);
      var url = URL.createObjectURL(blob);
      downloadLink.href = url;
      //TODO: Verify "Natural Gas" with a space is okay.
      downloadLink.download = "Verifi_" + source + "_Meter_Data_Dump.csv";
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  }
}