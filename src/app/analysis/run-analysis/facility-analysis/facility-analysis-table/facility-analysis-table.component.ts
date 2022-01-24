import { Component, Input, OnInit } from '@angular/core';
import { AnnualGroupSummary, FacilityGroupSummary, FacilityGroupTotals } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

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
  @Input()
  facility: IdbFacility;
  @Input()
  facilityGroupTotals: Array<FacilityGroupTotals>;

  constructor() { }

  ngOnInit(): void {
  }

  toggleCollapsed(index: number) {
    this.facilityGroupSummaries[index].collapsed = !this.facilityGroupSummaries[index].collapsed;
  }
}
