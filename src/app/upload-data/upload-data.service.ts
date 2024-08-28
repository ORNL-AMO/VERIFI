import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import * as XLSX from 'xlsx';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { AccountdbService } from '../indexedDB/account-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import { EnergyUnitsHelperService } from '../shared/helper-services/energy-units-helper.service';
import { EditMeterFormService } from '../facility/utility-data/energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { UtilityMeterGroupdbService } from '../indexedDB/utilityMeterGroup-db.service';
import { UnitOption } from '../shared/unitOptions';
import { checkShowHeatCapacity, checkShowSiteToSource, getHeatingCapacity, getIsEnergyMeter, getIsEnergyUnit, getSiteToSource, getStartingUnitOptions } from '../shared/sharedHelperFuntions';
import { MeterPhase, MeterSource } from '../models/constantsAndTypes';
import { getMeterDataCopy } from '../calculations/conversions/convertMeterData';
import { FuelTypeOption } from '../shared/fuel-options/fuelTypeOption';;
import { ColumnGroup, ColumnItem, FacilityGroup, FileReference, ParsedTemplate } from './upload-data-models';
import { UploadDataV1Service } from './upload-data-v1.service';
import { UploadDataV2Service } from './upload-data-v2.service';
import * as _ from 'lodash';
import { IdbAccount } from '../models/idbModels/account';
import { IdbFacility } from '../models/idbModels/facility';
import { getNewIdbUtilityMeterGroup, IdbUtilityMeterGroup } from '../models/idbModels/utilityMeterGroup';
import { getNewIdbUtilityMeter, IdbUtilityMeter } from '../models/idbModels/utilityMeter';
import { getNewIdbUtilityMeterData, IdbUtilityMeterData } from '../models/idbModels/utilityMeterData';
import { PredictorDbService } from '../indexedDB/predictor-db.service';
import { PredictorDataDbService } from '../indexedDB/predictor-data-db.service';
import { getNewIdbPredictor, IdbPredictor } from '../models/idbModels/predictor';
import { getNewIdbPredictorData, IdbPredictorData } from '../models/idbModels/predictorData';
import { checkSameDay, checkSameMonth } from './upload-helper-functions';

@Injectable({
  providedIn: 'root'
})
export class UploadDataService {

  fileReferences: Array<FileReference>;
  allFilesSet: BehaviorSubject<boolean>;
  uploadMeters: Array<IdbUtilityMeter>;
  constructor(private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService, private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private energyUnitsHelperService: EnergyUnitsHelperService,
    private editMeterFormService: EditMeterFormService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private uploadDataV1Service: UploadDataV1Service,
    private uploadDataV2Service: UploadDataV2Service) {
    this.allFilesSet = new BehaviorSubject<boolean>(false);
    this.fileReferences = new Array();
    this.uploadMeters = new Array();
  }


  getFileReference(file: File, workBook: XLSX.WorkBook, inSetupWizard: boolean): FileReference {
    let isTemplate: "V1" | "V2" | "Non-template" = this.checkSheetNamesForTemplate(workBook.SheetNames);
    if (isTemplate == "Non-template") {
      let accountFacilities: Array<IdbFacility> = this.facilityDbService.getAccountFacilitiesCopy();

      return {
        name: file.name,
        file: file,
        dataSubmitted: false,
        id: Math.random().toString(36).substr(2, 9),
        workbook: workBook,
        isTemplate: false,
        selectedWorksheetName: workBook.Workbook.Sheets[0].name,
        selectedWorksheetData: [],
        columnGroups: [],
        meterFacilityGroups: [],
        predictorFacilityGroups: [],
        headerMap: [],
        importFacilities: accountFacilities,
        meters: [],
        meterData: [],
        predictors: [],
        predictorData: [],
        skipExistingReadingsMeterIds: [],
        skipExistingPredictorFacilityIds: [],
        newMeterGroups: [],
        selectedFacilityId: undefined
      };
    } else {
      //parse template
      let templateData: ParsedTemplate = this.parseTemplate(workBook, isTemplate, inSetupWizard);
      let predictorFacilityGroups: Array<FacilityGroup> = this.getPredictorFacilityGroups(templateData);
      let fileName: string = 'Upload File';
      if (file) {
        fileName = file.name;
      }
      return {
        name: fileName,
        file: file,
        dataSubmitted: false,
        id: Math.random().toString(36).substr(2, 9),
        workbook: workBook,
        isTemplate: true,
        selectedWorksheetName: undefined,
        selectedWorksheetData: [],
        columnGroups: [],
        meterFacilityGroups: [],
        predictorFacilityGroups: predictorFacilityGroups,
        headerMap: [],
        importFacilities: templateData.importFacilities,
        meters: templateData.importMeters,
        meterData: templateData.meterData,
        predictors: templateData.predictors,
        predictorData: templateData.predictorData,
        skipExistingReadingsMeterIds: [],
        skipExistingPredictorFacilityIds: [],
        newMeterGroups: templateData.newGroups,
        selectedFacilityId: undefined
      };
    }
  }

