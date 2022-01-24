import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { EnergyIntensityService } from 'src/app/analysis/calculations/energy-intensity.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AnnualGroupSummary, MonthlyGroupSummary } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';

@Component({
  selector: 'app-group-monthly-energy-intensity',
  templateUrl: './group-monthly-energy-intensity.component.html',
  styleUrls: ['./group-monthly-energy-intensity.component.css']
})
export class GroupMonthlyEnergyIntensityComponent implements OnInit {

  monthlyGroupSummaries: Array<MonthlyGroupSummary>;
  analysisItem: IdbAnalysisItem;
  dataDisplay: 'table' | 'graph' = 'table';
  itemsPerPage: number = 12;
  facility: IdbFacility;
  baselineEnergyIntensity: number;
  group: AnalysisGroup;
  groupHasError: boolean;
  constructor(private energyIntensityService: EnergyIntensityService, private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.group = this.analysisService.selectedGroup.getValue();
    this.setGroupError();
    if (!this.groupHasError) {
      this.facility = this.facilityDbService.selectedFacility.getValue();
      this.monthlyGroupSummaries = this.energyIntensityService.calculateMonthlyGroupSummaries(this.analysisItem, this.group, this.facility);
      let annualGroupSummaries: Array<AnnualGroupSummary> = this.energyIntensityService.calculateAnnualGroupSummaries(this.analysisItem, this.group, this.facility);
      this.baselineEnergyIntensity = annualGroupSummaries[0].energyIntensity;
    }
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
  
  setGroupError() {
    let groupMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getGroupMetersByGroupId(this.group.idbGroupId);
    this.groupHasError = (groupMeters.length == 0);
  }
}
