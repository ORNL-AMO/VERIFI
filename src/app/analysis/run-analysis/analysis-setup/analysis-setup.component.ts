import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Month, Months } from 'src/app/form-data/months';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAnalysisItem, IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import { EnergyUnitOptions, UnitOption } from 'src/app/shared/unitOptions';
import * as _ from 'lodash';
@Component({
  selector: 'app-analysis-setup',
  templateUrl: './analysis-setup.component.html',
  styleUrls: ['./analysis-setup.component.css']
})
export class AnalysisSetupComponent implements OnInit {

  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  months: Array<Month> = Months;

  facility: IdbFacility;
  energyUnit: string;
  analysisItem: IdbAnalysisItem;
  yearOptions: Array<number>;
  constructor(private facilityDbService: FacilitydbService, private analysisDbService: AnalysisDbService, private router: Router,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.analysisItem = this.analysisDbService.selectedAnalysisItem.getValue();
    if (!this.analysisItem ) {
      this.router.navigateByUrl('/analysis/analysis-dashboard')
    }

    this.facility = this.facilityDbService.selectedFacility.getValue();
    this.energyUnit = this.facility.energyUnit;
    this.setYearOptions();
  }

  saveItem() {
    this.analysisDbService.update(this.analysisItem);
    this.analysisDbService.selectedAnalysisItem.next(this.analysisItem);
  }


  setYearOptions() {
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(accountMeterData, (data) => { return new Date(data.readDate) });
    let firstBill: IdbUtilityMeterData = orderedMeterData[0];
    let lastBill: IdbUtilityMeterData = orderedMeterData[orderedMeterData.length - 1];
    let yearStart: number = new Date(firstBill.readDate).getUTCFullYear();
    let yearEnd: number = new Date(lastBill.readDate).getUTCFullYear();
    this.yearOptions = new Array();
    for (let i = yearStart; i <= yearEnd; i++) {
      this.yearOptions.push(i);
    }
  }
}
