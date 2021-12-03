import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { DashboardService } from '../../dashboard.service';
import * as _ from 'lodash';
import { IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { FacilityMeterSummaryData } from 'src/app/models/dashboard';
@Component({
  selector: 'app-meters-table',
  templateUrl: './meters-table.component.html',
  styleUrls: ['./meters-table.component.css']
})
export class MetersTableComponent implements OnInit {

  facilityMeterSummaryData: FacilityMeterSummaryData;
  facilityMetersSub: Subscription;
  accountMeterDataSub: Subscription;
  selectedFacilitySub: Subscription;

  accountMeterData: Array<IdbUtilityMeterData>;
  lastMonthsDate: Date;
  yearPriorDate: Date;
  facilityEnergyUnit: string;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDbService: UtilityMeterdbService,
    private dashboardService: DashboardService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      if (val) {
        this.facilityEnergyUnit = val.energyUnit;
      }
    })

    this.facilityMetersSub = this.utilityMeterDbService.facilityMeters.subscribe(val => {
      this.getSummary();
    });

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(accountMeterData => {
      this.accountMeterData = accountMeterData;
      this.getSummary();
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.facilityMetersSub.unsubscribe();
    this.accountMeterDataSub.unsubscribe();
  }

  getSummary() {
    if (this.accountMeterData && this.accountMeterData.length != 0) {
      this.facilityMeterSummaryData = this.dashboardService.getFacilityMetersSummary(false);
      console.log(this.facilityMeterSummaryData)
      if (this.facilityMeterSummaryData.allMetersLastBill) {
        this.lastMonthsDate = new Date(this.facilityMeterSummaryData.allMetersLastBill.year, this.facilityMeterSummaryData.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(this.facilityMeterSummaryData.allMetersLastBill.year - 1, this.facilityMeterSummaryData.allMetersLastBill.monthNumValue + 1);
      }
    }
  }

}

