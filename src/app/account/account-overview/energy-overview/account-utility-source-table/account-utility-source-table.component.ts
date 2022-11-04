import { Component, OnInit } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { Subscription } from 'rxjs';
import { UtilityUsageSummaryData } from 'src/app/models/dashboard';
import { AccountOverviewService } from '../../account-overview.service';

@Component({
  selector: 'app-account-utility-source-table',
  templateUrl: './account-utility-source-table.component.html',
  styleUrls: ['./account-utility-source-table.component.css']
})
export class AccountUtilitySourceTableComponent implements OnInit {
  
  selectedAccountSub: Subscription;
  accountEnergyUnit: string;

  utilityUsageSummaryData: UtilityUsageSummaryData;
  accountUtilityUsageSummaryDataSub: Subscription;
  lastMonthsDate: Date;
  yearPriorLastMonth: Date;
  yearPriorDate: Date;
  constructor(private accountdbService: AccountdbService, private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(val => {
      if (val) {
        this.accountEnergyUnit = val.energyUnit;
      }
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

  ngOnDestroy(){
    this.selectedAccountSub.unsubscribe();
    this.accountUtilityUsageSummaryDataSub.unsubscribe();
  }

}
