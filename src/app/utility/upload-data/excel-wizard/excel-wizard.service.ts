import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, PredictorData } from 'src/app/models/idb';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import * as XLSX from 'xlsx';
import { ImportMeterDataFileSummary, ImportMeterDataService } from '../import-meter-data.service';
import { ImportMeterFileSummary, ImportMeterService } from '../import-meter.service';
import { ImportPredictorFileSummary, ImportPredictorsService } from '../import-predictors.service';
import { UploadDataService } from '../upload-data.service';

@Injectable({
  providedIn: 'root'
})
export class ExcelWizardService {

  workbook: XLSX.WorkBook;
  importMeters: Array<IdbUtilityMeter>;
  selectedWorksheetData: BehaviorSubject<Array<Array<string>>>;
  selectedWorksheetDataHeaderMap: BehaviorSubject<Array<any>>;
  selectedWorksheetName: string;
  columnGroups: BehaviorSubject<Array<ColumnGroup>>;
  rowGroups: BehaviorSubject<Array<{ fieldLabel: string, fieldName: string, groupItems: Array<ColumnItem>, id: string }>>;
  dataOrientation: string = 'column';

  constructor(private importMeterSevice: ImportMeterService, private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService,
    private importMeterDataService: ImportMeterDataService, private energyUnitsHelperService: EnergyUnitsHelperService, private utilityMeterDataDbService: UtilityMeterDatadbService,
    private uploadDataService: UploadDataService, private importPredictorsService: ImportPredictorsService, private predictorDbService: PredictordbService) {
    this.selectedWorksheetData = new BehaviorSubject([]);
    this.selectedWorksheetDataHeaderMap = new BehaviorSubject([]);
    this.rowGroups = new BehaviorSubject([]);
    this.columnGroups = new BehaviorSubject<Array<ColumnGroup>>([]);
    this.selectedWorksheetData.subscribe(data => {
      if (data && data.length != 0) {
        this.setColumnGroups(data[0]);
        this.setRowGroups(data[0]);
      }
    });
  }

  setSelectedWorksheetName(selectedWorksheetName: string) {
    this.selectedWorksheetName = selectedWorksheetName;
    this.parseWorksheet();
  }

  parseWorksheet() {
    let selectedWorksheetData: Array<Array<string>> = XLSX.utils.sheet_to_json(this.workbook.Sheets[this.selectedWorksheetName], { header: 1 });
    this.selectedWorksheetData.next(selectedWorksheetData);
    let selectedWorksheetDataHeaderMap: Array<any> = XLSX.utils.sheet_to_json(this.workbook.Sheets[this.selectedWorksheetName]);
    this.selectedWorksheetDataHeaderMap.next(selectedWorksheetDataHeaderMap);
  }

  setColumnGroups(headers: Array<string>) {
    let columnGroups: Array<{ groupLabel: string, groupItems: Array<ColumnItem>, id: string }> = new Array();
    let dateGroupItems: Array<ColumnItem> = new Array();
    let unusedColumns: Array<ColumnItem> = new Array();
    headers.forEach((header, index) => {
      unusedColumns.push({ value: header, index: index, id: Math.random().toString(36).substr(2, 9) });
    });

    //todo: enhance check for "Date"
    let dateColumnIndex: number = unusedColumns.findIndex((column) => { return column.value == 'Date' });
    if (dateColumnIndex > -1) {
      let dateColumn: ColumnItem = unusedColumns[dateColumnIndex];
      dateGroupItems.push(dateColumn);
      unusedColumns.splice(dateColumnIndex, 1);
    }
    columnGroups.push({
      groupLabel: 'Date',
      groupItems: dateGroupItems,
      id: Math.random().toString(36).substr(2, 9)
    });
    columnGroups.push({
      groupLabel: 'Meters',
      groupItems: [],
      id: Math.random().toString(36).substr(2, 9)
    });
    columnGroups.push({
      groupLabel: 'Predictors',
      groupItems: [],
      id: Math.random().toString(36).substr(2, 9)
    });
    columnGroups.push({
      groupLabel: 'Unused',
      groupItems: unusedColumns,
      id: Math.random().toString(36).substr(2, 9)
    });
    this.columnGroups.next(columnGroups);
  }


