import { Component, Input, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ColumnItem, ExcelWizardService } from '../excel-wizard.service';

@Component({
  selector: 'app-worksheet-data-table',
  templateUrl: './worksheet-data-table.component.html',
  styleUrls: ['./worksheet-data-table.component.css']
})
export class WorksheetDataTableComponent implements OnInit {
  @Input()
  columnGroups: Array<{ groupLabel: string, groupItems: Array<ColumnItem>, id: string }>;


  selectedWorksheetDataSub: Subscription;
  selectedWorksheetData: Array<Array<string>>
  constructor(private excelWizardService: ExcelWizardService) { }

  ngOnInit(): void {
    this.selectedWorksheetDataSub = this.excelWizardService.selectedWorksheetData.subscribe(val => {
      if (val.length != 0) {
        this.selectedWorksheetData = val;
      } else {
        this.selectedWorksheetData = [];
      }
    });
  }

  ngOnDestroy() {
    this.selectedWorksheetDataSub.unsubscribe();
  }

  getColumnClass(columnName: string): string {
    if (this.columnGroups) {
      let columnClass: string;
      this.columnGroups.forEach(group => {
        group.groupItems.forEach(item => {
          if (item.value == columnName) {
            columnClass = group.groupLabel;
          }
        })
      });
      return columnClass;
    }
    return;
  }
}
