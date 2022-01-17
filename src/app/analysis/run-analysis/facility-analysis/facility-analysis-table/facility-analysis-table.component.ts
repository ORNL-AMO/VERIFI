import { Component, Input, OnInit } from '@angular/core';
import { FacilityGroupSummary } from 'src/app/analysis/calculations/energy-intensity.service';
import { IdbAnalysisItem } from 'src/app/models/idb';

@Component({
  selector: 'app-facility-analysis-table',
  templateUrl: './facility-analysis-table.component.html',
  styleUrls: ['./facility-analysis-table.component.css']
})
export class FacilityAnalysisTableComponent implements OnInit {
  @Input()
  facilityGroupSummaries: Array<FacilityGroupSummary>;
  @Input()
  analysisItem: IdbAnalysisItem;

  constructor() { }

  ngOnInit(): void {
  }

}
