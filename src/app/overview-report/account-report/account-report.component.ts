import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';
import { OverviewReportService, ReportOptions } from '../overview-report.service';

@Component({
  selector: 'app-account-report',
  templateUrl: './account-report.component.html',
  styleUrls: ['./account-report.component.css']
})
export class AccountReportComponent implements OnInit {

  account: IdbAccount;
  accountSub: Subscription;
  reportOptions: ReportOptions;
  reportOptionsSub: Subscription;
  constructor(private accountDbService: AccountdbService, private overviewReportService: OverviewReportService) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.account = account
    });

    this.reportOptionsSub = this.overviewReportService.reportOptions.subscribe(reportOptions => {
      this.reportOptions = reportOptions;
    });
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.reportOptionsSub.unsubscribe();
  }

}
