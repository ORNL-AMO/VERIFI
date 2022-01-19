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

  // orderDataField: string = 'date';
  // orderByDirection: string = 'asc';
  currentPageNumber: number = 1;
  constructor() { }

  ngOnInit(): void {
  }


  checkFiscalYearEnd(date: Date): boolean {
    if (this.facility.fiscalYear == 'calendarYear') {
      return date.getUTCMonth() == 0;
    } else {
      if (date.getUTCMonth() == this.facility.fiscalYearMonth) {
        return true;
      } else {
        return false;
      }
    }
  }
}
