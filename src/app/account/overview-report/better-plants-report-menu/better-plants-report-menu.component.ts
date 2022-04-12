import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbOverviewReportOptions, IdbUtilityMeterData } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
import { OverviewReportService } from '../overview-report.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-better-plants-report-menu',
  templateUrl: './better-plants-report-menu.component.html',
  styleUrls: ['./better-plants-report-menu.component.css']
})
export class BetterPlantsReportMenuComponent implements OnInit {

  reportOptions: ReportOptions;
  selectedReportOptions: IdbOverviewReportOptions;
  name: string = 'New Report';
  displayCreateTemplate: boolean = false;
  displayEditTemplates: boolean = false;

  baselineYears: Array<number>;
  targetYears: Array<number>;

  constructor(private overviewReportService: OverviewReportService, private router: Router,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private accountDbService: AccountdbService,
    private toastNotificationsService: ToastNotificationsService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.selectedReportOptions = this.overviewReportOptionsDbService.selectedOverviewReportOptions.getValue();
    if (this.selectedReportOptions) {
      this.name = this.selectedReportOptions.name;
    }
    let reportOptions: ReportOptions = this.overviewReportService.reportOptions.getValue();
    if (!reportOptions) {
      if (this.selectedReportOptions) {
        this.reportOptions = JSON.parse(JSON.stringify(this.selectedReportOptions.reportOptions));
      } else {
        this.goToDashboard()
      }
    } else {
      this.reportOptions = JSON.parse(JSON.stringify(reportOptions));
    }
    this.setYearOptions();
  }


  save() {
    this.overviewReportService.reportOptions.next(this.reportOptions);
  }

  async createReport() {
    let newIdbReportOptionsItem: IdbOverviewReportOptions = this.getNewIdbReportOptionsItem('report');
    let createdReport: IdbOverviewReportOptions = await this.overviewReportOptionsDbService.addWithObservable(newIdbReportOptionsItem).toPromise();
    this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(createdReport);
    this.overviewReportService.reportOptions.next(this.reportOptions);
    this.overviewReportOptionsDbService.setAccountOverviewReportOptions();
    this.toastNotificationsService.showToast('New Report Created', undefined, 4000, false, "success");
    this.router.navigateByUrl('/account/reports/basic-report');
  }

  goToDashboard() {
    this.router.navigateByUrl('/account/reports/dashboard');
  }

  updateReport() {
    this.selectedReportOptions.reportOptions = this.reportOptions;
    this.selectedReportOptions.name = this.name;
    this.overviewReportOptionsDbService.update(this.selectedReportOptions);
    this.overviewReportService.reportOptions.next(this.reportOptions);
    this.toastNotificationsService.showToast('Report Updated', undefined, 4000, false, "success");
    this.router.navigateByUrl('/account/reports/basic-report');
  }

  cancelChanges() {
    this.router.navigateByUrl('/account/reports/basic-report');
  }

  getNewIdbReportOptionsItem(type: 'report' | 'template'): IdbOverviewReportOptions {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let newIdbReportOptionsItem: IdbOverviewReportOptions = {
      date: new Date(),
      reportOptions: this.reportOptions,
      accountId: selectedAccount.id,
      type: type,
      name: this.name
    }
    return newIdbReportOptionsItem;
  }

  

  setYearOptions() {
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(accountMeterData, (data) => { return new Date(data.readDate) });
    let firstBill: IdbUtilityMeterData = orderedMeterData[0];
    let lastBill: IdbUtilityMeterData = orderedMeterData[orderedMeterData.length - 1];
    let yearStart: number = new Date(firstBill.readDate).getUTCFullYear();
    let yearEnd: number = new Date(lastBill.readDate).getUTCFullYear();
    this.targetYears = new Array();
    this.baselineYears = new Array();
    for (let i = yearStart; i <= yearEnd; i++) {
      this.targetYears.push(i);
      this.baselineYears.push(i);
    }
  }

}