  checkSheetNamesForTemplate(sheetNames: Array<string>): "V1" | "V2" | "Non-template" {
    if (sheetNames[0] == "V2" && sheetNames[1] == "Help" && sheetNames[2] == "HIDE_Lists" && sheetNames[3] == "HIDE_Meter_Lists" &&
      sheetNames[4] == "Facilities" && sheetNames[5] == "Meters-Utilities" && sheetNames[6] == "HIDE_Meters-Utilites" && sheetNames[7] == "Electricity"
      && sheetNames[8] == "Stationary Fuel - Other Energy" && sheetNames[9] == "Mobile Fuel" && sheetNames[10] == "Water" && sheetNames[11] == "Other Utility - Emission"
      && sheetNames[12] == "Predictors" && sheetNames[13] == "Fix Me" && sheetNames[14] == "HIDE_NAICS3") {
      return "V2";
    }
    //sheet names for V2 updated issue 1627
    else if (sheetNames[0] == "V2" && sheetNames[1] == "Getting Started" && sheetNames[2] == "HIDE_Lists" && sheetNames[3] == "HIDE_Meter_Lists" &&
      sheetNames[4] == "Facilities" && sheetNames[5] == "Meters-Utilities" && sheetNames[6] == "HIDE_Meters-Utilites" && sheetNames[7] == "Electricity"
      && sheetNames[8] == "Stationary Fuel - Other Energy" && sheetNames[9] == "Mobile Fuel" && sheetNames[10] == "Water" && sheetNames[11] == "Other Utility - Emission"
      && sheetNames[12] == "Predictors" && sheetNames[13] == "Troubleshooting" && sheetNames[14] == "HIDE_NAICS3") {
      console.log("V2.2")
      return "V2";
    } else if (sheetNames[0] == "Help" && sheetNames[1] == 'Facilities' && sheetNames[2] == "Meters-Utilities" && sheetNames[3] == "Electricity" && sheetNames[4] == "Non-electricity" && sheetNames[5] == "Predictors") {
      return "V1";
    } else {
      return "Non-template";
    }
  }

  parseTemplate(workbook: XLSX.WorkBook, templateVersion: "V1" | "V2", inSetupWizard: boolean): ParsedTemplate {
    if (templateVersion == "V1") {
      return this.uploadDataV1Service.parseTemplate(workbook, inSetupWizard);
    } else if (templateVersion == "V2") {
      console.log('V2!');
      return this.uploadDataV2Service.parseTemplate(workbook, inSetupWizard);
    }
  }


  getMeterGroup(groupName: string, facilityId: string, newGroups: Array<IdbUtilityMeterGroup>): { group: IdbUtilityMeterGroup, newGroups: Array<IdbUtilityMeterGroup> } {
    let accountGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.getAccountMeterGroupsCopy();
    let facilityGroups: Array<IdbUtilityMeterGroup> = accountGroups.filter(accountGroup => { return accountGroup.facilityId == facilityId });
    let dbGroup: IdbUtilityMeterGroup = facilityGroups.find(group => { return group.name == groupName || group.guid == groupName });
    if (dbGroup) {
      return { group: dbGroup, newGroups: newGroups }
    } else {
      let newFacilityGroups: Array<IdbUtilityMeterGroup> = newGroups.filter(group => { return group.facilityId == facilityId });
      dbGroup = newFacilityGroups.find(newGroup => { return newGroup.name == groupName });
      if (dbGroup) {
        return { group: dbGroup, newGroups: newGroups }
      } else if (groupName) {
        let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
        dbGroup = getNewIdbUtilityMeterGroup("Energy", groupName, facilityId, account.guid);
        newGroups.push(dbGroup);
        return { group: dbGroup, newGroups: newGroups }
      } else {
        return { group: undefined, newGroups: newGroups }
      }
    }
  }


