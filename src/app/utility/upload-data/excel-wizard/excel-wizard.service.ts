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
  selectedWorksheetData: BehaviorSubject<Array<Array<number | string | Date>>>;
  selectedWorksheetName: string;

  // unusedColumns: BehaviorSubject<Array<ColumnItem>>;
  // dateColumn: BehaviorSubject<ColumnItem>;
  // meterColumns: BehaviorSubject<Array<ColumnItem>>;
  // predictorsColumns: BehaviorSubject<Array<ColumnItem>>;

  columnGroups: BehaviorSubject<Array<{groupLabel: string, groupItems: Array<ColumnItem>, id: string}>>;

  constructor() {
    this.selectedWorksheetData = new BehaviorSubject([]);
    this.columnGroups = new BehaviorSubject<Array<{groupLabel: string, groupItems: Array<ColumnItem>, id: string}>>([]);
    this.selectedWorksheetData.subscribe(data => {
      if (data && data.length != 0) {
        this.setColumnGroups(data[0]);
      }
    });
  }

  setSelectedWorksheetName(selectedWorksheetName: string) {
    this.selectedWorksheetName = selectedWorksheetName;
    this.parseWorksheet();
  }

  parseWorksheet() {
    let selectedWorksheetData: Array<Array<number | string | Date>> = XLSX.utils.sheet_to_json(this.workbook.Sheets[this.selectedWorksheetName], { header: 1 });
    this.selectedWorksheetData.next(selectedWorksheetData);
    // this.selectedDateColumn = 0;
    // this.setColumns();
  }

  setColumnGroups(headers: Array<number | string | Date>) {
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

  // setColumns() {
  //   this.headers.forEach((header, index) => {
  //     if (index != this.selectedDateColumn) {
  //       this.selectedMeterColumns.push({
  //         index: index,
  //         name: header
  //       });
  //     }
  //   });
  //   this.setDates();
  // }

  // setDates() {
  //   let datesColumnData: Array<number | string | Date> = this.selectedWorksheetData.map(dataItem => {
  //     return dataItem[this.selectedDateColumn];
  //   });
  //   datesColumnData = datesColumnData.filter(item => { return item != undefined });
  //   let importMeterDates: Array<Date> = datesColumnData.map(data => { return new Date(data) });
  //   importMeterDates = importMeterDates.filter(dateItem => { return dateItem instanceof Date && !isNaN(dateItem.getTime()) });
  //   this.minDate = _.min(importMeterDates);
  //   this.maxDate = _.max(importMeterDates);
  //   this.uploadDataService.excelImportMeterDates.next(importMeterDates);
  // }


}


export interface ColumnItem {
  index: number,
  value: number | string | Date,
  id: string
}