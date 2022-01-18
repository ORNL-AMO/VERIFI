import { Component, Input, OnInit } from '@angular/core';
import { AnnualGroupSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem } from 'src/app/models/idb';

@Component({
  selector: 'app-annual-energy-intensity-table',
  templateUrl: './annual-energy-intensity-table.component.html',
  styleUrls: ['./annual-energy-intensity-table.component.css']
})
export class AnnualEnergyIntensityTableComponent implements OnInit {
  @Input()
  annualGroupSummaries: Array<AnnualGroupSummary>;
  @Input()
  analysisItem: IdbAnalysisItem;
  constructor() { }

  ngOnInit(): void {
  }

}