  getMeterDataEntries(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>): Array<IdbUtilityMeterData> {
    let isTemplate: "V1" | "V2" | "Non-template" = this.checkSheetNamesForTemplate(workbook.SheetNames);
    if (isTemplate == "V1") {
      return this.uploadDataV1Service.getMeterDataEntries(workbook, importMeters);
    } else if (isTemplate == "V2") {
      return this.uploadDataV2Service.getUtilityMeterData(workbook, importMeters);
    }
    return [];
  }

  getMeterFacilityGroups(templateData: { importFacilities: Array<IdbFacility>, importMeters: Array<IdbUtilityMeter> }): Array<FacilityGroup> {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let meterIndex: number = 0;
    templateData.importFacilities.forEach(facility => {
      let facilityMeters: Array<IdbUtilityMeter> = templateData.importMeters.filter(meter => { return meter.facilityId == facility.guid });
      let groupItems: Array<ColumnItem> = new Array();
      facilityMeters.forEach(meter => {
        groupItems.push({
          index: meterIndex,
          value: meter.name,
          id: meter.guid,
        });
        meterIndex++;
      })
      facilityGroups.push({
        facilityId: facility.guid,
        groupItems: groupItems,
        facilityName: facility.name,
        color: facility.color
      });
    });
    return facilityGroups;
  }


  getPredictorFacilityGroups(templateData: { importFacilities: Array<IdbFacility>, predictors: Array<IdbPredictor> }): Array<FacilityGroup> {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let predictorIndex: number = 0;
    templateData.importFacilities.forEach(facility => {
      let facilityPredictors: Array<IdbPredictor> = templateData.predictors.filter(entry => { return entry.facilityId == facility.guid });
      let groupItems: Array<ColumnItem> = new Array();
      if (facilityPredictors.length > 0) {
        facilityPredictors.forEach(predictor => {
          groupItems.push({
            index: predictorIndex,
            value: predictor.name,
            id: predictor.guid,
            isExisting: predictor.id != undefined,
            isProductionPredictor: predictor.production
          });
          predictorIndex++;
        })
        facilityGroups.push({
          facilityId: facility.guid,
          groupItems: groupItems,
          facilityName: facility.name,
          color: facility.color
        });
      }
    });
    return facilityGroups;
  }

  parseMetersFromGroups(fileReference: FileReference): Array<IdbUtilityMeter> {
    let meters: Array<IdbUtilityMeter> = new Array();
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getAccountMetersCopy();
    fileReference.meterFacilityGroups.forEach(group => {
      if (group.facilityName != 'Unmapped Meters') {
        let facility: IdbFacility = fileReference.importFacilities.find(facility => { return group.facilityId == facility.guid });
        group.groupItems.forEach(groupItem => {
          let meter: IdbUtilityMeter = accountMeters.find(accMeter => { return accMeter.name == groupItem.value && accMeter.facilityId == facility.guid });
          if (!meter) {
            meter = this.getNewMeterFromExcelColumn(groupItem, facility);
          } else {
            meter.importWizardName = groupItem.value;
          }
          meters.push(meter);
        });
      };
    });
    return meters;
  }

