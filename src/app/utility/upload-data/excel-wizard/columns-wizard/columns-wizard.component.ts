import { Component, OnInit } from '@angular/core';
import { ColumnItem, ExcelWizardService } from '../excel-wizard.service';

@Component({
  selector: 'app-columns-wizard',
  templateUrl: './columns-wizard.component.html',
  styleUrls: ['./columns-wizard.component.css']
})
export class ColumnsWizardComponent implements OnInit {

  unusedColumns: Array<ColumnItem>;
  dateColumn: ColumnItem;
  meterColumns: Array<ColumnItem>;
  predictorsColumns: Array<ColumnItem>;

  constructor(private excelWizardService: ExcelWizardService) { }

  ngOnInit(): void {
    this.unusedColumns = this.excelWizardService.unusedColumns.getValue();
    this.dateColumn = this.excelWizardService.dateColumn.getValue();
    this.predictorsColumns = this.excelWizardService.predictorsColumns.getValue();
    this.meterColumns = this.excelWizardService.meterColumns.getValue();
  }

}
