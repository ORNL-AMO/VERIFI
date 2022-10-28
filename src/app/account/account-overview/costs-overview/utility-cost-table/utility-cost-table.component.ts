import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UtilityUsageSummaryData } from 'src/app/models/dashboard';
import { AccountOverviewService } from '../../account-overview.service';

@Component({
  selector: 'app-utility-cost-table',
  templateUrl: './utility-cost-table.component.html',
  styleUrls: ['./utility-cost-table.component.css']
})
export class UtilityCostTableComponent implements OnInit {

  utilityUsageSummaryData: UtilityUsageSummaryData;
  accountUtilityUsageSummaryDataSub: Subscription;
  lastMonthsDate: Date;
  yearPriorLastMonth: Date;
  yearPriorDate: Date;
  constructor(private accountOverviewService: AccountOverviewService) { }

  ngOnInit(): void {
    this.accountUtilityUsageSummaryDataSub = this.accountOverviewService.costsUtilityUsageSummaryData.subscribe(val => {
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
    this.accountUtilityUsageSummaryDataSub.unsubscribe();
  }

}
