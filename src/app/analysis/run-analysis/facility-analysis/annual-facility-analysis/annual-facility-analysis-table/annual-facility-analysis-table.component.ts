import { Component, Input, OnInit } from '@angular/core';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idb';

@Component({
  selector: 'app-annual-facility-analysis-table',
  templateUrl: './annual-facility-analysis-table.component.html',
  styleUrls: ['./annual-facility-analysis-table.component.css']
})
export class AnnualFacilityAnalysisTableComponent implements OnInit {
  @Input()
  annualFacilitySummaryData: Array<AnnualAnalysisSummary>;
  @Input()
  analysisItem: IdbAnalysisItem;

  constructor() { }

  ngOnInit(): void {
  }

}
