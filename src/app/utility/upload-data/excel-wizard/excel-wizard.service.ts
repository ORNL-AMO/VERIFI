import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import * as XLSX from 'xlsx';
import { ImportMeterFileSummary, ImportMeterService } from '../import-meter.service';
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
  columnGroups: BehaviorSubject<Array<{ groupLabel: string, groupItems: Array<ColumnItem>, id: string }>>;
  rowGroups: BehaviorSubject<Array<{ fieldLabel: string, fieldName: string, groupItems: Array<ColumnItem>, id: string }>>;
  dataOrientation: string = 'column';

  constructor(private importMeterSevice: ImportMeterService, private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService) {
    this.selectedWorksheetData = new BehaviorSubject([]);
    this.selectedWorksheetDataHeaderMap = new BehaviorSubject([]);
    this.rowGroups = new BehaviorSubject([]);
    this.columnGroups = new BehaviorSubject<Array<{ groupLabel: string, groupItems: Array<ColumnItem>, id: string }>>([]);
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


  // mapData() {
  //   // let worksheetData = this.selectedWorksheetDataHeaderMap.getValue();
  //   let columnGroups: Array<{ groupLabel: string, groupItems: Array<ColumnItem>, id: string }> = this.columnGroups.getValue();
  //   let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
  //   let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
  //   if (this.dataOrientation == 'column') {
  //     // let dateGroup = columnGroups.find(group => { return group.groupLabel == 'Date' });
  //     let metersGroup = columnGroups.find(group => { return group.groupLabel == 'Meters' });
  //     let importMeterFileSummary: ImportMeterFileSummary = this.importMeterSevice.importMetersFromExcelFile(metersGroup.groupItems, selectedFacility, facilityMeters);
  //     this.
  //   } else {

  //   }
  // }

  getImportMeterFileSummary(): ImportMeterFileSummary {
    let columnGroups: Array<{ groupLabel: string, groupItems: Array<ColumnItem>, id: string }> = this.columnGroups.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    if (this.dataOrientation == 'column') {
      // let dateGroup = columnGroups.find(group => { return group.groupLabel == 'Date' });
      let metersGroup = columnGroups.find(group => { return group.groupLabel == 'Meters' });
      return this.importMeterSevice.importMetersFromExcelFile(metersGroup.groupItems, selectedFacility, facilityMeters);
    } else {
      //TODO
    }
  }
}


export interface ColumnItem {
  index: number,
  value: string,
  id: string
}