import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { AnalysisCalculationsHelperService } from 'src/app/analysis/calculations/analysis-calculations-helper.service';
import { ModifiedEnergyIntensityService } from 'src/app/analysis/calculations/modified-energy-intensity.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-annual-analysis-summary',
  templateUrl: './annual-analysis-summary.component.html',
  styleUrls: ['./annual-analysis-summary.component.css']
})
export class AnnualAnalysisSummaryComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  analysisItem: IdbAnalysisItem;
  group: AnalysisGroup;
  facility: IdbFacility;
  annualAnalysisSummary: Array<AnnualAnalysisSummary>
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
    private modifiedEnergyIntensityService: ModifiedEnergyIntensityService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService) {
  }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.group = this.analysisService.selectedGroup.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    if(this.group.analysisType == 'modifiedEnergyIntensity'){
      this.annualAnalysisSummary = this.modifiedEnergyIntensityService.getAnnualAnalysisSummary(this.group, this.analysisItem, this.facility);
    }else{
      this.annualAnalysisSummary = this.analysisCalculationsHelperService.getAnnualAnalysisSummary(this.analysisItem, this.facility, this.group);
    }
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
