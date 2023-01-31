import { Component } from '@angular/core';
import { OverviewReportService } from 'src/app/account/overview-report/overview-report.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';

@Component({
  selector: 'app-account-title-page',
  templateUrl: './account-title-page.component.html',
  styleUrls: ['./account-title-page.component.css']
})
export class AccountTitlePageComponent {
  account: IdbAccount;
  
  naics: string;
  constructor(private accountDbService: AccountdbService,
    private overviewReportService: OverviewReportService) {

  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.naics = this.overviewReportService.getNAICS(this.account);
  }
}
