import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import { getNAICS } from 'src/app/shared/form-data/naics-data';

@Component({
  selector: 'app-account-title-page',
  templateUrl: './account-title-page.component.html',
  styleUrls: ['./account-title-page.component.css']
})
export class AccountTitlePageComponent {
  account: IdbAccount;
  
  naics: string;
  dateRange: {startDate: Date, endDate: Date};
  currentDate: Date = new Date();
  constructor(private accountDbService: AccountdbService,
    private accountReportDbService: AccountReportDbService) {

  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.naics = getNAICS(this.account);

    let report: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.dateRange = {
      startDate: new Date(report.startYear, report.startMonth, 1),
      endDate: new Date(report.endYear, report.endMonth, 1)
    };
  }
}
