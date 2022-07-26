import { Injectable } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter, MeterPhase, MeterSource } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { EnergyUseCalculationsService } from 'src/app/shared/helper-services/energy-use-calculations.service';
import { UnitOption } from 'src/app/shared/unitOptions';
import { EditMeterFormService } from '../energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { FuelTypeOption, SourceOptions } from '../energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { ColumnItem } from './excel-wizard/excel-wizard.service';

@Injectable({
  providedIn: 'root'
})
export class ImportMeterService {

  constructor(private energyUnitsHelperService: EnergyUnitsHelperService, private energyUseCalculationsService: EnergyUseCalculationsService,
    private utilityMeterdbService: UtilityMeterdbService, private editMeterFormService: EditMeterFormService) { }

  getMetersSummaryFromTemplateFile(data: Array<any>, selectedFacility: IdbFacility, facilityMeters: Array<IdbUtilityMeter>): ImportMeterFileSummary {
    let existingMeters: Array<IdbUtilityMeter> = new Array();
    let newMeters: Array<IdbUtilityMeter> = new Array();
    let invalidMeters: Array<IdbUtilityMeter> = new Array();
    data.forEach(dataItem => {
      let checkHasData: boolean = false;
      Object.keys(dataItem).forEach((key) => {
        if (dataItem[key] != null) {
          checkHasData = true;
        }
      });
      if (checkHasData) {
        let importMeter: ImportMeter = this.parseDataItem(dataItem);
        let newMeter: IdbUtilityMeter = this.getNewMeterFromImportMeter(importMeter, selectedFacility);
        let importMeterStatus: { meter: IdbUtilityMeter, status: "existing" | "new" | "invalid" } = this.getImportMeterStatus(newMeter, facilityMeters);
        if (importMeterStatus.status == "new") {
          newMeters.push(importMeterStatus.meter);
        } else if (importMeterStatus.status == "existing") {
          existingMeters.push(importMeterStatus.meter);
        } else if (importMeterStatus.status == "invalid") {
          invalidMeters.push(importMeterStatus.meter);
        }
      }
    });
    return {
      existingMeters: existingMeters,
      newMeters: newMeters,
      invalidMeters: invalidMeters,
      skippedMeters: []
    }
  }

  parseDataItem(dataItem: any): ImportMeter {
    return {
      accountNumber: dataItem["Account Number"],
      location: dataItem["Building / Location"],
      collectionUnit: dataItem["Collection Unit"],
      fuel: dataItem["Fuel"],
      heatCapacity: dataItem["Heat Capacity"],
      meterGroup: dataItem["Meter Group"],
      meterName: dataItem["Meter Name"],
      meterNumber: dataItem["Meter Number"],
      notes: dataItem["Notes"],
      phase: dataItem["Phase"],
      siteToSource: dataItem["Site To Source"],
      source: dataItem["Source"],
      utilitySupplier: dataItem["Utility Supplier"]
    }
  }