  getNewMeterFromExcelColumn(groupItem: ColumnItem, selectedFacility: IdbFacility): IdbUtilityMeter {
    let newMeter: IdbUtilityMeter = getNewIdbUtilityMeter(selectedFacility.guid, selectedFacility.accountId, false, selectedFacility.energyUnit);
    let fuelType: { phase: MeterPhase, fuelTypeOption: FuelTypeOption } = this.energyUnitsHelperService.parseFuelType(groupItem.value);
    if (fuelType) {
      newMeter.source = "Other Fuels";
      newMeter.phase = fuelType.phase;
      newMeter.scope = 1;
      newMeter.fuel = fuelType.fuelTypeOption.value;
      newMeter.heatCapacity = fuelType.fuelTypeOption.heatCapacityValue;
      newMeter.siteToSource = fuelType.fuelTypeOption.siteToSourceMultiplier;
      //check if unit is in name
      let startingUnit: string = this.energyUnitsHelperService.parseStartingUnit(groupItem.value);
      if (startingUnit) {
        newMeter.startingUnit = startingUnit;
      } else {
        //use fuel option
        newMeter.startingUnit = fuelType.fuelTypeOption.startingUnit;
      }
      let isEnergyUnit: boolean = getIsEnergyUnit(startingUnit);
      if (isEnergyUnit) {
        newMeter.energyUnit = startingUnit;
      } else {
        newMeter.energyUnit = selectedFacility.energyUnit;
      }
    } else {
      newMeter.source = this.energyUnitsHelperService.parseSource(groupItem.value);
      newMeter.startingUnit = this.energyUnitsHelperService.parseStartingUnit(groupItem.value);
      if (newMeter.source == 'Electricity') {
        newMeter.scope = 3
        if (newMeter.startingUnit == undefined || getIsEnergyUnit(newMeter.startingUnit) == false) {
          newMeter.startingUnit = 'kWh';
          newMeter.energyUnit = 'kWh';
        }
      } else if (newMeter.source == 'Natural Gas') {
        newMeter.scope = 1;
      } else if (newMeter.source == 'Other Energy') {
        newMeter.scope = 4;
      }
      if (newMeter.startingUnit && newMeter.source) {
        let isEnergyUnit: boolean = getIsEnergyUnit(newMeter.startingUnit);
        if (isEnergyUnit) {
          newMeter.energyUnit = newMeter.startingUnit;
        } else {
          newMeter.energyUnit = selectedFacility.energyUnit;
        }
        let showHeatCapacity: boolean = checkShowHeatCapacity(newMeter.source, newMeter.startingUnit, newMeter.scope);
        if (showHeatCapacity) {
          newMeter.heatCapacity = getHeatingCapacity(newMeter.source, newMeter.startingUnit, newMeter.energyUnit);
        }
        let showSiteToSource: boolean = checkShowSiteToSource(newMeter.source, newMeter.includeInEnergy, newMeter.scope);
        if (showSiteToSource) {
          newMeter.siteToSource = getSiteToSource(newMeter.source);
        }
      }
    }
    newMeter.name = groupItem.value;
    //use import wizard name so that the name of the meter can be changed but 
    //we can still access the data using this value
    newMeter.importWizardName = groupItem.value;
    //start with random meter number
    newMeter.meterNumber = selectedFacility.name.replace(' ', '_') + '_' + newMeter.source?.replace(' ', '_') + '_' + Math.random().toString(36).substr(2, 3);

    //set emissions mulitpliers
    newMeter = this.editMeterFormService.setMultipliers(newMeter);
    return newMeter;
  }


  parseExcelMeterData(fileReference: FileReference): Array<IdbUtilityMeterData> {
    let dateColumnGroup: ColumnGroup = fileReference.columnGroups.find(group => { return group.groupLabel == 'Date' });
    let dateColumnVal: string = dateColumnGroup.groupItems[0].value;
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let accountUtilityData: Array<IdbUtilityMeterData> = accountMeterData.map(meterData => { return getMeterDataCopy(meterData) });

    let utilityData: Array<IdbUtilityMeterData> = new Array();
    fileReference.meters.forEach(meter => {
      if (!meter.skipImport) {
        fileReference.headerMap.forEach(dataRow => {
          let readDate: Date = new Date(dataRow[dateColumnVal]);
          if (!isNaN(readDate.valueOf())) {
            let dataItem: IdbUtilityMeterData = accountUtilityData.find(accountDataItem => {
              return accountDataItem.facilityId == meter.facilityId && checkSameDay(new Date(accountDataItem.readDate), readDate) && accountDataItem.meterId == meter.guid;
            })
            if (!dataItem) {
              dataItem = getNewIdbUtilityMeterData(meter, []);
            }
            dataItem.readDate = readDate;

            let totalVolume: number = 0;
            let energyUse: number = 0;
            let totalConsumption: number = dataRow[meter.importWizardName];
            let displayVolumeInput: boolean = (getIsEnergyUnit(meter.startingUnit) == false);
            let displayEnergyUse: boolean = getIsEnergyMeter(meter.source);
            if (!displayVolumeInput) {
              energyUse = totalConsumption;
            } else {
              totalVolume = totalConsumption;
              if (displayEnergyUse && totalVolume) {
                energyUse = totalVolume * meter.heatCapacity;
              }
            }
            dataItem.totalEnergyUse = energyUse;
            dataItem.totalImportConsumption = totalConsumption;
            dataItem.totalVolume = totalVolume;
            utilityData.push(dataItem);
          }
        });
      }
    });
    return utilityData;
  }


