import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IdbAccount, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, IdbUtilityMeterGroup, PredictorData } from '../models/idb';
import * as XLSX from 'xlsx';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { AccountdbService } from '../indexedDB/account-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { PredictordbService } from '../indexedDB/predictors-db.service';
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
import { DetailDegreeDay } from '../models/degreeDays';
import { DegreeDaysService } from '../shared/helper-services/degree-days.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class UploadDataService {

  fileReferences: Array<FileReference>;
  allFilesSet: BehaviorSubject<boolean>;
  uploadMeters: Array<IdbUtilityMeter>;
  constructor(private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService, private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictordbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private energyUnitsHelperService: EnergyUnitsHelperService,
    private editMeterFormService: EditMeterFormService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private uploadDataV1Service: UploadDataV1Service,
    private uploadDataV2Service: UploadDataV2Service,
    private degreeDaysService: DegreeDaysService) {
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
        predictorEntries: [],
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
        predictorEntries: templateData.predictorEntries,
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
    } else if (sheetNames[0] == "Help" && sheetNames[1] == 'Facilities' && sheetNames[2] == "Meters-Utilities" && sheetNames[3] == "Electricity" && sheetNames[4] == "Non-electricity" && sheetNames[5] == "Predictors") {
      return "V1";
    } else {
      return "Non-template";
    }
  }

  parseTemplate(workbook: XLSX.WorkBook, templateVersion: "V1" | "V2", inSetupWizard: boolean): ParsedTemplate {
    if (templateVersion == "V1") {
      return this.uploadDataV1Service.parseTemplate(workbook);
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
        dbGroup = this.utilityMeterGroupDbService.getNewIdbUtilityMeterGroup("Energy", groupName, facilityId, account.guid);
        newGroups.push(dbGroup);
        return { group: dbGroup, newGroups: newGroups }
      } else {
        return { group: undefined, newGroups: newGroups }
      }
    }
  }

  getMeterDataEntries(workbook: XLSX.WorkBook, importMeters: Array<IdbUtilityMeter>): Array<IdbUtilityMeterData> {
    //electricity readings
    let importMeterData: Array<IdbUtilityMeterData> = new Array();
    let electricityData = XLSX.utils.sheet_to_json(workbook.Sheets['Electricity']);
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let utilityMeterData: Array<IdbUtilityMeterData> = accountMeterData.map(meterData => { return getMeterDataCopy(meterData) });

    electricityData.forEach(dataPoint => {
      let meterNumber: string = dataPoint['Meter Number'];
      let readDate: Date = new Date(dataPoint['Read Date']);
      let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
      if (meter) {
        let dbDataPoint: IdbUtilityMeterData = utilityMeterData.find(meterDataItem => {
          if (meterDataItem.meterId == meter.guid) {
            let dateItemDate: Date = new Date(meterDataItem.readDate);
            return this.checkSameDay(dateItemDate, readDate);
          } else {
            return false;
          }
        })
        if (!dbDataPoint) {
          dbDataPoint = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter);
        }
        dbDataPoint.readDate = readDate;
        dbDataPoint.totalEnergyUse = this.checkImportCellNumber(dataPoint['Total Consumption']);
        dbDataPoint.totalRealDemand = this.checkImportCellNumber(dataPoint['Total Real Demand']);
        dbDataPoint.totalBilledDemand = this.checkImportCellNumber(dataPoint['Total Billed Demand']);
        dbDataPoint.totalCost = this.checkImportCellNumber(dataPoint['Total Cost']);
        dbDataPoint.nonEnergyCharge = this.checkImportCellNumber(dataPoint['Non-energy Charge']);
        dbDataPoint.block1Consumption = this.checkImportCellNumber(dataPoint['Block 1 Consumption']);
        dbDataPoint.block1ConsumptionCharge = this.checkImportCellNumber(dataPoint['Block 1 Consumption Charge']);
        dbDataPoint.block2Consumption = this.checkImportCellNumber(dataPoint['Block 2 Consumption']);
        dbDataPoint.block2ConsumptionCharge = this.checkImportCellNumber(dataPoint['Block 2 Consumption Charge']);
        dbDataPoint.block3Consumption = this.checkImportCellNumber(dataPoint['Block 3 Consumption']);
        dbDataPoint.block3ConsumptionCharge = this.checkImportCellNumber(dataPoint['Block 3 Consumption Charge']);
        dbDataPoint.otherConsumption = this.checkImportCellNumber(dataPoint['Other Consumption']);
        dbDataPoint.otherConsumptionCharge = this.checkImportCellNumber(dataPoint['Other Consumption Charge']);
        dbDataPoint.onPeakAmount = this.checkImportCellNumber(dataPoint['On Peak Amount']);
        dbDataPoint.onPeakCharge = this.checkImportCellNumber(dataPoint['On Peak Charge']);
        dbDataPoint.offPeakAmount = this.checkImportCellNumber(dataPoint['Off Peak Amount']);
        dbDataPoint.offPeakCharge = this.checkImportCellNumber(dataPoint['Off Peak Charge']);
        dbDataPoint.transmissionAndDeliveryCharge = this.checkImportCellNumber(dataPoint['Transmission & Delivery Charge']);
        dbDataPoint.powerFactor = this.checkImportCellNumber(dataPoint['Power Factor']);
        dbDataPoint.powerFactorCharge = this.checkImportCellNumber(dataPoint['Power Factor Charge']);
        dbDataPoint.localSalesTax = this.checkImportCellNumber(dataPoint['Local Sales Tax']);
        dbDataPoint.stateSalesTax = this.checkImportCellNumber(dataPoint['State Sales Tax']);
        dbDataPoint.latePayment = this.checkImportCellNumber(dataPoint['Late Payment']);
        dbDataPoint.otherCharge = this.checkImportCellNumber(dataPoint['Other Charge']);



        importMeterData.push(dbDataPoint);
      } else {
        console.log('no meter');
      }
    })


    let noElectricityData = XLSX.utils.sheet_to_json(workbook.Sheets['Non-electricity']);
    noElectricityData.forEach(dataPoint => {
      let meterNumber: string = dataPoint['Meter Number'];
      let readDate: Date = new Date(dataPoint['Read Date']);
      let meter: IdbUtilityMeter = importMeters.find(meter => { return meter.meterNumber == meterNumber });
      if (meter) {
        let dbDataPoint: IdbUtilityMeterData = utilityMeterData.find(meterDataItem => {
          if (meterDataItem.meterId == meter.guid) {
            let dateItemDate: Date = new Date(meterDataItem.readDate);
            return this.checkSameDay(dateItemDate, readDate);
          } else {
            return false;
          }
        })
        if (!dbDataPoint) {
          dbDataPoint = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter);
        }
        let totalVolume: number = 0;
        let energyUse: number = 0;
        let totalConsumption: number = this.checkImportCellNumber(dataPoint['Total Consumption']);
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

        dbDataPoint.readDate = readDate;
        dbDataPoint.totalVolume = totalVolume;
        dbDataPoint.totalEnergyUse = energyUse;
        dbDataPoint.totalCost = this.checkImportCellNumber(dataPoint['Total Cost']);
        dbDataPoint.commodityCharge = this.checkImportCellNumber(dataPoint['Commodity Charge']);
        dbDataPoint.deliveryCharge = this.checkImportCellNumber(dataPoint['Delivery Charge']);
        dbDataPoint.otherCharge = this.checkImportCellNumber(dataPoint['Other Charge']);
        dbDataPoint.demandUsage = this.checkImportCellNumber(dataPoint['Demand Usage']);
        dbDataPoint.demandCharge = this.checkImportCellNumber(dataPoint['Demand Charge']);
        dbDataPoint.localSalesTax = this.checkImportCellNumber(dataPoint['Local Sales Tax']);
        dbDataPoint.stateSalesTax = this.checkImportCellNumber(dataPoint['State Sales Tax']);
        dbDataPoint.latePayment = this.checkImportCellNumber(dataPoint['Late Payment']);
        importMeterData.push(dbDataPoint);
      } else {
        console.log('no meter');
      }
    });
    return importMeterData;
  }

  checkSameDay(date1: Date, date2: Date): boolean {
    return date1.getUTCFullYear() == date2.getUTCFullYear() && date1.getUTCMonth() == date2.getUTCMonth() && date1.getUTCDate() == date2.getUTCDate();
  }

  checkSameMonth(date1: Date, date2: Date): boolean {
    return date1.getUTCFullYear() == date2.getUTCFullYear() && date1.getUTCMonth() == date2.getUTCMonth();
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


  getPredictorFacilityGroups(templateData: { importFacilities: Array<IdbFacility>, predictorEntries: Array<IdbPredictorEntry> }): Array<FacilityGroup> {
    let facilityGroups: Array<FacilityGroup> = new Array();
    let predictorIndex: number = 0;
    templateData.importFacilities.forEach(facility => {
      let facilityPredictorEntry: IdbPredictorEntry = templateData.predictorEntries.find(entry => { return entry.facilityId == facility.guid });
      let groupItems: Array<ColumnItem> = new Array();
      if (facilityPredictorEntry) {
        facilityPredictorEntry.predictors.forEach(predictor => {
          groupItems.push({
            index: predictorIndex,
            value: predictor.name,
            id: predictor.id,
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
          }
          meters.push(meter);
        });
      };
    });
    return meters;
  }

  getNewMeterFromExcelColumn(groupItem: ColumnItem, selectedFacility: IdbFacility): IdbUtilityMeter {
    let newMeter: IdbUtilityMeter = this.utilityMeterDbService.getNewIdbUtilityMeter(selectedFacility.guid, selectedFacility.accountId, false, selectedFacility.energyUnit);
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
    newMeter.meterNumber = Math.random().toString(36).substr(2, 9);

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
              return accountDataItem.facilityId == meter.facilityId && this.checkSameDay(new Date(accountDataItem.readDate), readDate) && accountDataItem.meterId == meter.guid;
            })
            if (!dataItem) {
              dataItem = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter);
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


  parseExcelPredictorsData(fileReference: FileReference): Array<IdbPredictorEntry> {
    let dateColumnGroup: ColumnGroup = fileReference.columnGroups.find(group => { return group.groupLabel == 'Date' });
    let dateColumnVal: string = dateColumnGroup.groupItems[0].value;

    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();

    let predictorData: Array<IdbPredictorEntry> = new Array();
    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.getAccountPerdictorsCopy();
    let hasNewData: boolean = false;
    fileReference.predictorFacilityGroups.forEach(group => {
      if (group.facilityName != 'Unmapped Predictors' && group.groupItems.length != 0) {
        let facilityPredictorEntries: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => {
          return entry.facilityId == group.facilityId;
        });
        let existingFacilityPredictorData: Array<PredictorData> = new Array();
        if (facilityPredictorEntries.length != 0) {
          existingFacilityPredictorData = facilityPredictorEntries[0].predictors.map(predictor => { return JSON.parse(JSON.stringify(predictor)) });
          existingFacilityPredictorData.forEach(predictorData => {
            predictorData.amount = undefined;
          });
        }
        if (group.groupItems.length != 0) {
          group.groupItems.forEach((predictorItem) => {
            let predictorIndex: number = existingFacilityPredictorData.findIndex(predictor => { return predictor.name == predictorItem.value });
            if (predictorIndex == -1) {
              hasNewData = true;
              let newPredictor: PredictorData = this.predictorDbService.getNewPredictor([]);
              newPredictor.name = predictorItem.value;
              existingFacilityPredictorData.push(newPredictor);
              facilityPredictorEntries.forEach(predictorEntry => {
                predictorEntry.predictors.push(JSON.parse(JSON.stringify(newPredictor)));
              });
            }
          });
        }

        let uploadDates: Array<Date> = new Array();
        fileReference.headerMap.forEach(dataRow => {
          let readDate: Date = new Date(dataRow[dateColumnVal]);
          if (!isNaN(readDate.valueOf())) {
            let predictorEntry: IdbPredictorEntry = facilityPredictorEntries.find(entry => {
              return this.checkSameMonth(new Date(entry.date), readDate);
            });
            if (!predictorEntry) {
              predictorEntry = this.predictorDbService.getNewIdbPredictorEntry(group.facilityId, selectedAccount.guid, readDate);
              predictorEntry.predictors = JSON.parse(JSON.stringify(existingFacilityPredictorData));
            } else {
              uploadDates.push(readDate);
            }
            group.groupItems.forEach(item => {
              let entryDataIndex: number = predictorEntry.predictors.findIndex(predictor => { return predictor.name == item.value });
              if (entryDataIndex != -1) {
                predictorEntry.predictors[entryDataIndex].amount = Number(dataRow[item.value]);
              }
            });
            predictorData.push(JSON.parse(JSON.stringify(predictorEntry)));
          }
        });
        //uploading new entries means we need to update all previous entries.
        if (hasNewData) {
          facilityPredictorEntries.forEach(entry => {
            let uploadedAlready: Date = uploadDates.find(date => { return this.checkSameMonth(new Date(entry.date), date) });
            if (uploadedAlready == undefined) {
              predictorData.push(JSON.parse(JSON.stringify(entry)));
            }
          });
        }
      }
    });
    return predictorData;
  }


  updateProductionPredictorData(fileReference: FileReference): Array<IdbPredictorEntry> {
    fileReference.predictorFacilityGroups.forEach(group => {
      let facilityPredictorEntries: Array<IdbPredictorEntry> = fileReference.predictorEntries.filter(entry => { return entry.facilityId == group.facilityId });
      group.groupItems.forEach(groupItem => {
        facilityPredictorEntries.forEach(predictorEntry => {
          predictorEntry.predictors.forEach(predictor => {
            if (predictor.name == groupItem.value) {
              predictor.production = groupItem.isProductionPredictor;
              predictor.productionInAnalysis = groupItem.isProductionPredictor;
            }
          })
        })
      })
    });
    return fileReference.predictorEntries;
  }


  async updateDegreeDays(fileReference: FileReference): Promise<Array<IdbPredictorEntry>> {
    for (let i = 0; i < fileReference.predictorEntries.length; i++) {
      let entry: IdbPredictorEntry = fileReference.predictorEntries[i];
      //set degree days for new entries
      if (!entry.id) {
        for (let p = 0; p < entry.predictors.length; p++) {
          let predictorData: PredictorData = entry.predictors[p];
          if (predictorData.predictorType == 'Weather') {
            //set degree days
            let dataDate: Date = new Date(entry.date)
            let degreeDays: Array<DetailDegreeDay> = await this.degreeDaysService.getDailyDataFromMonth(dataDate.getMonth(), dataDate.getFullYear(), predictorData.heatingBaseTemperature, predictorData.coolingBaseTemperature, predictorData.weatherStationId);
            let hasErrors: DetailDegreeDay = degreeDays.find(degreeDay => {
              return degreeDay.gapInData == true
            });
            if (predictorData.weatherDataType == 'CDD') {
              let totalCDD: number = _.sumBy(degreeDays, 'coolingDegreeDay');
              predictorData.amount = totalCDD;
              predictorData.weatherStationId = degreeDays[0]?.stationId;
              predictorData.weatherStationName = degreeDays[0]?.stationName;
              predictorData.weatherDataWarning = hasErrors != undefined;
            }
            if (predictorData.weatherDataType == 'HDD') {
              let totalHDD: number = _.sumBy(degreeDays, 'heatingDegreeDay');
              predictorData.amount = totalHDD;
              predictorData.weatherStationId = degreeDays[0]?.stationId;
              predictorData.weatherStationName = degreeDays[0]?.stationName;
              predictorData.weatherDataWarning = hasErrors != undefined;
            }
          }
        }
      }
    }
    return fileReference.predictorEntries;
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