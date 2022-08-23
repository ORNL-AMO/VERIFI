import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbOverviewReportOptions, IdbUtilityMeterData } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { OverviewReportService } from '../overview-report.service';
import * as _ from 'lodash';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';

@Component({
  selector: 'app-overview-report-menu',
  templateUrl: './overview-report-menu.component.html',
  styleUrls: ['./overview-report-menu.component.css']
})
export class OverviewReportMenuComponent implements OnInit {

  reportOptions: ReportOptions;
  selectedReportOptions: IdbOverviewReportOptions;
  reportTemplates: Array<IdbOverviewReportOptions>;
  reportTemplatesSub: Subscription;
  name: string = 'New Report';
  templateName: string;
  displayCreateTemplate: boolean = false;
  displayEditTemplates: boolean = false;

  baselineYears: Array<number>;
  targetYears: Array<number>;

  constructor(private overviewReportService: OverviewReportService, private router: Router,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private accountDbService: AccountdbService,
    private toastNotificationsService: ToastNotificationsService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private dbChangesService: DbChangesService) { }

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
    this.reportTemplatesSub = this.overviewReportOptionsDbService.overviewReportOptionsTemplates.subscribe(templates => {
      this.reportTemplates = templates;
      this.checkTemplates();
    });
    this.setYearOptions();
  }

  ngOnDestroy() {
    this.reportTemplatesSub.unsubscribe();
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
    this.toastNotificationsService.showToast('New Report Created', undefined, 4000, false, "success");
    this.router.navigateByUrl('/account/reports/basic-report');
  }

  goToDashboard() {
    this.router.navigateByUrl('/account/reports/dashboard');
  }

  async updateReport() {
    this.selectedReportOptions.reportOptions = this.reportOptions;
    this.selectedReportOptions.name = this.name;
    await this.overviewReportOptionsDbService.updateWithObservable(this.selectedReportOptions).toPromise();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountOverviewReportOptions(selectedAccount);
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
      guid: Math.random().toString(36).substr(2, 9),
      reportOptions: this.reportOptions,
      accountId: selectedAccount.guid,
      type: type,
      name: this.name
    }
    return newIdbReportOptionsItem;
  }

  async saveTemplate() {
    let newIdbReportOptionsItem: IdbOverviewReportOptions = this.getNewIdbReportOptionsItem('template');
    newIdbReportOptionsItem.name = this.templateName;
    let createdTemplate: IdbOverviewReportOptions = await this.overviewReportOptionsDbService.addWithObservable(newIdbReportOptionsItem).toPromise();
    this.reportTemplates.push(createdTemplate);
    this.reportOptions.templateId = createdTemplate.id;
    if (this.selectedReportOptions) {
      await this.overviewReportOptionsDbService.updateWithObservable(this.selectedReportOptions);
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      await this.dbChangesService.setAccountOverviewReportOptions(selectedAccount);
    }
    this.overviewReportService.reportOptions.next(this.reportOptions);
    this.toastNotificationsService.showToast('Template Configuration Saved', undefined, 4000, false, "success");
    this.displayCreateTemplate = false;
  }

  showSaveTemplate() {
    this.templateName = this.name + ' (template)';
    this.displayCreateTemplate = true;
  }

  cancelNewTemplate() {
    this.displayCreateTemplate = false;
  }

  editTemplates() {
    this.displayEditTemplates = true;
  }

  closeEditTemplates() {
    this.displayEditTemplates = false;
  }

  checkTemplates() {
    let testTemplate: IdbOverviewReportOptions = this.reportTemplates.find(template => { return template.id == this.reportOptions.templateId });
    if (!testTemplate && this.reportOptions.templateId != 99999) {
      this.reportOptions.templateId = undefined;
    }
  }

  saveCustom() {
    this.reportOptions.templateId = undefined;
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

  selectTemplate() {
    let template: IdbOverviewReportOptions = this.reportTemplates.find(template => { return template.id == this.reportOptions.templateId });
    if (template) {
      this.reportOptions = template.reportOptions;
      this.reportOptions.templateId = template.id;
    }
  }
}
