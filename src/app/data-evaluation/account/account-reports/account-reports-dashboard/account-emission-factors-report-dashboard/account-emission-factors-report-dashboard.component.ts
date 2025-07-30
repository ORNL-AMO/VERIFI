import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import _ from 'lodash';

@Component({
  selector: 'app-account-emission-factors-report-dashboard',
  standalone: false,

  templateUrl: './account-emission-factors-report-dashboard.component.html',
  styleUrl: './account-emission-factors-report-dashboard.component.css'
})
export class AccountEmissionFactorsReportDashboardComponent {

  reportList: Array<IdbAccountReport> = [];
  selectedAccount: IdbAccount;
  accountReportsSub: Subscription;

  constructor(private accountDbService: AccountdbService,
    private accountReportDbService: AccountReportDbService
  ) {

  }

  ngOnInit() {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.accountReportsSub = this.accountReportDbService.accountReports.subscribe(items => {
      this.setListItems(items);
    });
  }

  ngOnDestroy() {
    this.accountReportsSub.unsubscribe();
  }

  setListItems(accountReports: Array<IdbAccountReport>) {
    this.reportList = new Array();
    let reports: Array<IdbAccountReport> = accountReports.filter(report => {
      return report.reportType == 'accountEmissionFactors';
    });
    this.reportList = reports;
  }
}


