import { Component, Input, OnInit } from '@angular/core';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idb';

@Component({
  selector: 'app-annual-analysis-summary-table',
  templateUrl: './annual-analysis-summary-table.component.html',
  styleUrls: ['./annual-analysis-summary-table.component.css']
})
export class AnnualAnalysisSummaryTableComponent implements OnInit {
  @Input()
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  @Input()
  analysisItem: IdbAnalysisItem;

  constructor() { }

  ngOnInit(): void {
  }

}
