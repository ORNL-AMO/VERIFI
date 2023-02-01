import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import { DataOverviewReportSetup } from 'src/app/models/overview-report';

@Component({
  selector: 'app-data-overview-report',
  templateUrl: './data-overview-report.component.html',
  styleUrls: ['./data-overview-report.component.css']
})
export class DataOverviewReportComponent {

  overviewReport: DataOverviewReportSetup;
  print: boolean = false;
  account: IdbAccount;
  constructor(private accountReportDbService: AccountReportDbService,
    private accountDbService: AccountdbService) {

  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    let selectedReport: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.overviewReport = selectedReport.dataOverviewReportSetup;
  }
}
