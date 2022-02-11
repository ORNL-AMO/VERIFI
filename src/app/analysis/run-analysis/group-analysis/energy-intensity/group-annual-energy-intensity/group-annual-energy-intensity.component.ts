import { Component, OnInit } from '@angular/core';
import { AnalysisService } from 'src/app/analysis/analysis.service';
import { EnergyIntensityService } from 'src/app/analysis/calculations/energy-intensity.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AnnualGroupSummary } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';

@Component({
  selector: 'app-group-annual-energy-intensity',
  templateUrl: './group-annual-energy-intensity.component.html',
  styleUrls: ['./group-annual-energy-intensity.component.css']
})
export class GroupAnnualEnergyIntensityComponent implements OnInit {

  dataDisplay: 'table' | 'graph';
  annualGroupSummaries: Array<AnnualGroupSummary>;
  analysisItem: IdbAnalysisItem;
  group: AnalysisGroup;
  facility: IdbFacility;
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
      // this.annualGroupSummaries = this.energyIntensityService.calculateAnnualGroupSummaries(this.analysisItem, this.group, this.facility);
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
