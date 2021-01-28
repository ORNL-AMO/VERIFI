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

  getElectricityMeterDataForm(meterData: IdbUtilityMeterData): FormGroup {
    return this.formBuilder.group({
      id: [meterData.id],
      meterId: [meterData.meterId],
      facilityId: [meterData.facilityId],
      accountId: [meterData.accountId],
      readDate: [meterData.readDate, Validators.required],
      unit: [meterData.unit],
      totalEnergyUse: [meterData.totalEnergyUse, [Validators.required, Validators.min(0)]],
      totalCost: [meterData.totalCost, [Validators.required, Validators.min(0)]],
      commodityCharge: [meterData.commodityCharge],
      deliveryCharge: [meterData.deliveryCharge],
      otherCharge: [meterData.otherCharge],
      checked: [meterData.checked],
      totalDemand: [meterData.totalDemand, [Validators.required, Validators.min(0)]],
      basicCharge: [meterData.basicCharge],
      supplyBlockAmount: [meterData.supplyBlockAmount],
      supplyBlockCharge: [meterData.supplyBlockCharge],
      flatRateAmount: [meterData.flatRateAmount],
      flatRateCharge: [meterData.flatRateCharge],
      peakAmount: [meterData.peakAmount],
      peakCharge: [meterData.peakCharge],
      offPeakAmount: [meterData.offPeakAmount],
      offPeakCharge: [meterData.offPeakCharge],
      demandBlockAmount: [meterData.demandBlockAmount],
      demandBlockCharge: [meterData.demandBlockCharge],
      generationTransmissionCharge: [meterData.generationTransmissionCharge],
      transmissionCharge: [meterData.transmissionCharge],
      powerFactorCharge: [meterData.powerFactorCharge],
      businessCharge: [meterData.businessCharge],
      utilityTax: [meterData.utilityTax],
      latePayment: [meterData.latePayment]
    })
  }

  getGeneralMeterDataForm(meterData: IdbUtilityMeterData): FormGroup {
    return this.formBuilder.group({
      id: [meterData.id],
      meterId: [meterData.meterId],
      facilityId: [meterData.facilityId],
      accountId: [meterData.accountId],
      readDate: [meterData.readDate, Validators.required],
      unit: [meterData.unit],
      totalVolume: [meterData.totalVolume, [Validators.required, Validators.min(0)]],
      totalEnergyUse: [meterData.totalEnergyUse],
      totalCost: [meterData.totalCost, [Validators.required, Validators.min(0)]],
      commodityCharge: [meterData.commodityCharge],
      deliveryCharge: [meterData.deliveryCharge],
      otherCharge: [meterData.otherCharge],
      checked: [meterData.checked]
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