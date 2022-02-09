import { Component, Input, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { MonthlyAbsoluteSummaryData } from 'src/app/analysis/calculations/absolute-energy-consumption.service';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-absolute-consumption-table',
  templateUrl: './monthly-absolute-consumption-table.component.html',
  styleUrls: ['./monthly-absolute-consumption-table.component.css']
})
export class MonthlyAbsoluteConsumptionTableComponent implements OnInit {
  @Input()
  monthlyAbsoluteSummary: Array<MonthlyAbsoluteSummaryData>;
  @Input()
  analysisItem: IdbAnalysisItem;
  @Input()
  itemsPerPage: number;
  @Input()
  facility: IdbFacility;

  orderDataField: string = 'date';
  orderByDirection:  'asc' | 'desc' = 'asc';
  currentPageNumber: number = 1;

  constructor(private analysisService: AnalysisService) { }

  ngOnInit(): void {
  }


  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

  checkFiscalYearEnd(date: Date): boolean {
    return this.analysisService.checkFiscalYearEnd(date, this.facility, this.orderDataField, this.orderByDirection);
  }
}
