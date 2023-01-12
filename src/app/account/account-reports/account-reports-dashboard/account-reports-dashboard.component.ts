import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import * as _ from 'lodash';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';

@Component({
  selector: 'app-account-reports-dashboard',
  templateUrl: './account-reports-dashboard.component.html',
  styleUrls: ['./account-reports-dashboard.component.css']
})
export class AccountReportsDashboardComponent {

  reportItemsList: Array<{
    year: number,
    reports: Array<IdbAccountReport>,
  }> = [];
  selectedAccount: IdbAccount;
  accountReportsSub: Subscription;
  constructor(private router: Router,
    private accountDbService: AccountdbService,
    private accountReportDbService: AccountReportDbService,
    private dbChangesService: DbChangesService,
    private toastNotificationService: ToastNotificationsService) { }

  ngOnInit(): void {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.accountReportsSub = this.accountReportDbService.accountReports.subscribe(items => {
      this.setListItems(items);
    });
  }

  ngOnDestroy() {
    this.accountReportsSub.unsubscribe();
  }

  async createNewReport() {
    let newReport: IdbAccountReport = this.accountReportDbService.getNewAccountReport();
    let addedReport: IdbAccountReport = await this.accountReportDbService.addWithObservable(newReport).toPromise();
    await this.dbChangesService.setAccountReports(this.selectedAccount);
    this.accountReportDbService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('Report Created', undefined, undefined, false, "bg-success");
    this.router.navigateByUrl('account/account-reports/setup');

  }

  setListItems(accountReports: Array<IdbAccountReport>) {
    this.reportItemsList = new Array();
    let years: Array<number> = accountReports.map(item => { return item.reportYear });
    years = _.uniq(years);
    years = _.orderBy(years, (year) => { return year }, 'desc');
    years.forEach(year => {
      let yearReports: Array<IdbAccountReport> = accountReports.filter(item => { return item.reportYear == year });
      this.reportItemsList.push({
        year: year,
        reports: yearReports
      });
    });
  }
}
