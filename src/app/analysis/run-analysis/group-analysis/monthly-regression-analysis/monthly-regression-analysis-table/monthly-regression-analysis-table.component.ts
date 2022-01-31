import { Component, Input, OnInit } from '@angular/core';
import { MonthlyRegressionSummary } from 'src/app/analysis/calculations/regression-analysis.service';
import { IdbAnalysisItem } from 'src/app/models/idb';

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

  currentPageNumber: number = 1;
  constructor() { }

  ngOnInit(): void {
  }

}
