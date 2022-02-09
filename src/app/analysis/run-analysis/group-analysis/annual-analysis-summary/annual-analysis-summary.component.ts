import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { AbsoluteEnergyConsumptionService } from 'src/app/analysis/calculations/absolute-energy-consumption.service';
import { RegressionAnalysisService } from 'src/app/analysis/calculations/regression-analysis.service';
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
  // itemsPerPage: number = 12;
  annualAnalysisSummary: Array<AnnualAnalysisSummary>
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
    private regressionAnalysisService: RegressionAnalysisService, private absoluteEnergyConsumptionService: AbsoluteEnergyConsumptionService) {
  }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.group = this.analysisService.selectedGroup.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    if (this.group.analysisType == 'regression') {
      this.annualAnalysisSummary = this.regressionAnalysisService.getAnnualRegressionSummary(this.group, this.analysisItem, this.facility);
    } else if (this.group.analysisType == 'absoluteEnergyConsumption') {
      this.annualAnalysisSummary = this.absoluteEnergyConsumptionService.getAnnualAnalysisSummary(this.group, this.analysisItem, this.facility);
    }
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