  setRowGroups(headers: Array<string>) {
    let rowGroups: Array<{ fieldLabel: string, fieldName: string, groupItems: Array<ColumnItem>, id: string }> = new Array();
    let dateGroupItems: Array<ColumnItem> = new Array();
    let unusedColumns: Array<ColumnItem> = new Array();
    headers.forEach((header, index) => {
      unusedColumns.push({ value: header, index: index, id: Math.random().toString(36).substr(2, 9) });
    });

    //todo: enhance check for "Date"
    let dateColumnIndex: number = unusedColumns.findIndex((column) => { return column.value == 'Date' });
    if (dateColumnIndex > -1) {
      let dateColumn: ColumnItem = unusedColumns[dateColumnIndex];
      dateGroupItems.push(dateColumn);
      unusedColumns.splice(dateColumnIndex, 1);
    }
    rowGroups.push({
      fieldLabel: 'Unused',
      fieldName: 'unused',
      groupItems: unusedColumns,
      id: Math.random().toString(36).substr(2, 9)
    });
    rowGroups.push({
      fieldLabel: 'Date',
      fieldName: 'readDate',
      groupItems: dateGroupItems,
      id: Math.random().toString(36).substr(2, 9)
    });
    rowGroups.push({
      fieldLabel: 'Meter Number/Name',
      fieldName: 'meterNumber',
      groupItems: [],
      id: Math.random().toString(36).substr(2, 9)
    });
    rowGroups.push({
      fieldLabel: 'Energy Consumption',
      fieldName: 'energyConsumption',
      groupItems: [],
      id: Math.random().toString(36).substr(2, 9)
    });
    this.rowGroups.next(rowGroups);
  }

  getImportMeterFileSummary(): ImportMeterFileSummary {
    if (this.dataOrientation == 'column') {
      let columnGroups: Array<{ groupLabel: string, groupItems: Array<ColumnItem>, id: string }> = this.columnGroups.getValue();
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
      let metersGroup = columnGroups.find(group => { return group.groupLabel == 'Meters' });
      return this.importMeterSevice.getMetersSummaryFromExcelFile(metersGroup.groupItems, selectedFacility, facilityMeters);
    } else {
      //TODO handle row orientation
    }
  }

  //TODO import predictors
  getImportPredictorFileSummary(): ImportPredictorFileSummary {
    let columnGroups: Array<ColumnGroup> = this.columnGroups.getValue();
    let predictorGroup: ColumnGroup = columnGroups.find(group => { return group.groupLabel == 'Predictors' });
    let worksheetData: Array<any> = this.selectedWorksheetDataHeaderMap.getValue();
    let facilityPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    return this.importPredictorsService.getPredictorsSummaryFromExcelFile(predictorGroup.groupItems, worksheetData, facilityPredictorEntries);
  }

