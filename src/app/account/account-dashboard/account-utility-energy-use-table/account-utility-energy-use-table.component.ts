import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from 'src/app/shared/helper-services/dashboard.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityUsageSummaryData } from 'src/app/models/dashboard';

@Component({
  selector: 'app-account-utility-energy-use-table',
  templateUrl: './account-utility-energy-use-table.component.html',
  styleUrls: ['./account-utility-energy-use-table.component.css']
})
export class AccountUtilityEnergyUseTableComponent implements OnInit {

  selectedAccountSub: Subscription;
  accountEnergyUnit: string;

  utilityUsageSummaryData: UtilityUsageSummaryData;
  accountUtilityUsageSummaryDataSub: Subscription;
  lastMonthsDate: Date;
  yearPriorLastMonth: Date;
  yearPriorDate: Date;

  constructor(private dashboardService: DashboardService,
    private accountdbService: AccountdbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(val => {
      if (val) {
        this.accountEnergyUnit = val.energyUnit;
      }
    });


    this.accountUtilityUsageSummaryDataSub = this.dashboardService.accountUtilityUsageSummaryData.subscribe(val => {
      this.utilityUsageSummaryData = val;
      if (this.utilityUsageSummaryData && this.utilityUsageSummaryData.allMetersLastBill) {
        this.lastMonthsDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
        this.yearPriorDate = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue + 1);
        this.yearPriorLastMonth = new Date(this.utilityUsageSummaryData.allMetersLastBill.year - 1, this.utilityUsageSummaryData.allMetersLastBill.monthNumValue);
      }
    })

  }

  ngOnDestroy() {
    this.accountUtilityUsageSummaryDataSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }
}
