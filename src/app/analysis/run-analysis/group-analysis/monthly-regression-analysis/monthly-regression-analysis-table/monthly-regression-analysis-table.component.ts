import { Component, Input, OnInit } from '@angular/core';
import { MonthlyRegressionSummary } from 'src/app/analysis/calculations/regression-analysis.service';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-regression-analysis-table',
  templateUrl: './monthly-regression-analysis-table.component.html',
  styleUrls: ['./monthly-regression-analysis-table.component.css']
})
export class MonthlyRegressionAnalysisTableComponent implements OnInit {
  @Input()
  monthlyRegressionSummary: MonthlyRegressionSummary;
  @Input()
  analysisItem: IdbAnalysisItem;
  @Input()
  itemsPerPage: number;
  @Input()
  facility: IdbFacility;

  orderDataField: string = 'date';
  orderByDirection: string = 'asc';
  currentPageNumber: number = 1;
  constructor() { }

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
    if (this.orderDataField == 'date' || this.orderDataField == 'fiscalYear') {
      if (this.facility.fiscalYear == 'calendarYear' && this.orderByDirection == 'asc') {
        return date.getUTCMonth() == 0;
      } else if (this.facility.fiscalYear == 'calendarYear' && this.orderByDirection == 'desc') {
        return date.getUTCMonth() == 11;
      } else {
        if (date.getUTCMonth() == this.facility.fiscalYearMonth && this.orderByDirection == 'asc') {
          return true;
        } else if (date.getUTCMonth() + 1 == this.facility.fiscalYearMonth && this.orderByDirection == 'desc') {
          return true;
        } else {
          return false;
        }
      }
    }
    return false;
  }

}
