import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityUsageSummaryData } from 'src/app/models/dashboard';
import { IdbUtilityMeterData } from 'src/app/models/idb';
import { FacilityOverviewService } from '../../facility-overview.service';

@Component({
  selector: 'app-emissions-utilities-table',
  templateUrl: './emissions-utilities-table.component.html',
  styleUrls: ['./emissions-utilities-table.component.css']
})
export class EmissionsUtilitiesTableComponent implements OnInit {

  utilityUsageSummaryDataSub: Subscription;
  accountMeterData: Array<IdbUtilityMeterData>;

  utilityUsageSummaryData: UtilityUsageSummaryData;
  lastMonthsDate: Date;
  yearPriorDate: Date;
  yearPriorLastMonth: Date;
  emissionsDisplay: 'market' | 'location';
  emissionsDisplaySub: Subscription;
  constructor(private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.emissionsDisplaySub = this.facilityOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    });
    this.utilityUsageSummaryDataSub = this.facilityOverviewService.energyUtilityUsageSummaryData.subscribe(val => {
      this.utilityUsageSummaryData = val;
      if (this.utilityUsageSummaryData.total && this.utilityUsageSummaryData.allMetersLastBill) {
        this.lastMonthsDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue + 1);
        this.yearPriorLastMonth = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
      }
    });
  }

  ngOnDestroy() {
    this.utilityUsageSummaryDataSub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
  }

}