  getMetersSummary(importMeterFileWizard: { fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string }): Array<{ meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> }> {
    let importMeters: Array<IdbUtilityMeter> = new Array();
    importMeterFileWizard.importMeterFileSummary.newMeters.forEach(meter => {
      importMeters.push(meter);
    });
    importMeterFileWizard.importMeterFileSummary.existingMeters.forEach(meter => {
      importMeters.push(meter);
    });
    let columnGroups: Array<{ groupLabel: string, groupItems: Array<ColumnItem>, id: string }> = this.columnGroups.getValue();
    let dateGroup = columnGroups.find(group => { return group.groupLabel == 'Date' })
    let worksheetData: Array<any> = this.selectedWorksheetDataHeaderMap.getValue();

    let metersSummary: Array<{ meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData> }> = new Array();
    importMeters.forEach(meter => {
      let meterDataArr: Array<IdbUtilityMeterData> = new Array();
      let displayVolumeInput: boolean = (this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit) == false);
      let displayEnergyUse: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
      worksheetData.forEach(dataItem => {
        let newMeterDataItem: IdbUtilityMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(meter);
        newMeterDataItem.readDate = new Date(dataItem[dateGroup.groupItems[0].value]);
        let totalImportConsumption: number = dataItem[meter.importWizardName];
        if (!displayVolumeInput) {
          newMeterDataItem.totalEnergyUse = totalImportConsumption;
        } else {
          newMeterDataItem.totalVolume = totalImportConsumption;
          if (displayEnergyUse && newMeterDataItem.totalVolume) {
            newMeterDataItem.totalEnergyUse = newMeterDataItem.totalVolume * meter.heatCapacity;
          }
        }
        meterDataArr.push(newMeterDataItem);
      });
      metersSummary.push({
        meter: meter,
        meterData: meterDataArr
      })
    });
    return metersSummary;
  }

  getPredictorsSummary(importPredictorFileWizard: { fileName: string, importPredictorFileSummary: ImportPredictorFileSummary, id: string }): Array<{ predictor: PredictorData, numberOfReadings: number }> {
    let predictorsSummary: Array<{ predictor: PredictorData, numberOfReadings: number }> = new Array();
    let predictors: Array<PredictorData> = new Array();
    importPredictorFileWizard.importPredictorFileSummary.newPredictors.forEach(predictor => {
      predictors.push(predictor);
    });
    importPredictorFileWizard.importPredictorFileSummary.existingPredictors.forEach(predictor => {
      predictors.push(predictor);
    });

    // let columnGroups: Array<{ groupLabel: string, groupItems: Array<ColumnItem>, id: string }> = this.columnGroups.getValue();
    // let dateGroup = columnGroups.find(group => { return group.groupLabel == 'Date' })
    let worksheetData: Array<any> = this.selectedWorksheetDataHeaderMap.getValue();

    predictors.forEach(predictor => {
      let entryCount: number = 0;
      worksheetData.forEach(dataItem => {
        if (dataItem[predictor.importWizardName] != undefined || dataItem[predictor.importWizardName] != null) {
          entryCount++;
        }
      });
      predictorsSummary.push({ predictor: predictor, numberOfReadings: entryCount });
    });
    return predictorsSummary;
  }



  submitExcelData(importMeterFileWizard: { fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string },
    importPredictorFileWizard: { fileName: string, importPredictorFileSummary: ImportPredictorFileSummary, id: string },
    meterData: Array<IdbUtilityMeterData>, facilityMeters: Array<IdbUtilityMeter>) {
    let metersToImport: Array<IdbUtilityMeter> = new Array();
    importMeterFileWizard.importMeterFileSummary.newMeters.forEach(meter => {
      metersToImport.push(meter);
    })
    importMeterFileWizard.importMeterFileSummary.existingMeters.forEach(meter => {
      metersToImport.push(meter);
    })

    let importMeterDataFileSummary: ImportMeterDataFileSummary = this.importMeterDataService.getMeterDataSummaryFromExcelFile(meterData, facilityMeters, metersToImport);
    this.uploadDataService.addMeterFile(importMeterFileWizard.fileName, importMeterFileWizard.importMeterFileSummary);
    this.uploadDataService.addMeterDataFile(importMeterFileWizard.fileName, importMeterDataFileSummary, undefined);
    this.uploadDataService.addPredictorFile(importPredictorFileWizard.fileName, importPredictorFileWizard.importPredictorFileSummary);

    this.uploadDataService.removeExcelFile(importMeterFileWizard.fileName);
  }
}

export interface ColumnGroup {
  groupLabel: string,
  groupItems: Array<ColumnItem>,
  id: string
}


export interface ColumnItem {
  index: number,
  value: string,
  id: string
}