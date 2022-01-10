import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { IdbAccount, IdbOverviewReportOptions } from 'src/app/models/idb';
import { ReportOptions } from 'src/app/models/overview-report';
import { ToastNotificationsService } from 'src/app/shared/toast-notifications/toast-notifications.service';
import { OverviewReportService } from '../overview-report.service';

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
  constructor(private overviewReportService: OverviewReportService, private router: Router,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private accountDbService: AccountdbService,
    private toastNotificationsService: ToastNotificationsService) { }

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
    this.overviewReportOptionsDbService.setAccountOverviewReportOptions();
    this.toastNotificationsService.showToast('New Report Created', undefined, 4000, false, "success");
    this.router.navigateByUrl('/overview-report/basic-report');
  }

  goToDashboard() {
    this.router.navigateByUrl('/overview-report/report-dashboard');
  }

  updateReport() {
    this.selectedReportOptions.reportOptions = this.reportOptions;
    this.overviewReportOptionsDbService.update(this.selectedReportOptions);
    this.overviewReportService.reportOptions.next(this.reportOptions);
    this.toastNotificationsService.showToast('Report Updated', undefined, 4000, false, "success");
    this.router.navigateByUrl('/overview-report/basic-report');
  }

  cancelChanges() {
    this.router.navigateByUrl('/overview-report/basic-report');
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

  async saveTemplate() {
    let newIdbReportOptionsItem: IdbOverviewReportOptions = this.getNewIdbReportOptionsItem('template');
    newIdbReportOptionsItem.name = this.templateName;
    let createdTemplate: IdbOverviewReportOptions = await this.overviewReportOptionsDbService.addWithObservable(newIdbReportOptionsItem).toPromise();
    this.reportTemplates.push(createdTemplate);
    this.reportOptions.templateId = createdTemplate.id;
    if (this.selectedReportOptions) {
      this.overviewReportOptionsDbService.update(this.selectedReportOptions);
    }
    this.overviewReportService.reportOptions.next(this.reportOptions);
    this.toastNotificationsService.showToast('Template Configuration Created', undefined, 4000, false, "success");
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
}
