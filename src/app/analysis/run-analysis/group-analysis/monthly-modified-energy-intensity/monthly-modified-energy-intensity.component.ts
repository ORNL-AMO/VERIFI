import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { ModifiedEnergyIntensityService } from 'src/app/analysis/calculations/modified-energy-intensity.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-modified-energy-intensity',
  templateUrl: './monthly-modified-energy-intensity.component.html',
  styleUrls: ['./monthly-modified-energy-intensity.component.css']
})
export class MonthlyModifiedEnergyIntensityComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  groupHasError: boolean = false;
  analysisItem: IdbAnalysisItem;
  group: AnalysisGroup;
  monthlyModifiedEnergyIntensitySummary: MonthlyAnalysisSummary;
  facility: IdbFacility;
  itemsPerPage: number = 12;
  
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService,
    private modifiedEnergyIntensityService: ModifiedEnergyIntensityService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.group = this.analysisService.selectedGroup.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.monthlyModifiedEnergyIntensitySummary = this.modifiedEnergyIntensityService.getMonthlyModifiedEnergyIntensitySummary(this.group, this.analysisItem, this.facility);
  }


  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