  parseExcelPredictorsData(fileReference: FileReference): { predictors: Array<IdbPredictor>, predictorData: Array<IdbPredictorData> } {
    let dateColumnGroup: ColumnGroup = fileReference.columnGroups.find(group => { return group.groupLabel == 'Date' });
    let dateColumnVal: string = dateColumnGroup.groupItems[0].value;

    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();

    let predictorData: Array<IdbPredictorData> = new Array();
    let predictors: Array<IdbPredictor> = new Array();

    let accountPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.accountPredictorData.getValue();
    let accountPredictors: Array<IdbPredictor> = this.predictorDbService.accountPredictors.getValue();

    fileReference.predictorFacilityGroups.forEach(group => {
      if (group.facilityName != 'Unmapped Predictors' && group.groupItems.length != 0) {
        let facilityPredictorData: Array<IdbPredictorData> = accountPredictorData.filter(pData => {
          return pData.facilityId == group.facilityId;
        });
        let facilityPredictors: Array<IdbPredictor> = accountPredictors.filter(predictor => {
          return predictor.facilityId == group.facilityId;
        });

        group.groupItems.forEach((predictorItem) => {
          let predictor: IdbPredictor = facilityPredictors.find(predictor => {
            return predictor.name == predictorItem.value;
          });
          if (predictor == undefined) {
            predictor = getNewIdbPredictor(selectedAccount.guid, group.facilityId);
            predictor.name = predictorItem.value;
          }
          predictors.push(predictor);
          fileReference.headerMap.forEach(dataRow => {
            let readDate: Date = new Date(dataRow[dateColumnVal]);
            if (!isNaN(readDate.valueOf())) {
              if (predictor) {
                let existingPredictorData: IdbPredictorData = facilityPredictorData.find(entry => {
                  return checkSameMonth(new Date(entry.date), readDate) && predictor.guid == entry.predictorId;
                });
                if (existingPredictorData) {
                  existingPredictorData.amount = Number(dataRow[predictorItem.value]);
                  predictorData.push(existingPredictorData);
                } else {
                  let newPredictorData: IdbPredictorData = getNewIdbPredictorData(predictor);
                  newPredictorData.amount = Number(dataRow[predictorItem.value]);
                  newPredictorData.date = new Date(readDate);
                  predictorData.push(newPredictorData);
                }
              }
            }
          })

        });
      }
    });
    return { predictorData: predictorData, predictors: predictors };
  }


  updateProductionPredictorData(fileReference: FileReference): Array<IdbPredictor> {
    fileReference.predictorFacilityGroups.forEach(group => {
      group.groupItems.forEach(groupItem => {
        let predictor: IdbPredictor = fileReference.predictors.find(predictor => {
          return predictor.facilityId == group.facilityId && predictor.name == groupItem.value
        });
        if (predictor) {
          predictor.production = groupItem.isProductionPredictor;
          predictor.productionInAnalysis = groupItem.isProductionPredictor;
        }
      })
    });
    return fileReference.predictors;
  }

  checkImportStartingUnit(importUnit: string, source: MeterSource, phase: MeterPhase, fuel: string, scope: number): string {
    if (source) {
      let startingUnitOptions: Array<UnitOption> = getStartingUnitOptions(source, phase, fuel, scope);
      let selectedUnitOption: UnitOption = startingUnitOptions.find(unitOption => { return unitOption.value == importUnit });
      if (selectedUnitOption) {
        return selectedUnitOption.value;
      }
    }
    return undefined;
  }

  checkImportCellNumber(value: any): number {
    if (value != undefined && value != null) {
      return Number(value);
    }
    return;
  }
}