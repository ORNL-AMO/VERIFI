import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { AbsoluteEnergyConsumptionService, MonthlyAbsoluteSummaryData } from 'src/app/analysis/calculations/absolute-energy-consumption.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-monthly-absolute-energy-consumption',
  templateUrl: './monthly-absolute-energy-consumption.component.html',
  styleUrls: ['./monthly-absolute-energy-consumption.component.css']
})
export class MonthlyAbsoluteEnergyConsumptionComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  groupHasError: boolean = false;
  analysisItem: IdbAnalysisItem;
  group: AnalysisGroup;
  monthlyAbsoluteSummary: Array<MonthlyAbsoluteSummaryData>;
  facility: IdbFacility;
  itemsPerPage: number = 12;
  
  constructor(private analysisService: AnalysisService, private analysisDbService: AnalysisDbService,
    private absoluteEnergyConsumptionService: AbsoluteEnergyConsumptionService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    this.group = this.analysisService.selectedGroup.getValue();
    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.monthlyAbsoluteSummary = this.absoluteEnergyConsumptionService.getMonthlyAbsoluteConsumptionGroupSummaries(this.group, this.analysisItem, this.facility);
  }


  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
