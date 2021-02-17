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

  unusedColumns: BehaviorSubject<Array<ColumnItem>>;
  dateColumn: BehaviorSubject<ColumnItem>;
  meterColumns: BehaviorSubject<Array<ColumnItem>>;
  predictorsColumns: BehaviorSubject<Array<ColumnItem>>;



  constructor() {
    this.selectedWorksheetData = new BehaviorSubject([]);
    this.meterColumns = new BehaviorSubject<Array<ColumnItem>>([]);
    this.predictorsColumns = new BehaviorSubject<Array<ColumnItem>>([]);
    this.dateColumn = new BehaviorSubject<ColumnItem>(undefined);
    this.unusedColumns = new BehaviorSubject<Array<ColumnItem>>([]);
    this.selectedWorksheetData.subscribe(data => {
      if (data && data.length != 0) {
        this.setColumns(data[0]);
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

  setColumns(headers: Array<number | string | Date>) {
    this.meterColumns.next([]);
    this.dateColumn.next(undefined);
    this.predictorsColumns.next([]);
    let unusedColumns: Array<ColumnItem> = new Array();
    headers.forEach((header, index) => {
      unusedColumns.push({ value: header, index: index });
    });

    //todo: enhance check for "Date"
    let dateColumnIndex: number = unusedColumns.findIndex((column) => {return column.value == 'Date'});
    if(dateColumnIndex > -1){
      let dateColumn: ColumnItem = unusedColumns[dateColumnIndex];
      this.dateColumn.next(dateColumn);
      unusedColumns.splice(dateColumnIndex, 1);
    }
    this.unusedColumns.next(unusedColumns);
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
  value: number | string | Date
}