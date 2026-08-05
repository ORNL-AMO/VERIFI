import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
    selector: 'app-account-title-page',
    templateUrl: './account-title-page.component.html',
    styleUrls: ['./account-title-page.component.css'],
    standalone: false
})
export class AccountTitlePageComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  account: IdbAccount;
  report: IdbAccountReport;
  dateRange: {startDate: Date, endDate: Date};
  currentDate: Date = new Date();
  constructor(private accountDbService: AccountdbService,
    private accountReportDbService: AccountReportDbService) {
  }

  ngOnInit() {
    this.account = this.accountWorkspaceStore.account();
    this.report = this.accountWorkspaceStore.selectedAccountReport();
    this.dateRange = {
      startDate: new Date(this.report.startYear, this.report.startMonth, 1),
      endDate: new Date(this.report.endYear, this.report.endMonth, 1)
    };
  }
}
