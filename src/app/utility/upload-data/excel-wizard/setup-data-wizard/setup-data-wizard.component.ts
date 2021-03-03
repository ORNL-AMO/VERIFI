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
  
  selectedWorksheetDataSub: Subscription;
  constructor(private excelWizardService: ExcelWizardService) { }

  ngOnInit(): void {
    this.worksheetNames = this.excelWizardService.workbook.SheetNames;
    this.selectedWorksheetName = this.excelWizardService.selectedWorksheetName;

    this.selectedWorksheetDataSub = this.excelWizardService.selectedWorksheetData.subscribe(val => {
      this.selectedWorksheetData = val;
    });

  }

  ngOnDestroy(){
    this.selectedWorksheetDataSub.unsubscribe();
  }

  setSelectedWorksheetName(){
    this.excelWizardService.setSelectedWorksheetName(this.selectedWorksheetName);
  }
}
