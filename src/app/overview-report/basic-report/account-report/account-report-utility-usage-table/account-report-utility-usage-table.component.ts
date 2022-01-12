import { Component, Input, OnInit } from '@angular/core';
import { IdbAccount } from 'src/app/models/idb';
import { ReportUtilitySummary } from 'src/app/models/overview-report';

@Component({
  selector: 'app-account-report-utility-usage-table',
  templateUrl: './account-report-utility-usage-table.component.html',
  styleUrls: ['./account-report-utility-usage-table.component.css']
})
export class AccountReportUtilityUsageTableComponent implements OnInit {
  @Input()
  account: IdbAccount;
  @Input()
  accountReportUtilitySummary: ReportUtilitySummary;

  constructor() { }

  ngOnInit(): void {
  }

}
