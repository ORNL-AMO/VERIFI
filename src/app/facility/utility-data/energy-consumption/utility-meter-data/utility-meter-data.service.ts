import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AdditionalChargesFilters, DetailedChargesFilters, ElectricityDataFilters, EmissionsFilters, GeneralInformationFilters, GeneralUtilityDataFilters } from 'src/app/models/meterDataFilter';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { MonthlyData } from 'src/app/models/calanderization';

@Injectable({
  providedIn: 'root'
})
export class UtilityMeterDataService {

  tableElectricityFilters: BehaviorSubject<ElectricityDataFilters>;
  tableGeneralUtilityFilters: BehaviorSubject<GeneralUtilityDataFilters>;
  
  electricityInputFilters: BehaviorSubject<ElectricityDataFilters>;

  constructor(private formBuilder: FormBuilder, private facilityDbService: FacilitydbService,
    private calanderizationService: CalanderizationService) {
    let defaultFilters: ElectricityDataFilters = this.getDefaultFilters();
    this.tableElectricityFilters = new BehaviorSubject<ElectricityDataFilters>(defaultFilters);
    this.electricityInputFilters = new BehaviorSubject<ElectricityDataFilters>(defaultFilters);
    let defaultGeneralFilters: GeneralUtilityDataFilters = this.getDefaultGeneralFilters();
    this.tableGeneralUtilityFilters = new BehaviorSubject<GeneralUtilityDataFilters>(defaultGeneralFilters)
    this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      if (selectedFacility) {
        if (selectedFacility.electricityInputFilters) {
          selectedFacility.electricityInputFilters = this.checkSavedFilters(selectedFacility.electricityInputFilters);
          this.electricityInputFilters.next(selectedFacility.electricityInputFilters);
        }
        if (selectedFacility.tableElectricityFilters) {
          selectedFacility.tableElectricityFilters = this.checkSavedFilters(selectedFacility.tableElectricityFilters);
          this.tableElectricityFilters.next(selectedFacility.tableElectricityFilters);
        }

        if(selectedFacility.tableGeneralUtilityFilters){
          this.tableGeneralUtilityFilters.next(selectedFacility.tableGeneralUtilityFilters)
        }
      }
    });
  }

  checkSavedFilters(dataFilters: ElectricityDataFilters): ElectricityDataFilters {
    if (!dataFilters.additionalCharges) {
      dataFilters.additionalCharges = this.getDefaultAdditionalChargesFilters();
    }
    if (!dataFilters.detailedCharges) {
      dataFilters.detailedCharges = this.getDefaultDetailChargesFilters();
    }
    if (!dataFilters.emissionsFilters) {
      dataFilters.emissionsFilters = this.getDefaultEmissionsFilters();
    }
    if (!dataFilters.generalInformationFilters) {
      dataFilters.generalInformationFilters = this.getDefaultGeneralInformationFilters();
    }
    return dataFilters;
  }


  getDefaultFilters(): ElectricityDataFilters {
    return {
      detailedCharges: this.getDefaultDetailChargesFilters(),
      additionalCharges: this.getDefaultAdditionalChargesFilters(),
      emissionsFilters: this.getDefaultEmissionsFilters(),
      generalInformationFilters: this.getDefaultGeneralInformationFilters()
    }
  }

  getDefaultDetailChargesFilters(): DetailedChargesFilters {
    return {
      showSection: false,
      block1: false,
      block2: false,
      block3: false,
      other: false,
      onPeak: false,
      offPeak: false,
      powerFactor: false
    }
  }


  getDefaultAdditionalChargesFilters(): AdditionalChargesFilters {
    return {
      showSection: false,
      nonEnergyCharge: false,
      transmissionAndDelivery: false,
      localSalesTax: false,
      stateSalesTax: false,
      latePayment: false,
      otherCharge: false,
    }
  }
  getDefaultGeneralInformationFilters(): GeneralInformationFilters {
    return {
      showSection: true,
      totalCost: true,
      realDemand: true,
      billedDemand: true
    }
  }

  getDefaultEmissionsFilters(): EmissionsFilters {
    return {
      showSection: true,
      marketEmissions: true,
      locationEmissions: true,
      recs: true,
      excessRecs: true,
      excessRecsEmissions: true
    }
  }

  getDefaultGeneralFilters(): GeneralUtilityDataFilters{
    return {
      totalVolume: true,
      totalCost: true,
      totalMarketEmissions: true,
      totalLocationEmissions: true,
      commodityCharge: true,
      deliveryCharge: true,
      otherCharge: true,
    }
  }

  getElectricityMeterDataForm(meterData: IdbUtilityMeterData): FormGroup {
    //need to use date string for calander to work in form
    let dateString: string;
    if (meterData.readDate && isNaN(new Date(meterData.readDate).getTime()) == false) {
      let datePipe: DatePipe = new DatePipe(navigator.language);
      let stringFormat: string = 'y-MM-dd'; // YYYY-MM-DD  
      dateString = datePipe.transform(meterData.readDate, stringFormat);
    }
    return this.formBuilder.group({
      readDate: [dateString, Validators.required],
      totalEnergyUse: [meterData.totalEnergyUse, [Validators.required, Validators.min(0)]],
      totalCost: [meterData.totalCost, [Validators.min(0)]],
      deliveryCharge: [meterData.deliveryCharge, [Validators.min(0)]],
      totalRealDemand: [meterData.totalRealDemand, [Validators.min(0)]],
      totalBilledDemand: [meterData.totalBilledDemand, [Validators.min(0)]],
      nonEnergyCharge: [meterData.nonEnergyCharge, [Validators.min(0)]],
      block1Consumption: [meterData.block1Consumption, [Validators.min(0)]],
      block1ConsumptionCharge: [meterData.block1ConsumptionCharge, [Validators.min(0)]],
      block2Consumption: [meterData.block2Consumption, [Validators.min(0)]],
      block2ConsumptionCharge: [meterData.block2ConsumptionCharge, [Validators.min(0)]],
      block3Consumption: [meterData.block3Consumption, [Validators.min(0)]],
      block3ConsumptionCharge: [meterData.block3ConsumptionCharge, [Validators.min(0)]],
      otherConsumption: [meterData.otherConsumption, [Validators.min(0)]],
      otherConsumptionCharge: [meterData.otherConsumptionCharge, [Validators.min(0)]],
      onPeakAmount: [meterData.onPeakAmount, [Validators.min(0)]],
      onPeakCharge: [meterData.onPeakCharge, [Validators.min(0)]],
      offPeakAmount: [meterData.offPeakAmount, [Validators.min(0)]],
      offPeakCharge: [meterData.offPeakCharge, [Validators.min(0)]],
      transmissionAndDeliveryCharge: [meterData.transmissionAndDeliveryCharge, [Validators.min(0)]],
      powerFactor: [meterData.powerFactor, [Validators.min(0)]],
      powerFactorCharge: [meterData.powerFactorCharge, [Validators.min(0)]],
      localSalesTax: [meterData.localSalesTax, [Validators.min(0)]],
      stateSalesTax: [meterData.stateSalesTax, [Validators.min(0)]],
      latePayment: [meterData.latePayment, [Validators.min(0)]],
      otherCharge: [meterData.otherCharge, [Validators.min(0)]]
    })
  }


  updateElectricityMeterDataFromForm(meterData: IdbUtilityMeterData, form: FormGroup): IdbUtilityMeterData {
    //UTC date is one day behind from form
    let formDate: Date = new Date(form.controls.readDate.value)
    meterData.readDate = new Date(formDate.getUTCFullYear(), formDate.getUTCMonth(), formDate.getUTCDate());
    meterData.totalEnergyUse = form.controls.totalEnergyUse.value;
    meterData.totalCost = form.controls.totalCost.value;
    meterData.deliveryCharge = form.controls.deliveryCharge.value;
    meterData.totalRealDemand = form.controls.totalRealDemand.value;
    meterData.totalBilledDemand = form.controls.totalBilledDemand.value;
    meterData.nonEnergyCharge = form.controls.nonEnergyCharge.value;
    meterData.block1Consumption = form.controls.block1Consumption.value;
    meterData.block1ConsumptionCharge = form.controls.block1ConsumptionCharge.value;
    meterData.block2Consumption = form.controls.block2Consumption.value;
    meterData.block2ConsumptionCharge = form.controls.block2ConsumptionCharge.value;
    meterData.block3Consumption = form.controls.block3Consumption.value;
    meterData.block3ConsumptionCharge = form.controls.block3ConsumptionCharge.value;
    meterData.otherConsumption = form.controls.otherConsumption.value;
    meterData.otherConsumptionCharge = form.controls.otherConsumptionCharge.value;
    meterData.onPeakAmount = form.controls.onPeakAmount.value;
    meterData.onPeakCharge = form.controls.onPeakCharge.value;
    meterData.offPeakAmount = form.controls.offPeakAmount.value;
    meterData.offPeakCharge = form.controls.offPeakCharge.value;
    meterData.transmissionAndDeliveryCharge = form.controls.transmissionAndDeliveryCharge.value;
    meterData.powerFactor = form.controls.powerFactor.value;
    meterData.powerFactorCharge = form.controls.powerFactorCharge.value;
    meterData.localSalesTax = form.controls.localSalesTax.value;
    meterData.stateSalesTax = form.controls.stateSalesTax.value;
    meterData.latePayment = form.controls.latePayment.value;
    meterData.otherCharge = form.controls.otherCharge.value;
    return meterData;
  }


  getGeneralMeterDataForm(meterData: IdbUtilityMeterData, displayVolumeInput: boolean, displayEnergyInput: boolean): FormGroup {
    //need to use date string for calander to work in form 
    let dateString: string;
    if (meterData.readDate && isNaN(new Date(meterData.readDate).getTime()) == false) {
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


  checkForErrors(meterData: Array<IdbUtilityMeterData>, meter: IdbUtilityMeter): { error: Date, warning: Date, missingMonth: Date } {
    if (meterData && meterData.length != 0) {
      let orderedData: Array<IdbUtilityMeterData> = _.orderBy(meterData, 'readDate', 'desc');
      let meterDataDates: Array<Date> = orderedData.map(data => { return data.readDate });
      for (let index = 0; index < meterDataDates.length - 1; index++) {
        let date1: Date = new Date(meterDataDates[index]);
        let date2: Date = new Date(meterDataDates[index + 1]);
        if (date1.getUTCMonth() == date2.getUTCMonth() && date1.getUTCFullYear() == date2.getUTCFullYear()) {
          if (date1.getUTCDate() == date2.getUTCDate()) {
            return { error: date1, warning: undefined, missingMonth: undefined }
          } else if (!meter.ignoreDuplicateMonths) {
            return { error: undefined, warning: date1, missingMonth: undefined }
          }
        }
      }

      if (!meter.ignoreMissingMonths) {
        let meterCopy: IdbUtilityMeter = JSON.parse(JSON.stringify(meter));
        meterCopy.meterReadingDataApplication = "fullMonth";

        //calanderizationEnergyUnit doesn't matter, used for emissions. Hardcoded 'MMBtu'
        let calanderizedData: Array<MonthlyData> = this.calanderizationService.calanderizeMeterData(meterCopy, orderedData, false, 'MMBtu', false, false);
        for (let index = 0; index < calanderizedData.length; index++) {
          let dataItem: MonthlyData = calanderizedData[index];
          if (dataItem.energyUse == 0 && dataItem.energyConsumption == 0) {
            return { error: undefined, warning: undefined, missingMonth: new Date(dataItem.date) };
          }
        }
      }
    }

    return { error: undefined, warning: undefined, missingMonth: undefined };
  }
}