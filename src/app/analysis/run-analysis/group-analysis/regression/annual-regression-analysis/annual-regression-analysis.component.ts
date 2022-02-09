import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { RegressionAnalysisService } from 'src/app/analysis/calculations/regression-analysis.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnnualRegressionSummary } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-annual-regression-analysis',
  templateUrl: './annual-regression-analysis.component.html',
  styleUrls: ['./annual-regression-analysis.component.css']
})
export class AnnualRegressionAnalysisComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  groupHasError: boolean = false;
  analysisItem: IdbAnalysisItem;
  group: AnalysisGroup;
  facility: IdbFacility;
  // itemsPerPage: number = 12;
  annualRegressionSummary: Array<AnnualRegressionSummary>
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
    private regressionAnalysisService: RegressionAnalysisService) {
  }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.group = this.analysisService.selectedGroup.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.annualRegressionSummary = this.regressionAnalysisService.getAnnualRegressionSummary(this.group, this.analysisItem, this.facility);
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
