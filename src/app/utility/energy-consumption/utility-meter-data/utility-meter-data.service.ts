import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { ElectricityDataFilters } from 'src/app/models/electricityFilter';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';

@Injectable({
  providedIn: 'root'
})
export class UtilityMeterDataService {

  tableElectricityFilters: BehaviorSubject<ElectricityDataFilters>;
  electricityInputFilters: BehaviorSubject<ElectricityDataFilters>;
  constructor(private formBuilder: FormBuilder, private facilityDbService: FacilitydbService) {
    let defaultFilters: ElectricityDataFilters = this.getDefaultFilters();
    this.tableElectricityFilters = new BehaviorSubject<ElectricityDataFilters>(defaultFilters);
    this.electricityInputFilters = new BehaviorSubject<ElectricityDataFilters>(defaultFilters);
    this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      if (selectedFacility) {
        if (selectedFacility.electricityInputFilters) {
          this.electricityInputFilters.next(selectedFacility.electricityInputFilters);
        }
        if (selectedFacility.tableElectricityFilters) {
          this.tableElectricityFilters.next(selectedFacility.tableElectricityFilters);
        }
      }
    });
  }

  getDefaultFilters(): ElectricityDataFilters {
    return {
      supplyDemandCharge: {
        showSection: false,
        supplyBlockAmount: false,
        supplyBlockCharge: false,
        flatRateAmount: false,
        flatRateCharge: false,
        peakAmount: false,
        peakCharge: false,
        offPeakAmount: false,
        offPeakCharge: false,
        demandBlockAmount: false,
        demandBlockCharge: false,
      },
      taxAndOther: {
        showSection: true,
        utilityTax: true,
        latePayment: true,
        otherCharge: true,
        basicCharge: true,
        generationTransmissionCharge: false,
        deliveryCharge: false,
        transmissionCharge: false,
        powerFactorCharge: false,
        businessCharge: false
      }
    }
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
      totalVolume: [meterData.totalVolume, Validators.required],
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