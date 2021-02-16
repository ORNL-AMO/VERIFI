import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { UploadDataService } from '../../upload-data.service';
import * as XLSX from 'xlsx';
import { IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-excel-wizard',
  templateUrl: './excel-wizard.component.html',
  styleUrls: ['./excel-wizard.component.css']
})
export class ExcelWizardComponent implements OnInit {
  @Input()
  selectedExcelFile: File;
  @Output('emitClose')
  emitClose = new EventEmitter<boolean>();

  workbook: XLSX.WorkBook;
  worksheetNames: Array<string>;
  selectedWorksheetName: string;
  selectedWorksheet: XLSX.WorkSheet;
  selectedWorksheetData: Array<Array<number | string | Date>>;
  headerRow: number = 0;
  headers: Array<number | string | Date>;
  selectedDateColumn: number = 0;
  selectedEnergyConsumptionColumn: number;
  selectedMeterNumberColumn: number;
  selectedMeterColumns: Array<{ index: number, name: number | string | Date }> = [];
  nonMeterColumns: Array<{ index: number, name: number | string | Date }> = [];
  dataOrientation: string = 'column';
  importMeters: Array<IdbUtilityMeter>;
  importMeterDates: Array<Date>;
  importMeterConsumption: Array<Array<number>>;
  wizardPage: number = 1;
  minDate: Date;
  maxDate: Date;
  constructor(private uploadDataService: UploadDataService, private utilityMeterdbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.readWorkbook(this.selectedExcelFile);
  }

  readWorkbook(fileReference: File) {
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      /* read workbook */
      const bstr: string = e.target.result;
      this.workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
      this.worksheetNames = this.workbook.SheetNames;
      this.selectedWorksheetName = this.worksheetNames[0];
      this.parseWorksheet();
    };
    reader.readAsBinaryString(fileReference);
  }

  parseWorksheet() {
    this.selectedWorksheetData = XLSX.utils.sheet_to_json(this.workbook.Sheets[this.selectedWorksheetName], { header: 1 });
    this.headers = this.selectedWorksheetData[0];
    this.selectedDateColumn = 0;
    this.setColumns();
  }

  setColumns() {
    this.selectedMeterColumns = new Array();
    this.nonMeterColumns = new Array();
    this.headers.forEach((header, index) => {
      if (index != this.selectedDateColumn) {
        this.selectedMeterColumns.push({
          index: index,
          name: header
        });
      }
    });
    this.setDates();
  }

  setDates() {
    let datesColumnData: Array<number | string | Date> = this.selectedWorksheetData.map(dataItem => {
      return dataItem[this.selectedDateColumn];
    });
    datesColumnData = datesColumnData.filter(item => { return item != undefined });
    this.importMeterDates = datesColumnData.map(data => { return new Date(data) });
    this.importMeterDates = this.importMeterDates.filter(dateItem => {return dateItem instanceof Date && !isNaN(dateItem.getTime())});
    this.minDate = _.min(this.importMeterDates);
    this.maxDate = _.max(this.importMeterDates);
  }


  close() {
    this.emitClose.emit(true);
  }

  removeNonMeterColumn(column: { index: number, name: number | string | Date }) {
    this.selectedMeterColumns.push(column);
    this.nonMeterColumns = this.nonMeterColumns.filter(selectedColumn => { return column.index != selectedColumn.index });
  }

  removeSelectedMeterColumn(column: { index: number, name: number | string | Date }) {
    this.nonMeterColumns.push(column);
    this.selectedMeterColumns = this.selectedMeterColumns.filter(selectedColumn => { return column.index != selectedColumn.index });
  }


  continue() {
    this.importMeters = new Array();
    this.importMeterConsumption = new Array();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.selectedMeterColumns.forEach(column => {
      let newMeter: IdbUtilityMeter = this.utilityMeterdbService.getNewIdbUtilityMeter(selectedFacility.id, selectedFacility.accountId, false);
      newMeter.name = String(column.name);
      this.importMeters.push(newMeter);
    });
    this.wizardPage = 2;
  }


}