  getNewMeterFromImportMeter(importMeter: ImportMeter, selectedFacility: IdbFacility): IdbUtilityMeter {
    let newMeter: IdbUtilityMeter = this.utilityMeterdbService.getNewIdbUtilityMeter(selectedFacility.guid, selectedFacility.accountId, false, undefined, selectedFacility.energyUnit);
    newMeter.meterNumber = importMeter.meterNumber;
    newMeter.accountNumber = importMeter.accountNumber;
    newMeter.source = this.checkImportSource(importMeter.source);
    newMeter.phase = this.checkImportPhase(importMeter.phase);
    newMeter.name = importMeter.meterName;
    newMeter.supplier = importMeter.utilitySupplier;
    newMeter.notes = importMeter.notes;
    newMeter.location = importMeter.location;
    newMeter.group = importMeter.meterGroup;
    newMeter.fuel = importMeter.fuel;
    newMeter.startingUnit = this.checkImportStartingUnit(importMeter.collectionUnit, newMeter.source, newMeter.phase, newMeter.fuel);
    newMeter.heatCapacity = importMeter.heatCapacity;
    if (!newMeter.heatCapacity) {
      let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(newMeter.startingUnit);
      if (!isEnergyUnit) {
        let fuelTypeOptions: Array<FuelTypeOption> = this.energyUseCalculationsService.getFuelTypeOptions(newMeter.source, newMeter.phase);
        let fuel: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == newMeter.fuel });
        newMeter.heatCapacity = this.energyUseCalculationsService.getHeatingCapacity(newMeter.source, newMeter.startingUnit, newMeter.energyUnit, fuel);
      }
    }
    newMeter.siteToSource = importMeter.siteToSource;
    newMeter.emissionsOutputRate = this.energyUseCalculationsService.getEmissionsOutputRate(newMeter.source, newMeter.fuel, newMeter.phase, newMeter.energyUnit);
    return newMeter;
  }


  checkImportSource(source: string): MeterSource {
    let selectedSource: MeterSource = SourceOptions.find(sourceOption => { return sourceOption == source });
    return selectedSource;
  }

  checkImportPhase(phase: string): MeterPhase {
    if (phase == 'Gas' || phase == 'Liquid' || phase == 'Solid') {
      return phase;
    }
    return undefined;
  }

  checkImportStartingUnit(importUnit: string, source: MeterSource, phase: MeterPhase, fuel: string): string {
    if (source) {
      let startingUnitOptions: Array<UnitOption> = this.energyUnitsHelperService.getStartingUnitOptions(source, phase, fuel);
      let selectedUnitOption: UnitOption = startingUnitOptions.find(unitOption => { return unitOption.value == importUnit });
      if (selectedUnitOption) {
        return selectedUnitOption.value;
      }
    }
    return undefined;
  }

  checkImportFuel(fuel: string, source: MeterSource, phase: MeterPhase): string {
    let fuelTypeOptions = this.energyUseCalculationsService.getFuelTypeOptions(source, phase);
    let selectedEnergyOption: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == fuel });
    if (selectedEnergyOption) {
      return selectedEnergyOption.value;
    }
    return undefined;
  }

  getImportMeterStatus(importMeter: IdbUtilityMeter, facilityMeters: Array<IdbUtilityMeter>): { meter: IdbUtilityMeter, status: "existing" | "new" | "invalid" } {
    let meterForm: FormGroup = this.editMeterFormService.getFormFromMeter(importMeter);
    if (meterForm.invalid) {
      return { meter: importMeter, status: 'invalid' };
    } else {
      let facilityMeter: IdbUtilityMeter = facilityMeters.find(facilityMeter => { return facilityMeter.name == importMeter.name });
      if (facilityMeter) {
        //overide random meter number set
        if (facilityMeter.meterNumber) {
          meterForm.controls.meterNumber.patchValue(facilityMeter.meterNumber);
        }
        importMeter = this.editMeterFormService.updateMeterFromForm(facilityMeter, meterForm);
        return { meter: importMeter, status: 'existing' };;
      } else {
        return { meter: importMeter, status: 'new' };
      }
    }
  }

  getMetersSummaryFromExcelFile(groupItems: Array<ColumnItem>, selectedFacility: IdbFacility, facilityMeters: Array<IdbUtilityMeter>): ImportMeterFileSummary {
    let existingMeters: Array<IdbUtilityMeter> = new Array();
    let newMeters: Array<IdbUtilityMeter> = new Array();
    let invalidMeters: Array<IdbUtilityMeter> = new Array();
    groupItems.forEach(groupItem => {
      let newMeter: IdbUtilityMeter = this.getNewMeterFromExcelColumn(groupItem, selectedFacility);
      let importMeterStatus: { meter: IdbUtilityMeter, status: "existing" | "new" | "invalid" } = this.getImportMeterStatus(newMeter, facilityMeters);
      if (importMeterStatus.status == "new") {
        newMeters.push(importMeterStatus.meter);
      } else if (importMeterStatus.status == "existing") {
        existingMeters.push(importMeterStatus.meter);
      } else if (importMeterStatus.status == "invalid") {
        invalidMeters.push(importMeterStatus.meter);
      }
    });
    return {
      existingMeters: existingMeters,
      newMeters: newMeters,
      invalidMeters: invalidMeters,
      skippedMeters: []
    }
  }

  getNewMeterFromExcelColumn(groupItem: ColumnItem, selectedFacility: IdbFacility): IdbUtilityMeter {
    let newMeter: IdbUtilityMeter = this.utilityMeterdbService.getNewIdbUtilityMeter(selectedFacility.guid, selectedFacility.accountId, false, undefined, selectedFacility.energyUnit);
    let fuelType: { phase: MeterPhase, fuelTypeOption: FuelTypeOption } = this.energyUnitsHelperService.parseFuelType(groupItem.value);
    if (fuelType) {
      newMeter.source = "Other Fuels";
      newMeter.phase = fuelType.phase;
      newMeter.fuel = fuelType.fuelTypeOption.value;
      newMeter.heatCapacity = fuelType.fuelTypeOption.heatCapacityValue;
      newMeter.siteToSource = fuelType.fuelTypeOption.siteToSourceMultiplier;
      newMeter.emissionsOutputRate = fuelType.fuelTypeOption.emissionsOutputRate;
      //check if unit is in name
      let startingUnit: string = this.energyUnitsHelperService.parseStartingUnit(groupItem.value);
      if (startingUnit) {
        newMeter.startingUnit = startingUnit;
      } else {
        //use fuel option
        newMeter.startingUnit = fuelType.fuelTypeOption.startingUnit;
      }
      let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(startingUnit);
      if (isEnergyUnit) {
        newMeter.energyUnit = startingUnit;
      } else {
        newMeter.energyUnit = selectedFacility.energyUnit;
      }
    } else {
      newMeter.source = this.energyUnitsHelperService.parseSource(groupItem.value);
      newMeter.startingUnit = this.energyUnitsHelperService.parseStartingUnit(groupItem.value);
      if (newMeter.source == 'Electricity') {
        newMeter.startingUnit = 'kWh';
        newMeter.energyUnit = 'kWh';
      }
      if (newMeter.startingUnit && newMeter.source) {
        let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(newMeter.startingUnit);
        if (isEnergyUnit) {
          newMeter.energyUnit = newMeter.startingUnit;
        } else {
          newMeter.energyUnit = selectedFacility.energyUnit;
        }
        let showHeatCapacity: boolean = this.editMeterFormService.checkShowHeatCapacity(newMeter.source, newMeter.startingUnit);
        if (showHeatCapacity) {
          newMeter.heatCapacity = this.energyUseCalculationsService.getHeatingCapacity(newMeter.source, newMeter.startingUnit, newMeter.energyUnit);
        }
        let showSiteToSource: boolean = this.editMeterFormService.checkShowSiteToSource(newMeter.source, newMeter.startingUnit, newMeter.includeInEnergy);
        if (showSiteToSource) {
          newMeter.siteToSource = this.energyUseCalculationsService.getSiteToSource(newMeter.source);
        }
        newMeter.emissionsOutputRate = this.energyUseCalculationsService.getEmissionsOutputRate(newMeter.source, undefined, undefined, newMeter.energyUnit);
      }
    }
    newMeter.name = groupItem.value;
    //use import wizard name so that the name of the meter can be changed but 
    //we can still access the data using this value
    newMeter.importWizardName = groupItem.value;
    //start with random meter number
    newMeter.meterNumber = Math.random().toString(36).substr(2, 9);

    //TODO: set emissions output rate
    return newMeter;
  }



}


export interface ImportMeter {
  accountNumber: number,
  location: string,
  collectionUnit: string,
  fuel: string,
  heatCapacity: number,
  meterGroup: string,
  meterName: string,
  meterNumber: string,
  notes: string,
  phase: string,
  siteToSource: number,
  source: string,
  utilitySupplier: string
}

export interface ImportMeterFileSummary {
  existingMeters: Array<IdbUtilityMeter>,
  newMeters: Array<IdbUtilityMeter>,
  invalidMeters: Array<IdbUtilityMeter>
  skippedMeters: Array<IdbUtilityMeter>;
}