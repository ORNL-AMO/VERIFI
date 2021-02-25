import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { UtilityMeterDataService } from '../energy-consumption/utility-meter-data/utility-meter-data.service';

@Injectable({
  providedIn: 'root'
})
export class ImportMeterDataService {

  constructor(private energyUnitsHelperService: EnergyUnitsHelperService, private utilityMeterDataService: UtilityMeterDataService) { }


  importMeterDataFromTemplateFile(data: Array<any>, selectedFacility: IdbFacility, facilityMeterData: Array<IdbUtilityMeterData>, facilityMeters: Array<IdbUtilityMeter>, isTemplateElectricity: boolean, metersToImport: Array<IdbUtilityMeter>): ImportMeterDataFileSummary {
    let existingMeterData: Array<IdbUtilityMeterData> = new Array();
    let newMeterData: Array<IdbUtilityMeterData> = new Array();
    let invalidMeterData: Array<IdbUtilityMeterData> = new Array();
    data.forEach(dataItem => {
      let checkHasData: boolean = false;
      Object.keys(dataItem).forEach((key) => {
        if (dataItem[key] != null) {
          checkHasData = true;
        }
      });
      if (checkHasData) {
        let importMeterData: IdbUtilityMeterData = this.parseMeterDataItem(dataItem, selectedFacility, facilityMeters, isTemplateElectricity);
        let importMeterStatus: string = this.getImportMeterStatus(importMeterData, facilityMeterData, facilityMeters, metersToImport);
        if (importMeterStatus == "new") {
          newMeterData.push(importMeterData);
        } else if (importMeterStatus == "existing") {
          existingMeterData.push(importMeterData);
        } else if (importMeterStatus == "invalid") {
          invalidMeterData.push(importMeterData);
        }
      }
    });
    return {
      existingMeterData: existingMeterData,
      newMeterData: newMeterData,
      invalidMeterData: invalidMeterData
    }
  }

  parseMeterDataItem(dataItem: any, facility: IdbFacility, facilityMeters: Array<IdbUtilityMeter>, isTemplateElectricity: boolean): IdbUtilityMeterData {
    let date: Date;
    if (dataItem["Read Date"]) {
      date = new Date(dataItem["Read Date"]);
    }
    let meterId: number;
    let meterNumber: string = dataItem["Meter Number"]
    let correspondingMeter: IdbUtilityMeter = this.getCorrespondingMeter(meterNumber, facilityMeters);
    if (correspondingMeter) {
      meterId = correspondingMeter.id;
    }
    let energyUse: number;
    let totalVolume: number;
    if (isTemplateElectricity) {
      energyUse = dataItem["Total Energy"];
    } else {
      //check meter, do math stuff
      if (correspondingMeter) {
        let displayVolumeInput: boolean = (this.energyUnitsHelperService.isEnergyUnit(correspondingMeter.startingUnit) == false);
        let displayEnergyUse: boolean = this.energyUnitsHelperService.isEnergyMeter(correspondingMeter.source);
        if (!displayVolumeInput) {
          energyUse = dataItem["Total Consumption"];
        } else {
          totalVolume = dataItem["Total Consumption"];
          if (displayEnergyUse && totalVolume) {
            energyUse = totalVolume * correspondingMeter.heatCapacity;
          }
        }
      }
    }
    return {
      //keys (id primary)
      id: undefined,
      meterId: meterId,
      facilityId: facility.id,
      accountId: facility.accountId,
      //data
      readDate: date,
      totalVolume: totalVolume,
      totalEnergyUse: energyUse,
      totalCost: dataItem["Total Cost"],
      commodityCharge: dataItem["Commodity Charge"],
      deliveryCharge: dataItem["Delivery Charge"],
      otherCharge: dataItem["Other Charge"],
      checked: false,
      totalDemand: dataItem["Total Demand"],
      basicCharge: dataItem["Basic Charge"],
      supplyBlockAmount: dataItem["Supply Block Amount"],
      supplyBlockCharge: dataItem["Supply Block Charge"],
      flatRateAmount: dataItem["Flat Rate Amount"],
      flatRateCharge: dataItem["Flat Rate Charge"],
      peakAmount: dataItem["Peak Amount"],
      peakCharge: dataItem["Peak Charge"],
      offPeakAmount: dataItem["Off Peak Amount"],
      offPeakCharge: dataItem["Off Peak charge"],
      demandBlockAmount: dataItem["Demand Block Amount"],
      demandBlockCharge: dataItem["Demand Block Charge"],
      generationTransmissionCharge: dataItem["Generation and Transmission Charge"],
      transmissionCharge: dataItem["Transmission Charge"],
      powerFactorCharge: dataItem["Power Factor Charge"],
      businessCharge: dataItem["Local Business Charge"],
      utilityTax: dataItem["Local Utility Tax"],
      latePayment: dataItem["Late Payment"],
      meterNumber: meterNumber
    }
  }


  getCorrespondingMeter(meterNumber: string, facilityMeters: Array<IdbUtilityMeter>): IdbUtilityMeter {
    if (meterNumber) {
      let meter: IdbUtilityMeter = facilityMeters.find(meter => { return meter.name == meterNumber || meter.meterNumber == meterNumber });
      return meter;
    }
    return undefined;
  }

  getImportMeterStatus(meterData: IdbUtilityMeterData, existingMeterData: Array<IdbUtilityMeterData>, facilityMeters: Array<IdbUtilityMeter>, metersToImport: Array<IdbUtilityMeter>) {
    let correspondingMeter: IdbUtilityMeter;

    if (meterData.meterId) {
      correspondingMeter = facilityMeters.find(meter => { return meter.id == meterData.meterId })
    } else {
      debugger
      correspondingMeter = metersToImport.find(meter => { return meter.meterNumber == meterData.meterNumber });
    }
    if (correspondingMeter) {
      let displayVolumeInput: boolean = (this.energyUnitsHelperService.isEnergyUnit(correspondingMeter.startingUnit) == false);
      let displayEnergyUse: boolean = this.energyUnitsHelperService.isEnergyMeter(correspondingMeter.source);
      let meterDataForm: FormGroup;
      if (correspondingMeter.source == 'Electricity') {
        meterDataForm = this.utilityMeterDataService.getElectricityMeterDataForm(meterData);
      } else {
        meterDataForm = this.utilityMeterDataService.getGeneralMeterDataForm(meterData, displayVolumeInput, displayEnergyUse);
      }
      if (meterDataForm.invalid) {
        return 'invalid';
      } else {
        //check exists

        return 'new';
      }

    } else {
      return 'invalid'
    }


  }
}


export interface ImportMeterDataFileSummary {
  existingMeterData: Array<IdbUtilityMeterData>,
  newMeterData: Array<IdbUtilityMeterData>,
  invalidMeterData: Array<IdbUtilityMeterData>
}