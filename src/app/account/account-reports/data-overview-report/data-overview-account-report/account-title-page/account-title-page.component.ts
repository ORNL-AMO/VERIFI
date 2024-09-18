import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
  selector: 'app-account-title-page',
  templateUrl: './account-title-page.component.html',
  styleUrls: ['./account-title-page.component.css']
})
export class AccountTitlePageComponent {
  account: IdbAccount;
  
  dateRange: {startDate: Date, endDate: Date};
  currentDate: Date = new Date();
  constructor(private accountDbService: AccountdbService,
    private accountReportDbService: AccountReportDbService) {

  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();

    let report: IdbAccountReport = this.accountReportDbService.selectedReport.getValue();
    this.dateRange = {
      startDate: new Date(report.startYear, report.startMonth, 1),
      endDate: new Date(report.endYear, report.endMonth, 1)
    };
  }
}
