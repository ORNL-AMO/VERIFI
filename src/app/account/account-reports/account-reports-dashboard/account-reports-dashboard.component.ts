import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
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

  selectedAccount: IdbAccount;
  newReportType: ReportType = 'betterPlants';
  displayNewReport: boolean;
  constructor(private router: Router,
    private accountDbService: AccountdbService,
    private accountReportDbService: AccountReportDbService,
    private dbChangesService: DbChangesService,
    private toastNotificationService: ToastNotificationsService) { }

  ngOnInit(): void {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
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

  openCreateReport() {
    if (this.router.url.includes('performance')) {
      this.newReportType = 'performance';
    } else if (this.router.url.includes('better-plants')) {
      this.newReportType = 'betterPlants';
    } else if (this.router.url.includes('overview')) {
      this.newReportType = 'dataOverview';
    } else if(this.router.url.includes('carbon')){
      this.newReportType = 'carbon';
    }
    this.displayNewReport = true;
  }

  cancelCreate() {
    this.displayNewReport = false;
  }
}
