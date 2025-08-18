import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ReportType } from 'src/app/models/constantsAndTypes';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { AccountReportsService } from '../../account-reports.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-account-reports-dashboard-table',
  standalone: false,

  templateUrl: './account-reports-dashboard-table.component.html',
  styleUrl: './account-reports-dashboard-table.component.css'
})
export class AccountReportsDashboardTableComponent {

  reports: Array<IdbAccountReport> = [];
  selectedAccount: IdbAccount;
  reportTypes: Array<ReportType> = ['betterPlants', 'dataOverview', 'performance', 'betterClimate', 'analysis', 'accountEmissionFactors', 'accountSavings'];
  reportText: string;
  selectedReportType = '';
  displayDeleteModal: boolean;
  deletedReport: IdbAccountReport;
  reportList: Array<{ isValid: boolean, report: IdbAccountReport }> = [];
  orderDataField: string = 'report.reportName';
  orderByDirection: 'asc' | 'desc' = 'desc';

  currentPageNumber: number = 1;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;

  constructor(private accountDbService: AccountdbService,
    private accountReportDbService: AccountReportDbService,
    private router: Router,
    private dbChangesService: DbChangesService,
    private accountReportsService: AccountReportsService,
    private sharedDataService: SharedDataService,
    private toastNotificationService: ToastNotificationsService,
  ) { }

  ngOnInit() {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.getReports();
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.itemsPerPageSub.unsubscribe();
  }

  async getReports() {
    this.reportList = [];
    this.reports = await this.accountReportDbService.getAllAccountReports(this.selectedAccount.guid);
    this.reports.forEach(report => {
      const isValid = this.accountReportsService.isReportValid(report);
      this.reportList.push({ isValid, report });
    });
  }

  selectReport(report: IdbAccountReport) {
    this.accountReportDbService.selectedReport.next(report);
    this.router.navigateByUrl('/data-evaluation/account/reports/setup');
  }

  async createCopy(report: IdbAccountReport) {
    let newReport: IdbAccountReport = JSON.parse(JSON.stringify(report));
    delete newReport.id;
    newReport.name = newReport.name + ' (Copy)';
    newReport.guid = Math.random().toString(36).substr(2, 9);
    let addedReport: IdbAccountReport = await firstValueFrom(this.accountReportDbService.addWithObservable(newReport));
    await this.dbChangesService.setAccountReports(this.selectedAccount);
    this.accountReportDbService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('Report Copy Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('/data-evaluation/account/reports/setup');

  }

  deleteReport(report: IdbAccountReport) {
    this.displayDeleteModal = true;
    this.deletedReport = report;
  }

  cancelDelete() {
    this.displayDeleteModal = false;
  }

  async confirmDelete() {
    await firstValueFrom(this.accountReportDbService.deleteWithObservable(this.deletedReport.id));
    await this.dbChangesService.setAccountReports(this.selectedAccount);
    this.displayDeleteModal = false;
    this.toastNotificationService.showToast('Report Deleted', undefined, undefined, false, "alert-success");
    this.getReports();
  }

  setOrderDataField(str: string) {
    if (str == this.orderDataField) {
      if (this.orderByDirection == 'desc') {
        this.orderByDirection = 'asc';
      } else {
        this.orderByDirection = 'desc';
      }
    } else {
      this.orderDataField = str;
    }
  }

  getDate(month: number, year: number): Date {
    return new Date(year, month, 1);
  }

  get yearSortField(): string {
    return 'report.reportYearOrEndYear';
  }
}
