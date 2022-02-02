import { Component, Input, OnInit } from '@angular/core';
import { AnnualRegressionSummary } from 'src/app/analysis/calculations/regression-analysis.service';
import { IdbAnalysisItem } from 'src/app/models/idb';

@Component({
  selector: 'app-annual-regression-analysis-table',
  templateUrl: './annual-regression-analysis-table.component.html',
  styleUrls: ['./annual-regression-analysis-table.component.css']
})
export class AnnualRegressionAnalysisTableComponent implements OnInit {
  @Input()
  annualRegressionSummary: Array<AnnualRegressionSummary>;
  @Input()
  analysisItem: IdbAnalysisItem;

  
  orderDataField: string = 'date';
  orderByDirection: string = 'asc';
  // currentPageNumber: number = 1;
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
