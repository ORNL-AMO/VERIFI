import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbOverviewReportOptions } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
import { OverviewReportService } from '../overview-report.service';
import * as _ from 'lodash';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';

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

  accountAnalysisItems: Array<IdbAccountAnalysisItem>;
  account: IdbAccount;
  constructor(private overviewReportService: OverviewReportService, private router: Router,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private accountDbService: AccountdbService,
    private toastNotificationsService: ToastNotificationsService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private dbChangesService: DbChangesService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.account = this.accountDbService.selectedAccount.getValue();
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
    this.setAnalysisOptions();
  }


  save() {
    this.overviewReportService.reportOptions.next(this.reportOptions);
  }

  async createReport() {
    let newIdbReportOptionsItem: IdbOverviewReportOptions = this.getNewIdbReportOptionsItem('report');
    let createdReport: IdbOverviewReportOptions = await this.overviewReportOptionsDbService.addWithObservable(newIdbReportOptionsItem).toPromise();
    this.overviewReportOptionsDbService.selectedOverviewReportOptions.next(createdReport);
    this.overviewReportService.reportOptions.next(this.reportOptions);
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountOverviewReportOptions(selectedAccount);
    this.toastNotificationsService.showToast('New Report Created', undefined, 4000, false, "bg-success");
    this.router.navigateByUrl('/account/reports/better-plants-report');
  }

  goToDashboard() {
    this.router.navigateByUrl('/account/reports/dashboard');
  }

  async updateReport() {
    this.selectedReportOptions.reportOptions = this.reportOptions;
    this.selectedReportOptions.name = this.name;
    await this.overviewReportOptionsDbService.updateWithObservable(this.selectedReportOptions).toPromise();;
    this.overviewReportService.reportOptions.next(this.reportOptions);
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountOverviewReportOptions(selectedAccount);
    this.toastNotificationsService.showToast('Report Updated', undefined, 4000, false, "bg-success");
    this.router.navigateByUrl('/account/reports/better-plants-report');
  }

  cancelChanges() {
    this.router.navigateByUrl('/account/reports/better-plants-report');
  }

  getNewIdbReportOptionsItem(type: 'report' | 'template'): IdbOverviewReportOptions {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let newIdbReportOptionsItem: IdbOverviewReportOptions = {
      date: new Date(),
      guid: Math.random().toString(36).substr(2, 9),
      reportOptions: this.reportOptions,
      accountId: selectedAccount.guid,
      type: type,
      name: this.name
    }
    return newIdbReportOptionsItem;
  }



  setYearOptions() {
    this.targetYears = this.utilityMeterDataDbService.getYearOptions(true);
    this.baselineYears = this.utilityMeterDataDbService.getYearOptions(true);
  }

  setAnalysisOptions() {
    let analysisOptions: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    this.accountAnalysisItems = analysisOptions.filter(option => { return option.reportYear == this.reportOptions.targetYear && option.energyIsSource });
    let selectedAnalysisItem: IdbAccountAnalysisItem = this.accountAnalysisItems.find(item => { return item.guid == this.reportOptions.analysisItemId });
    if (!selectedAnalysisItem) {
      this.reportOptions.analysisItemId = undefined;
    }
  }

}
