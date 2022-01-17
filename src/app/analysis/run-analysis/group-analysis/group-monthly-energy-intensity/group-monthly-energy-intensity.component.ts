import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { AnnualGroupSummary, EnergyIntensityService, MonthlyGroupSummary } from 'src/app/analysis/calculations/energy-intensity.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-group-monthly-energy-intensity',
  templateUrl: './group-monthly-energy-intensity.component.html',
  styleUrls: ['./group-monthly-energy-intensity.component.css']
})
export class GroupMonthlyEnergyIntensityComponent implements OnInit {

  monthlyGroupSummaries: Array<MonthlyGroupSummary>;
  analysisItem: IdbAnalysisItem;
  dataDisplay: 'table' | 'graph' = 'table';
  itemsPerPage: number = 6;
  facility: IdbFacility;
  baselineEnergyIntensity: number;
  constructor(private energyIntensityService: EnergyIntensityService, private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let group: AnalysisGroup = this.analysisService.selectedGroup.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.monthlyGroupSummaries = this.energyIntensityService.calculateMonthlyGroupSummaries(this.analysisItem, group, this.facility);
    let annualGroupSummaries: Array<AnnualGroupSummary> = this.energyIntensityService.calculateAnnualGroupSummaries(this.analysisItem, group, this.facility);    
    this.baselineEnergyIntensity = annualGroupSummaries[0].energyIntensity;
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
  }
}
