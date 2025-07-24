import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import _ from 'lodash';

@Component({
  selector: 'app-account-savings-report-dashboard',
  standalone: false,

  templateUrl: './account-savings-report-dashboard.component.html',
  styleUrl: './account-savings-report-dashboard.component.css'
})
export class AccountSavingsReportDashboardComponent {
  selectedAccount: IdbAccount;
  accountReportsSub: Subscription;
  reports: Array<IdbAccountReport>;
  constructor(private accountDbService: AccountdbService,
    private accountReportDbService: AccountReportDbService) { }

  ngOnInit(): void {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.accountReportsSub = this.accountReportDbService.accountReports.subscribe(items => {
      this.reports = items.filter(report => {
        return report.reportType == 'accountSavings';
      });
    });
  }

  ngOnDestroy() {
    this.accountReportsSub.unsubscribe();
  }
}

