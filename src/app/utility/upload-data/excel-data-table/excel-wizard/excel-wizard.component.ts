import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { UploadDataService } from '../../upload-data.service';
import * as XLSX from 'xlsx';

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
  selectedMeterColumns: Array<{ index: number, name: number | string | Date }> = [];
  nonMeterColumns: Array<{ index: number, name: number | string | Date }> = [];
  dataOrientation: string = 'column';
  constructor(private uploadDataService: UploadDataService) { }

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
    })
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
}
