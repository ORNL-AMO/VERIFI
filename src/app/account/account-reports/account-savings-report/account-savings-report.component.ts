import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountSavingsReportSetup } from 'src/app/models/overview-report';
import { AccountReportsService } from '../account-reports.service';

@Component({
  selector: 'app-account-savings-report',
  standalone: false,

  templateUrl: './account-savings-report.component.html',
  styleUrl: './account-savings-report.component.css'
})
export class AccountSavingsReportComponent {
  selectedReport: IdbAccountReport;
  // printSub: Subscription;
  // print: boolean;
  account: IdbAccount;
  selectedAnalysisItem: IdbAccountAnalysisItem;
  accountSavingsReportSetup: AccountSavingsReportSetup;
  accountAnalysisItems: Array<IdbAccountAnalysisItem>;

  constructor(private accountReportDbService: AccountReportDbService,
    private accountReportsService: AccountReportsService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private router: Router,
    private accountDbService: AccountdbService
  ) { }

  ngOnInit(): void {
    // this.printSub = this.accountReportsService.print.subscribe(print => {
    //   this.print = print;
    // });
    this.selectedReport = this.accountReportDbService.selectedReport.getValue();
    if (!this.selectedReport) {
      this.router.navigateByUrl('/account/reports/dashboard');
    } else {
      this.accountSavingsReportSetup = this.selectedReport.accountSavingsReportSetup;
    }
    this.account = this.accountDbService.selectedAccount.getValue();
    this.accountAnalysisItems = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.selectedAnalysisItem = this.accountAnalysisItems.find(item => { return item.guid == this.selectedReport.accountSavingsReportSetup.analysisItemId });
  }

  // ngOnDestroy() {
  //   this.printSub.unsubscribe();
  // }
}

