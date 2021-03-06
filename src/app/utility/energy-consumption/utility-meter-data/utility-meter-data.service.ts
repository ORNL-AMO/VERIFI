import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { ElectricityDataFilters } from 'src/app/models/electricityFilter';
import { IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';

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
      showTotalDemand: true,
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
    let dateString: string;
    if (meterData.readDate) {
      let datePipe: DatePipe = new DatePipe(navigator.language);
      let stringFormat: string = 'y-MM-dd'; // YYYY-MM-DD  
      dateString = datePipe.transform(meterData.readDate, stringFormat);
    }
    return this.formBuilder.group({
      readDate: [dateString, Validators.required],
      totalEnergyUse: [meterData.totalEnergyUse, [Validators.required, Validators.min(0)]],
      totalCost: [meterData.totalCost],
      deliveryCharge: [meterData.deliveryCharge],
      otherCharge: [meterData.otherCharge],
      totalDemand: [meterData.totalDemand],
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
    //UTC date is one day behind from form
    let formDate: Date = new Date(form.controls.readDate.value)
    meterData.readDate = new Date(formDate.getUTCFullYear(), formDate.getUTCMonth(), formDate.getUTCDate());
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
    let dateString: string;
    if (meterData.readDate) {
      let datePipe: DatePipe = new DatePipe(navigator.language);
      let stringFormat: string = 'y-MM-dd'; // YYYY-MM-DD  
      dateString = datePipe.transform(meterData.readDate, stringFormat);
    }
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
      totalCost: [meterData.totalCost],
      commodityCharge: [meterData.commodityCharge],
      deliveryCharge: [meterData.deliveryCharge],
      otherCharge: [meterData.otherCharge],
    });
  }

  updateGeneralMeterDataFromForm(meterData: IdbUtilityMeterData, form: FormGroup): IdbUtilityMeterData {
    //UTC date is one day behind from form
    let formDate: Date = new Date(form.controls.readDate.value)
    meterData.readDate = new Date(formDate.getUTCFullYear(), formDate.getUTCMonth(), formDate.getUTCDate());
    meterData.totalVolume = form.controls.totalVolume.value;
    meterData.totalEnergyUse = form.controls.totalEnergyUse.value;
    meterData.totalCost = form.controls.totalCost.value;
    meterData.commodityCharge = form.controls.commodityCharge.value;
    meterData.deliveryCharge = form.controls.deliveryCharge.value;
    meterData.otherCharge = form.controls.otherCharge.value;
    return meterData;
  }


  checkForErrors(meterData: Array<IdbUtilityMeterData>): Date {
    let orderedData: Array<IdbUtilityMeterData> = _.orderBy(meterData, 'readDate', 'desc');
    let meterDataDates: Array<Date> = orderedData.map(data => { return data.readDate });
    for (let index = 0; index < meterDataDates.length - 1; index++) {
      let date1: Date = new Date(meterDataDates[index]);
      let date2: Date = new Date(meterDataDates[index + 1]);
      if(date1.getUTCMonth() == date2.getUTCMonth() && date1.getUTCFullYear() == date2.getUTCFullYear()){
        return date1;
      }
    }
    return;
  }
}