import { Injectable } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { CsvImportData } from 'src/app/shared/helper-services/csv-to-json.service';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { EnergyUseCalculationsService } from 'src/app/shared/helper-services/energy-use-calculations.service';
import { UnitOption } from 'src/app/shared/unitOptions';
import { EditMeterFormService } from '../energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { FuelTypeOption, SourceOptions } from '../energy-consumption/energy-source/edit-meter-form/editMeterOptions';

@Injectable({
  providedIn: 'root'
})
export class ImportMeterService {

  constructor(private energyUnitsHelperService: EnergyUnitsHelperService, private energyUseCalculationsService: EnergyUseCalculationsService,
    private utilityMeterdbService: UtilityMeterdbService, private editMeterFormService: EditMeterFormService) { }

  importMetersFromDataFile(csvImportData: CsvImportData, selectedFacility: IdbFacility, facilityMeters: Array<IdbUtilityMeter>): ImportMeterFileSummary {
    let existingMeters: Array<IdbUtilityMeter> = new Array();
    let newMeters: Array<IdbUtilityMeter> = new Array();
    let invalidMeters: Array<IdbUtilityMeter> = new Array();
    csvImportData.data.forEach(dataItem => {
      let checkHasData: boolean = false;
      Object.keys(dataItem).forEach((key) => {
        if (dataItem[key] != null) {
          checkHasData = true;
        }
      });
      if (checkHasData) {
        let importMeter: ImportMeter = this.parseDataItem(dataItem);
        let newMeter: IdbUtilityMeter = this.getNewMeterFromImportMeter(importMeter, selectedFacility);
        let importMeterStatus: string = this.getImportMeterStatus(newMeter, facilityMeters);
        if (importMeterStatus == "new") {
          newMeters.push(newMeter);
        } else if (importMeterStatus == "existing") {
          existingMeters.push(newMeter);
        } else if (importMeterStatus == "invalid") {
          invalidMeters.push(newMeter);
        }
      }
    });
    return {
      existingMeters: existingMeters,
      newMeters: newMeters,
      invalidMeters: invalidMeters
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
    let newMeter: IdbUtilityMeter = this.utilityMeterdbService.getNewIdbUtilityMeter(selectedFacility.id, selectedFacility.accountId, false);
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
    newMeter.siteToSource = importMeter.siteToSource;
    return newMeter;
  }


  checkImportSource(source: string): string {
    let selectedSource: string = SourceOptions.find(sourceOption => { return sourceOption == source });
    return selectedSource;
  }

  checkImportPhase(phase: string): string {
    if (phase == 'Gas' || phase == 'Liquid' || phase == 'Solid') {
      return phase;
    }
    return undefined;
  }

  checkImportStartingUnit(importUnit: string, source: string, phase: string, fuel: string): string {
    if (source) {
      let startingUnitOptions: Array<UnitOption> = this.energyUnitsHelperService.getStartingUnitOptions(source, phase, fuel);
      let selectedUnitOption: UnitOption = startingUnitOptions.find(unitOption => { return unitOption.value == importUnit });
      if (selectedUnitOption) {
        return selectedUnitOption.value;
      }
    }
    return undefined;
  }

  checkImportFuel(fuel: string, source: string, phase: string): string {
    let fuelTypeOptions = this.energyUseCalculationsService.getFuelTypeOptions(source, phase);
    let selectedEnergyOption: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == fuel });
    if (selectedEnergyOption) {
      return selectedEnergyOption.value;
    }
    return undefined;
  }

  getImportMeterStatus(importMeter: IdbUtilityMeter, facilityMeters: Array<IdbUtilityMeter>): "invalid" | "existing" | "new" {
    let isMeterInvalid: boolean = this.editMeterFormService.getFormFromMeter(importMeter).invalid;
    if (isMeterInvalid) {
      return 'invalid';
    } else {
      let facilityMeter: IdbUtilityMeter = facilityMeters.find(facilityMeter => { return facilityMeter.name == importMeter.name });
      if (facilityMeter) {
        return 'existing';
      } else {
        return 'new';
      }
    }
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
}