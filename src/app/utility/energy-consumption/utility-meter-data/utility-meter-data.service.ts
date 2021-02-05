import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
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
    //need to use date string for calander to work in form
    let datePipe: DatePipe = new DatePipe(navigator.language);
    let stringFormat: string = 'y-MM-dd'; // YYYY-MM-DD
    let dateString: string = datePipe.transform(meterData.readDate, stringFormat);
    return this.formBuilder.group({
      readDate: [dateString, Validators.required],
      totalEnergyUse: [meterData.totalEnergyUse, [Validators.required, Validators.min(0)]],
      totalCost: [meterData.totalCost, [Validators.required, Validators.min(0)]],
      deliveryCharge: [meterData.deliveryCharge],
      otherCharge: [meterData.otherCharge],
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


  updateElectricityMeterDataFromForm(meterData: IdbUtilityMeterData, form: FormGroup): IdbUtilityMeterData {
    meterData.readDate = new Date(form.controls.readDate.value);
    meterData.totalEnergyUse = form.controls.totalEnergyUse.value;
    meterData.totalCost = form.controls.totalCost.value;
    meterData.deliveryCharge = form.controls.deliveryCharge.value;
    meterData.otherCharge = form.controls.otherCharge.value;
    meterData.totalDemand = form.controls.totalDemand.value;
    meterData.basicCharge = form.controls.basicCharge.value;
    meterData.supplyBlockAmount = form.controls.supplyBlockAmount.value;
    meterData.supplyBlockCharge = form.controls.supplyBlockCharge.value;
    meterData.flatRateAmount = form.controls.flatRateAmount.value;
    meterData.flatRateCharge = form.controls.flatRateCharge.value;
    meterData.peakAmount = form.controls.peakAmount.value;
    meterData.peakCharge = form.controls.peakCharge.value;
    meterData.offPeakAmount = form.controls.offPeakAmount.value;
    meterData.offPeakCharge = form.controls.offPeakCharge.value;
    meterData.demandBlockAmount = form.controls.demandBlockAmount.value;
    meterData.demandBlockCharge = form.controls.demandBlockCharge.value;
    meterData.generationTransmissionCharge = form.controls.generationTransmissionCharge.value;
    meterData.transmissionCharge = form.controls.transmissionCharge.value;
    meterData.powerFactorCharge = form.controls.powerFactorCharge.value;
    meterData.businessCharge = form.controls.businessCharge.value;
    meterData.utilityTax = form.controls.utilityTax.value;
    meterData.latePayment = form.controls.latePayment.value;
    return meterData;
  }


  getGeneralMeterDataForm(meterData: IdbUtilityMeterData, displayVolumeInput: boolean, displayEnergyInput: boolean): FormGroup {
    //need to use date string for calander to work in form 
    let datePipe: DatePipe = new DatePipe(navigator.language);
    let stringFormat: string = 'y-MM-dd'; // YYYY-MM-DD
    let dateString: string = datePipe.transform(meterData.readDate, stringFormat);
    let totalVolumeValidators: Array<ValidatorFn> = [];
    if (displayVolumeInput) {
      totalVolumeValidators = [Validators.required, Validators.min(0)]
    }
    let totalEnergyUseValidators: Array<ValidatorFn> = [];
    if (displayEnergyInput) {
      totalEnergyUseValidators = [Validators.required, Validators.min(0)];
    }
    return this.formBuilder.group({
      readDate: [dateString, Validators.required],
      totalVolume: [meterData.totalVolume, totalVolumeValidators],
      totalEnergyUse: [meterData.totalEnergyUse, totalEnergyUseValidators],
      totalCost: [meterData.totalCost, [Validators.required, Validators.min(0)]],
      commodityCharge: [meterData.commodityCharge],
      deliveryCharge: [meterData.deliveryCharge],
      otherCharge: [meterData.otherCharge],
    });
  }

  updateGeneralMeterDataFromForm(meterData: IdbUtilityMeterData, form: FormGroup): IdbUtilityMeterData {
    meterData.readDate = new Date(form.controls.readDate.value);
    meterData.totalVolume = form.controls.totalVolume.value;
    meterData.totalEnergyUse = form.controls.totalEnergyUse.value;
    meterData.totalCost = form.controls.totalCost.value;
    meterData.commodityCharge = form.controls.commodityCharge.value;
    meterData.deliveryCharge = form.controls.deliveryCharge.value;
    meterData.otherCharge = form.controls.otherCharge.value;
    return meterData;
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