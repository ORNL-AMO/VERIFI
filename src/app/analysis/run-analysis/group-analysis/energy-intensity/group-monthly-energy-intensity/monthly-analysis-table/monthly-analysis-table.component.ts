import { Component, Input, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
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
  orderByDirection: 'asc' | 'desc' = 'asc';
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
