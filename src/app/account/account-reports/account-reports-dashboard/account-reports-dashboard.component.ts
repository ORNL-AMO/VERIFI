import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { IdbAccount, IdbAccountReport } from 'src/app/models/idb';
import * as _ from 'lodash';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { ReportType } from 'src/app/models/constantsAndTypes';

@Component({
  selector: 'app-account-reports-dashboard',
  templateUrl: './account-reports-dashboard.component.html',
  styleUrls: ['./account-reports-dashboard.component.css']
})
export class AccountReportsDashboardComponent {

  reportItemsList: Array<{
    year: number,
    reports: Array<IdbAccountReport>
  }> = [];
  selectedAccount: IdbAccount;
  accountReportsSub: Subscription;
  hasEnergy: boolean;
  hasWater: boolean;
  newReportType: ReportType = 'betterPlants';
  displayNewReport: boolean;
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
    newReport.reportType = this.newReportType;
    let addedReport: IdbAccountReport = await firstValueFrom(this.accountReportDbService.addWithObservable(newReport));
    await this.dbChangesService.setAccountReports(this.selectedAccount);
    this.accountReportDbService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('Report Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('account/reports/setup');

  }

  setListItems(accountReports: Array<IdbAccountReport>) {
    this.reportItemsList = new Array();
    let years: Array<number> = accountReports.map(item => {
      if (item.reportType == 'betterPlants' || item.reportType == 'performance') {
        return item.reportYear
      } else if (item.reportType == 'dataOverview') {
        return item.endYear
      }
    });
    years = _.uniq(years);
    years = _.orderBy(years, (year) => { return year }, 'desc');
    years.forEach(year => {
      let yearReports: Array<IdbAccountReport> = accountReports.filter(item => {
        if (item.reportType == 'betterPlants' || item.reportType == 'performance') {
          return item.reportYear == year;
        } else if (item.reportType == 'dataOverview') {
          return item.endYear == year;
        }
      });
      this.reportItemsList.push({
        year: year,
        reports: yearReports,
      });
    });
  }

  openCreateReport() {
    if (this.router.url.includes('performance')) {
      this.newReportType = 'performance';
    } else if (this.router.url.includes('better-plants')) {
      this.newReportType = 'betterPlants';
    } else if (this.router.url.includes('overview')) {
      this.newReportType = 'dataOverview';
    }
    this.displayNewReport = true;
  }

  cancelCreate() {
    this.displayNewReport = false;
  }
}
