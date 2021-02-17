import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import * as XLSX from 'xlsx';
import { ExcelWizardService } from '../excel-wizard.service';

@Component({
  selector: 'app-setup-data-wizard',
  templateUrl: './setup-data-wizard.component.html',
  styleUrls: ['./setup-data-wizard.component.css']
})
export class SetupDataWizardComponent implements OnInit {

  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter();
  @Output('emitContinue')
  emitContinue: EventEmitter<boolean> = new EventEmitter();

  worksheetNames: Array<string>;
  selectedWorksheetData: Array<Array<number | string | Date>>;
  selectedWorksheetName: string;
  selectedWorksheet: XLSX.WorkSheet;
  headerRow: number = 0;
  headers: Array<number | string | Date>;
  selectedDateColumn: number = 0;
  selectedEnergyConsumptionColumn: number;
  selectedMeterNumberColumn: number;
  selectedMeterColumns: Array<{ index: number, name: number | string | Date }> = [];
  nonMeterColumns: Array<{ index: number, name: number | string | Date }> = [];
  dataOrientation: string = 'column';
  
  minDate: Date;
  maxDate: Date;
  selectedWorksheetDataSub: Subscription;
  constructor(private excelWizardService: ExcelWizardService) { }

  ngOnInit(): void {
    this.worksheetNames = this.excelWizardService.workbook.SheetNames;
    this.selectedWorksheetName = this.excelWizardService.selectedWorksheetName;

    this.selectedWorksheetDataSub = this.excelWizardService.selectedWorksheetData.subscribe(val => {
      this.selectedWorksheetData = val;
    });


    // this.parseWorksheet();
  }

  ngOnDestroy(){
    this.selectedWorksheetDataSub.unsubscribe();
  }

  setSelectedWorksheetName(){
    this.excelWizardService.setSelectedWorksheetName(this.selectedWorksheetName);
    // this.selectedWorksheetData = this.excelWizardService.selectedWorksheetData;
  }

  // parseWorksheet() {
  //   this.selectedWorksheetData = XLSX.utils.sheet_to_json(this.workbook.Sheets[this.selectedWorksheetName], { header: 1 });
  //   this.headers = this.selectedWorksheetData[0];
  //   this.selectedDateColumn = 0;
  //   this.setColumns();
  // }


  // setColumns() {
  //   this.selectedMeterColumns = new Array();
  //   this.nonMeterColumns = new Array();
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


  // close() {
  //   this.emitClose.emit(true);
  // }

  // removeNonMeterColumn(column: { index: number, name: number | string | Date }) {
  //   this.selectedMeterColumns.push(column);
  //   this.nonMeterColumns = this.nonMeterColumns.filter(selectedColumn => { return column.index != selectedColumn.index });
  // }

  // removeSelectedMeterColumn(column: { index: number, name: number | string | Date }) {
  //   this.nonMeterColumns.push(column);
  //   this.selectedMeterColumns = this.selectedMeterColumns.filter(selectedColumn => { return column.index != selectedColumn.index });
  // }


  // continue() {
  //   let importMeters: Array<IdbUtilityMeter> = new Array();
  //   let importMeterConsumption: Array<Array<number>> = new Array();
  //   let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
  //   this.selectedMeterColumns.forEach(column => {
  //     let newMeter: IdbUtilityMeter = this.utilityMeterdbService.getNewIdbUtilityMeter(selectedFacility.id, selectedFacility.accountId, false);
  //     newMeter.name = String(column.name);
  //     importMeters.push(newMeter);
  //   });

  //   this.uploadDataService.excelImportMeters.next(importMeters);
  //   // this.wizardPage = 2;
  //   this.emitContinue.emit(true);
  // }
}
