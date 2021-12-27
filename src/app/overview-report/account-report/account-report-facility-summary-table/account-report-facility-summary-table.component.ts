import { Component, Input, OnInit } from '@angular/core';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbAccount } from 'src/app/models/idb';

@Component({
  selector: 'app-account-report-facility-summary-table',
  templateUrl: './account-report-facility-summary-table.component.html',
  styleUrls: ['./account-report-facility-summary-table.component.css']
})
export class AccountReportFacilitySummaryTableComponent implements OnInit {
  @Input()
  accountFacilitiesSummary: AccountFacilitiesSummary;
  @Input()
  account: IdbAccount;

  lastMonthsDate: Date;
  yearPriorDate: Date;
  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(){
    if (this.accountFacilitiesSummary.allMetersLastBill) {
      this.lastMonthsDate = new Date(this.accountFacilitiesSummary.allMetersLastBill.year, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
      this.yearPriorDate = new Date(this.accountFacilitiesSummary.allMetersLastBill.year - 1, this.accountFacilitiesSummary.allMetersLastBill.monthNumValue);
    }
  }
}
