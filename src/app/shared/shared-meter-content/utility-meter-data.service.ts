import { Injectable } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { ElectricityDataFilters, EmissionsFilters, GeneralInformationFilters, GeneralUtilityDataFilters, VehicleDataFilters } from 'src/app/models/meterDataFilter';
import * as _ from 'lodash';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { MeterSource } from 'src/app/models/constantsAndTypes';
import { maxDateValidator, minDateValidator } from '../customFormValidators';
import { getMeterDataDateString } from '../dateHelperFunctions';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Injectable({
  providedIn: 'root'
})
export class UtilityMeterDataService {

  tableElectricityFilters: BehaviorSubject<ElectricityDataFilters>;
  tableGeneralUtilityFilters: BehaviorSubject<GeneralUtilityDataFilters>;
  tableVehicleDataFilters: BehaviorSubject<VehicleDataFilters>;
  electricityInputFilters: BehaviorSubject<ElectricityDataFilters>;

  constructor(private formBuilder: FormBuilder, private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService
  ) {
    let defaultFilters: ElectricityDataFilters = this.getDefaultFilters();
    this.tableElectricityFilters = new BehaviorSubject<ElectricityDataFilters>(defaultFilters);
    this.electricityInputFilters = new BehaviorSubject<ElectricityDataFilters>(defaultFilters);
    let defaultGeneralFilters: GeneralUtilityDataFilters = this.getDefaultGeneralFilters();
    this.tableGeneralUtilityFilters = new BehaviorSubject<GeneralUtilityDataFilters>(defaultGeneralFilters);

    let defaultVehicleFilters: VehicleDataFilters = this.getDefaultVehicleFilters();
    this.tableVehicleDataFilters = new BehaviorSubject<VehicleDataFilters>(defaultVehicleFilters);

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

        if (selectedFacility.tableGeneralUtilityFilters) {
          this.tableGeneralUtilityFilters.next(selectedFacility.tableGeneralUtilityFilters)
        }

        if (selectedFacility.tableVehicleDataFilters) {
          this.tableVehicleDataFilters.next(selectedFacility.tableVehicleDataFilters);
        }
      }
    });
  }

  checkSavedFilters(dataFilters: ElectricityDataFilters): ElectricityDataFilters {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (!dataFilters.emissionsFilters) {
      dataFilters.emissionsFilters = this.getDefaultEmissionsFilters(account ? account.displayEmissions : false);
    }
    if (!dataFilters.generalInformationFilters) {
      dataFilters.generalInformationFilters = this.getDefaultGeneralInformationFilters();
    }
    return dataFilters;
  }


  getDefaultFilters(): ElectricityDataFilters {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    return {
      emissionsFilters: this.getDefaultEmissionsFilters(account ? account.displayEmissions : false),
      generalInformationFilters: this.getDefaultGeneralInformationFilters()
    }
  }

  getDefaultGeneralInformationFilters(): GeneralInformationFilters {
    return {
      showSection: true,
      totalCost: true,
      realDemand: true,
      billedDemand: true,
      powerFactor: true
    }
  }

  getDefaultEmissionsFilters(displayEmissions: boolean): EmissionsFilters {
    return {
      showSection: displayEmissions,
      marketEmissions: displayEmissions,
      locationEmissions: displayEmissions,
      excessRECs: displayEmissions,
      excessRECsEmissions: displayEmissions,
      recs: true
    }
  }

  getDefaultGeneralFilters(): GeneralUtilityDataFilters {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    return {
      totalVolume: true,
      totalCost: true,
      stationaryBiogenicEmmissions: account && account.displayEmissions ? true : false,
      stationaryCarbonEmissions: account && account.displayEmissions ? true : false,
      stationaryOtherEmissions: account && account.displayEmissions ? true : false,
      totalEmissions: account && account.displayEmissions ? true : false,
    }
  }

  getDefaultVehicleFilters(): VehicleDataFilters {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    return {
      totalEnergy: true,
      totalCost: true,
      mobileBiogenicEmissions: account && account.displayEmissions ? true : false,
      mobileCarbonEmissions: account && account.displayEmissions ? true : false,
      mobileOtherEmissions: account && account.displayEmissions ? true : false,
      mobileTotalEmissions: account && account.displayEmissions ? true : false
    }
  }

  getElectricityMeterDataForm(meterData: IdbUtilityMeterData): FormGroup {
    let dateString: string = getMeterDataDateString(meterData);
    let chargesArray: FormArray = this.formBuilder.array(meterData.charges ? meterData.charges.map(charge => {
      return this.formBuilder.group({
        chargeGuid: [charge.chargeGuid],
        chargeAmount: [charge.chargeAmount],
        chargeUsage: [charge.chargeUsage]
      });
    }) : []);

    return this.formBuilder.group({
      readDate: [dateString, [Validators.required, maxDateValidator(), minDateValidator()]],
      //ISSUE 1176: Validators.min(0) removed
      totalEnergyUse: [meterData.totalEnergyUse, [Validators.required]],
      totalCost: [meterData.totalCost, [Validators.min(0)]],
      totalRealDemand: [meterData.totalRealDemand, [Validators.min(0)]],
      totalBilledDemand: [meterData.totalBilledDemand, [Validators.min(0)]],
      isEstimated: [meterData.isEstimated || false],
      chargesArray: chargesArray,
      powerFactor: [meterData.powerFactor, [Validators.min(0), Validators.max(1)]]
    })
  }


  updateElectricityMeterDataFromForm(meterData: IdbUtilityMeterData, form: FormGroup, uploadedFilePath?: string): IdbUtilityMeterData {
    let dateData: Array<string> = form.controls.readDate.value.split('-');
    meterData.year = parseInt(dateData[0]);
    meterData.month = parseInt(dateData[1]);
    meterData.day = parseInt(dateData[2]);
    meterData.totalEnergyUse = form.controls.totalEnergyUse.value;
    meterData.totalCost = form.controls.totalCost.value;
    meterData.totalRealDemand = form.controls.totalRealDemand.value;
    meterData.totalBilledDemand = form.controls.totalBilledDemand.value;
    meterData.isEstimated = form.controls.isEstimated.value;
    if (uploadedFilePath != undefined && uploadedFilePath != null && uploadedFilePath != 'Deleted') {
      meterData.uploadedFilePath = uploadedFilePath;
      meterData.isBillConnected = true;
    }
    if (uploadedFilePath == 'Deleted') {
      meterData.uploadedFilePath = undefined;
      meterData.isBillConnected = false;
    }


    let chargesArray: FormArray = form.get('chargesArray') as FormArray;
    if (!meterData.charges) {
      meterData.charges = [];
    }
    meterData.charges = chargesArray.controls.map(chargeGroup => {
      return {
        chargeGuid: chargeGroup.get('chargeGuid').value,
        chargeAmount: chargeGroup.get('chargeAmount').value,
        chargeUsage: chargeGroup.get('chargeUsage').value
      };
    });
    meterData.powerFactor = form.controls.powerFactor.value;
    return meterData;
  }


  getGeneralMeterDataForm(meterData: IdbUtilityMeterData, displayVolumeInput: boolean, displayEnergyInput: boolean, displayHeatCapacity: boolean, displayFuelEfficiency: boolean, source: MeterSource): FormGroup {
    let dateString: string = getMeterDataDateString(meterData);
    let totalVolumeValidators: Array<ValidatorFn> = [];
    if (displayVolumeInput) {
      totalVolumeValidators = [Validators.required, Validators.min(0)]
    }
    let totalEnergyUseValidators: Array<ValidatorFn> = [];
    if (displayEnergyInput) {
      if (source == 'Natural Gas' || source == 'Other Energy' || source == 'Other Fuels') {
        totalEnergyUseValidators = [Validators.required];
      }
      else {
        totalEnergyUseValidators = [Validators.required, Validators.min(0)];
      }
    }

    let heatCapacityValidators: Array<ValidatorFn> = [];
    if (displayHeatCapacity) {
      heatCapacityValidators = [Validators.required, Validators.min(0)];
    }

    let vehicleFuelEfficiencyValidators: Array<ValidatorFn> = [];
    if (displayFuelEfficiency) {
      vehicleFuelEfficiencyValidators = [Validators.required, Validators.min(0)];
    }
    let chargesArray: FormArray = this.formBuilder.array(meterData.charges ? meterData.charges.map(charge => {
      return this.formBuilder.group({
        chargeGuid: [charge.chargeGuid],
        chargeAmount: [charge.chargeAmount],
        chargeUsage: [charge.chargeUsage]
      });
    }) : []);

    let form: FormGroup = this.formBuilder.group({
      readDate: [dateString, [Validators.required, maxDateValidator(), minDateValidator()]],
      totalVolume: [meterData.totalVolume, totalVolumeValidators],
      totalEnergyUse: [meterData.totalEnergyUse, totalEnergyUseValidators],
      totalCost: [meterData.totalCost],
      isEstimated: [meterData.isEstimated || false],
      heatCapacity: [meterData.heatCapacity, heatCapacityValidators],
      vehicleFuelEfficiency: [meterData.vehicleFuelEfficiency, vehicleFuelEfficiencyValidators],
      chargesArray: chargesArray
    });
    form.controls.heatCapacity.disable();
    form.controls.vehicleFuelEfficiency.disable();
    return form;
  }

  updateGeneralMeterDataFromForm(meterData: IdbUtilityMeterData, form: FormGroup, uploadedFilePath?: string): IdbUtilityMeterData {
    let dateData: Array<string> = form.controls.readDate.value.split('-');
    meterData.year = parseInt(dateData[0]);
    meterData.month = parseInt(dateData[1]);
    meterData.day = parseInt(dateData[2]);
    meterData.totalVolume = form.controls.totalVolume.value;
    meterData.totalEnergyUse = form.controls.totalEnergyUse.value;
    meterData.totalCost = form.controls.totalCost.value;
    meterData.isEstimated = form.controls.isEstimated.value;
    meterData.heatCapacity = form.controls.heatCapacity.value;
    meterData.vehicleFuelEfficiency = form.controls.vehicleFuelEfficiency.value;
    if (uploadedFilePath != undefined && uploadedFilePath != null && uploadedFilePath != 'Deleted') {
      meterData.uploadedFilePath = uploadedFilePath;
      meterData.isBillConnected = true;
    }
    if (uploadedFilePath == 'Deleted') {
      meterData.uploadedFilePath = undefined;
      meterData.isBillConnected = false;
    }
    let chargesArray: FormArray = form.get('chargesArray') as FormArray;
    if (!meterData.charges) {
      meterData.charges = [];
    }
    meterData.charges = chargesArray.controls.map(chargeGroup => {
      return {
        chargeGuid: chargeGroup.get('chargeGuid').value,
        chargeAmount: chargeGroup.get('chargeAmount').value,
        chargeUsage: chargeGroup.get('chargeUsage').value
      };
    });
    return meterData;
  }
}