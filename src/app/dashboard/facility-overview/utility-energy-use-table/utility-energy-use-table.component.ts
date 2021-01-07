import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import { DashboardService, UtilityUsageSummaryData } from '../../dashboard.service';

@Component({
  selector: 'app-utility-energy-use-table',
  templateUrl: './utility-energy-use-table.component.html',
  styleUrls: ['./utility-energy-use-table.component.css']
})
export class UtilityEnergyUseTableComponent implements OnInit {
  
  accountMeterDataSub: Subscription;
  accountMeterData: Array<IdbUtilityMeterData>;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  utilityUsageSummaryData: UtilityUsageSummaryData;
  lastMonthsDate: Date;
  constructor(private dashboardService: DashboardService, private utilityMeterDataDbService: UtilityMeterDatadbService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    let lastMonthYear: { lastMonth: number, lastMonthYear: number } = this.dashboardService.getLastMonthYear();
    this.lastMonthsDate = new Date(lastMonthYear.lastMonthYear, lastMonthYear.lastMonth);
  
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      this.setUsageValues();
    })

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(accountMeterData => {
      this.accountMeterData = accountMeterData;
      this.setUsageValues();
    });
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }


  setUsageValues() {
    if (this.accountMeterData && this.accountMeterData.length != 0 && this.selectedFacility) {
      this.utilityUsageSummaryData = this.dashboardService.getFacilityUtilityUsageSummaryData(this.selectedFacility);
    }
  }
}
