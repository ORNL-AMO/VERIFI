import { Component, Input, OnInit } from '@angular/core';
import { AccountFacilitiesSummary } from 'src/app/models/dashboard';
import { IdbAccount } from 'src/app/models/idb';
import { ReportUtilitySummary } from 'src/app/models/overview-report';

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
  @Input()
  accountReportUtilitySummary: ReportUtilitySummary;

  constructor() { }

  ngOnInit(): void {
  }

}
