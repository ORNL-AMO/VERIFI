import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityUsageSummaryData } from 'src/app/models/dashboard';
import { IdbUtilityMeterData } from 'src/app/models/idb';
import { FacilityOverviewService } from '../../facility-overview.service';


@Component({
  selector: 'app-cost-utilities-usage-table',
  templateUrl: './cost-utilities-usage-table.component.html',
  styleUrls: ['./cost-utilities-usage-table.component.css']
})
export class CostUtilitiesUsageTableComponent implements OnInit {

  utilityUsageSummaryDataSub: Subscription;
  accountMeterData: Array<IdbUtilityMeterData>;

  utilityUsageSummaryData: UtilityUsageSummaryData;
  lastMonthsDate: Date;
  yearPriorDate: Date;
  yearPriorLastMonth: Date;
  constructor(private facilityOverviewService: FacilityOverviewService) { }

  ngOnInit(): void {
    this.utilityUsageSummaryDataSub = this.facilityOverviewService.costsUtilityUsageSummaryData.subscribe(val => {
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
  }
}
