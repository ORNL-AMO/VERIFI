import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { IdbUtilityMeter } from 'src/app/models/idb';
import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root'
})
export class ExcelWizardService {

  workbook: XLSX.WorkBook;
  importMeters: Array<IdbUtilityMeter>;
  selectedWorksheetData: BehaviorSubject<Array<Array<string>>>;
  selectedWorksheetDataHeaderMap: BehaviorSubject<Array<any>>;
  selectedWorksheetName: string;

  // unusedColumns: BehaviorSubject<Array<ColumnItem>>;
  // dateColumn: BehaviorSubject<ColumnItem>;
  // meterColumns: BehaviorSubject<Array<ColumnItem>>;
  // predictorsColumns: BehaviorSubject<Array<ColumnItem>>;

  columnGroups: BehaviorSubject<Array<{groupLabel: string, groupItems: Array<ColumnItem>, id: string}>>;
  rowGroups:BehaviorSubject<Array<{fieldLabel: string, fieldName: string, groupItems: Array<ColumnItem>, id: string}>>;

  constructor() {
    this.selectedWorksheetData = new BehaviorSubject([]);
    this.selectedWorksheetDataHeaderMap = new BehaviorSubject([]);
    this.rowGroups = new BehaviorSubject([]);
    this.columnGroups = new BehaviorSubject<Array<{groupLabel: string, groupItems: Array<ColumnItem>, id: string}>>([]);
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
    let columnGroups: Array<{groupLabel: string, groupItems: Array<ColumnItem>, id: string}> = new Array();
    let dateGroupItems: Array<ColumnItem> = new Array();
    let unusedColumns: Array<ColumnItem> = new Array();
    headers.forEach((header, index) => {
      unusedColumns.push({ value: header, index: index, id: Math.random().toString(36).substr(2, 9)});
    });

    //todo: enhance check for "Date"
    let dateColumnIndex: number = unusedColumns.findIndex((column) => {return column.value == 'Date'});
    if(dateColumnIndex > -1){
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
    let rowGroups: Array<{fieldLabel: string, fieldName: string, groupItems: Array<ColumnItem>, id: string}> = new Array();
    let dateGroupItems: Array<ColumnItem> = new Array();
    let unusedColumns: Array<ColumnItem> = new Array();
    headers.forEach((header, index) => {
      unusedColumns.push({ value: header, index: index, id: Math.random().toString(36).substr(2, 9)});
    });

    //todo: enhance check for "Date"
    let dateColumnIndex: number = unusedColumns.findIndex((column) => {return column.value == 'Date'});
    if(dateColumnIndex > -1){
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





}


export interface ColumnItem {
  index: number,
  value: string,
  id: string
}