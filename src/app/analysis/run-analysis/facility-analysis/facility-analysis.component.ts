import { Component, OnInit } from '@angular/core';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityGroupSummary, FacilityGroupTotals } from 'src/app/models/analysis';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { AnalysisService } from '../../analysis.service';
import { EnergyIntensityService } from '../../calculations/energy-intensity.service';

@Component({
  selector: 'app-facility-analysis',
  templateUrl: './facility-analysis.component.html',
  styleUrls: ['./facility-analysis.component.css']
})
export class FacilityAnalysisComponent implements OnInit {


  dataDisplay: 'table' | 'graph' = 'table';
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  facilityGroupSummaries: Array<FacilityGroupSummary>;
  facilityGroupTotals: Array<FacilityGroupTotals>;
  constructor(private analysisService: AnalysisService, private energyIntensityService: EnergyIntensityService,
    private facilityDbService: FacilitydbService, private analysisDbService: AnalysisDbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.facilityGroupSummaries = this.energyIntensityService.calculateFacilitySummary(this.analysisItem, this.facility);
    this.facilityGroupTotals = this.energyIntensityService.calculateFacilityGroupTotals(this.facilityGroupSummaries, this.facility, this.analysisItem);
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
