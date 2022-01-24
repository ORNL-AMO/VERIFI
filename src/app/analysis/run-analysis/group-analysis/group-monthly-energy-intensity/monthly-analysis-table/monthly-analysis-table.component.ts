import { Component, Input, OnInit } from '@angular/core';
import { MonthlyGroupSummary } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-analysis-table',
  templateUrl: './monthly-analysis-table.component.html',
  styleUrls: ['./monthly-analysis-table.component.css']
})
export class MonthlyAnalysisTableComponent implements OnInit {
  @Input()
  monthlyGroupSummaries: Array<MonthlyGroupSummary>;
  @Input()
  itemsPerPage: number;
  @Input()
  analysisItem: IdbAnalysisItem;
  @Input()
  group: AnalysisGroup;
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
