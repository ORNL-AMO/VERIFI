import { Component, Input, OnInit } from '@angular/core';
import { AnnualRegressionSummary } from 'src/app/models/analysis';
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

  constructor() { }

  ngOnInit(): void {
  }
}
