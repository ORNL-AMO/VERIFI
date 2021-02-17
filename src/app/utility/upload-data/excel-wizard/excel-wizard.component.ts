import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import * as XLSX from 'xlsx';
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
    this.wizardPage++;
  }

  back() {
    this.wizardPage--;
  }
}
