import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { AbsoluteEnergyConsumptionService } from 'src/app/analysis/calculations/absolute-energy-consumption.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnnualAnalysisSummary } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-annual-absolute-energy-consumption',
  templateUrl: './annual-absolute-energy-consumption.component.html',
  styleUrls: ['./annual-absolute-energy-consumption.component.css']
})
export class AnnualAbsoluteEnergyConsumptionComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  analysisItem: IdbAnalysisItem;
  group: AnalysisGroup;
  facility: IdbFacility;
  annualAnalysisSummary: Array<AnnualAnalysisSummary>
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
    private absoluteEnergyConsumptionService: AbsoluteEnergyConsumptionService) {
  }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.group = this.analysisService.selectedGroup.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.annualAnalysisSummary = this.absoluteEnergyConsumptionService.getAnnualAnalysisSummary(this.group, this.analysisItem, this.facility);
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
