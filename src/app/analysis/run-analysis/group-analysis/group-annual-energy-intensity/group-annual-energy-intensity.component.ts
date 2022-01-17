import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { AnnualGroupSummary, EnergyIntensityService } from 'src/app/analysis/calculations/energy-intensity.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';

@Component({
  selector: 'app-group-annual-energy-intensity',
  templateUrl: './group-annual-energy-intensity.component.html',
  styleUrls: ['./group-annual-energy-intensity.component.css']
})
export class GroupAnnualEnergyIntensityComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  annualGroupSummaries: Array<AnnualGroupSummary>;
  analysisItem: IdbAnalysisItem;
  constructor(private energyIntensityService: EnergyIntensityService, private analysisService: AnalysisService,
    private analysisDbService: AnalysisDbService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.dataDisplay = this.analysisService.dataDisplay.getValue();
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    let group: AnalysisGroup = this.analysisService.selectedGroup.getValue();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.annualGroupSummaries = this.energyIntensityService.calculateAnnualGroupSummaries(this.analysisItem, group, selectedFacility);
  }

  setDataDisplay(display: 'table' | 'graph') {
    this.dataDisplay = display;
    this.analysisService.dataDisplay.next(this.dataDisplay);
  }
}
