import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ExcelWizardService } from '../excel-wizard.service';

@Component({
  selector: 'app-worksheet-data-table',
  templateUrl: './worksheet-data-table.component.html',
  styleUrls: ['./worksheet-data-table.component.css']
})
export class WorksheetDataTableComponent implements OnInit {

  selectedWorksheetDataSub: Subscription;
  selectedWorksheetData: Array<Array<number | string | Date>>
  constructor(private excelWizardService: ExcelWizardService) { }

  ngOnInit(): void {
    this.selectedWorksheetDataSub = this.excelWizardService.selectedWorksheetData.subscribe(val => {
      this.selectedWorksheetData = val;
    });
  }

  ngOnDestroy() {
    this.selectedWorksheetDataSub.unsubscribe();
  }
}
