import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { IdbAccount, IdbOverviewReportOptions } from 'src/app/models/idb';
import { ReportOptions, ReportUtilityOptions } from 'src/app/models/overview-report';
import { ToastNotificationsService } from 'src/app/shared/toast-notifications/toast-notifications.service';
import { OverviewReportService } from '../overview-report.service';

@Component({
  selector: 'app-overview-report-menu',
  templateUrl: './overview-report-menu.component.html',
  styleUrls: ['./overview-report-menu.component.css']
})
export class OverviewReportMenuComponent implements OnInit {

  reportOptions: ReportOptions;
  reportUtilityOptions: ReportUtilityOptions;
  selectedReportOptions: IdbOverviewReportOptions;
  constructor(private overviewReportService: OverviewReportService, private router: Router,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private accountDbService: AccountdbService,
    private toastNotificationsService: ToastNotificationsService) { }

  ngOnInit(): void {
    this.selectedReportOptions = this.overviewReportOptionsDbService.selectedOverviewReportOptions.getValue();
    let reportOptions: ReportOptions = this.overviewReportService.reportOptions.getValue();
    if (!reportOptions) {
      this.goToDashboard();
    } else {
      let reportUtilityOptions: ReportUtilityOptions = this.overviewReportService.reportUtilityOptions.getValue();
      this.reportOptions = JSON.parse(JSON.stringify(reportOptions));
      this.reportUtilityOptions = JSON.parse(JSON.stringify(reportUtilityOptions));
    }
  }

  save() {
    this.overviewReportService.reportOptions.next(this.reportOptions);
  }

  saveUtilityOptions() {
    this.overviewReportService.reportUtilityOptions.next(this.reportUtilityOptions);
  }

  async createReport() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let newIdbReportOptionsItem: IdbOverviewReportOptions = {
      date: new Date(),
      reportOptions: this.reportOptions,
      reportUtilityOptions: this.reportUtilityOptions,
      accountId: selectedAccount.id
    }
    let createdReport: IdbOverviewReportOptions = await this.overviewReportOptionsDbService.addWithObservable(newIdbReportOptionsItem).toPromise();
    this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(createdReport);
    this.overviewReportService.reportOptions.next(this.reportOptions);
    this.overviewReportService.reportUtilityOptions.next(this.reportUtilityOptions);
    this.overviewReportOptionsDbService.setAccountOverviewReportOptions();
    this.toastNotificationsService.showToast('New Report Created', undefined, 1000, false, "success");
    this.router.navigateByUrl('/overview-report/basic-report');
  }

  goToDashboard() {
    this.router.navigateByUrl('/overview-report/report-dashboard');
  }

  updateReport() {
    this.selectedReportOptions.reportOptions = this.reportOptions;
    this.selectedReportOptions.reportUtilityOptions = this.reportUtilityOptions;
    this.overviewReportOptionsDbService.update(this.selectedReportOptions);
    this.overviewReportService.reportOptions.next(this.reportOptions);
    this.overviewReportService.reportUtilityOptions.next(this.reportUtilityOptions);
    this.toastNotificationsService.showToast('Report Updated', undefined, 1000, false, "success");
    this.router.navigateByUrl('/overview-report/basic-report');
  }

  cancelChanges() {
    this.router.navigateByUrl('/overview-report/basic-report');
  }
}
