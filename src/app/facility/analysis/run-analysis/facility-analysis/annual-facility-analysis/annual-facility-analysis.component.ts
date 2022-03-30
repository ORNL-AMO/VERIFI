import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/facility/analysis/analysis.service';
import { FacilityAnalysisCalculationsService } from 'src/app/facility/analysis/calculations/facility-analysis-calculations.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnnualAnalysisSummary, FacilityGroupSummary } from 'src/app/models/analysis';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-annual-facility-analysis',
  templateUrl: './annual-facility-analysis.component.html',
  styleUrls: ['./annual-facility-analysis.component.css']
})
export class AnnualFacilityAnalysisComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  annualAnalysisSummary: Array<AnnualAnalysisSummary>;
  constructor(private analysisService: AnalysisService, private facilityAnalysisCalculationsService: FacilityAnalysisCalculationsService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.annualAnalysisSummary = this.facilityAnalysisCalculationsService.getAnnualAnalysisSummary(this.analysisItem, this.facility);
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
