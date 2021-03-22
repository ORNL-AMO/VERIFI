import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import * as XLSX from 'xlsx';
import { ImportMeterFileSummary } from '../import-meter.service';
import { ExcelWizardService } from './excel-wizard.service';

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

  wizardPage: number = 1;
  workbookLoaded: boolean = false;
  importMeterFileWizard: { fileName: string, importMeterFileSummary: ImportMeterFileSummary, id: string };
  fileName: string
  constructor(private excelWizardService: ExcelWizardService) { }

  ngOnInit(): void {
    this.readWorkbook(this.selectedExcelFile);
  }

  readWorkbook(fileReference: File) {
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      /* read workbook */
      const bstr: string = e.target.result;
      this.excelWizardService.workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
      this.excelWizardService.setSelectedWorksheetName(this.excelWizardService.workbook.SheetNames[0]);
      this.workbookLoaded = true;
    };
    reader.readAsBinaryString(fileReference);
  }

  close() {
    this.emitClose.emit(true);
  }

  continue() {
    if(this.wizardPage == 2){
     let meterSumary: ImportMeterFileSummary = this.excelWizardService.getImportMeterFileSummary();
     this.importMeterFileWizard = {
       fileName: this.selectedExcelFile.name,
       importMeterFileSummary: meterSumary,
       id: undefined
     }
    }
    this.wizardPage++;
  }

  back() {
    this.wizardPage--;
  }
}
