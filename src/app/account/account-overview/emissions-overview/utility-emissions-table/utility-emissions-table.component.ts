import { Component, OnInit } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { Subscription } from 'rxjs';
import { UtilityUsageSummaryData } from 'src/app/models/dashboard';
import { AccountOverviewService } from '../../account-overview.service';

@Component({
  selector: 'app-utility-emissions-table',
  templateUrl: './utility-emissions-table.component.html',
  styleUrls: ['./utility-emissions-table.component.css']
})
export class UtilityEmissionsTableComponent implements OnInit {


  utilityUsageSummaryData: UtilityUsageSummaryData;
  accountUtilityUsageSummaryDataSub: Subscription;
  lastMonthsDate: Date;
  yearPriorLastMonth: Date;
  yearPriorDate: Date;
  emissionsDisplay: "market" | "location";
  emissionsDisplaySub: Subscription;
  constructor(private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.emissionsDisplaySub = this.accountOverviewService.emissionsDisplay.subscribe(val => {
      this.emissionsDisplay = val;
    });

    this.accountUtilityUsageSummaryDataSub = this.accountOverviewService.energyUtilityUsageSummaryData.subscribe(val => {
      this.utilityUsageSummaryData = val;
      if (this.utilityUsageSummaryData && this.utilityUsageSummaryData.allMetersLastBill) {
        this.lastMonthsDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
        this.yearPriorLastMonth = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
      } else {
        this.lastMonthsDate = undefined;
        this.yearPriorDate = undefined;
        this.yearPriorLastMonth = undefined;
      }
    });

  }

  ngOnDestroy() {
    this.accountUtilityUsageSummaryDataSub.unsubscribe();
    this.emissionsDisplaySub.unsubscribe();
  }

}
