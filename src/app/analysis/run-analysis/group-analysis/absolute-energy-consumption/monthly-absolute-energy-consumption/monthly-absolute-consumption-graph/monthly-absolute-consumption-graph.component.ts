import { Component, Input, OnInit } from '@angular/core';
import { MonthlyAbsoluteSummaryData } from 'src/app/analysis/calculations/absolute-energy-consumption.service';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-absolute-consumption-graph',
  templateUrl: './monthly-absolute-consumption-graph.component.html',
  styleUrls: ['./monthly-absolute-consumption-graph.component.css']
})
export class MonthlyAbsoluteConsumptionGraphComponent implements OnInit {
  @Input()
  monthlyAbsoluteSummary: Array<MonthlyAbsoluteSummaryData>;
  @Input()
  analysisItem: IdbAnalysisItem;
  @Input()
  facility: IdbFacility;

  constructor() { }

  ngOnInit(): void {
  }

}
