import { Component, Input, OnInit } from '@angular/core';
import { MonthlyGroupSummary } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem } from 'src/app/models/idb';

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
  
  orderDataField: string = 'date';
  orderByDirection: string = 'desc';
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
}
