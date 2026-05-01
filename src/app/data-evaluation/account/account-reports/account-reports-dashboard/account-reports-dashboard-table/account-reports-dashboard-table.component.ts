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
import { LoadingService } from 'src/app/core-components/loading/loading.service';

@Component({
  selector: 'app-account-reports-dashboard-table',
  standalone: false,

  templateUrl: './account-reports-dashboard-table.component.html',
  styleUrl: './account-reports-dashboard-table.component.css'
})
export class AccountReportsDashboardTableComponent {

  selectedAccount: IdbAccount;
  reportTypes: Array<ReportType> = ['betterPlants', 'dataOverview', 'performance', 'betterClimate', 'analysis', 'accountEmissionFactors', 'accountSavings'];
  selectedReportType = '';
  displayDeleteModal: boolean;
  deletedReport: IdbAccountReport;

  reportSub: Subscription;
  reports: Array<IdbAccountReport> = [];

  orderDataField: string = 'name';
  orderByDirection: 'asc' | 'desc' = 'desc';

  currentPageNumber: number = 1;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;

  allChecked: boolean = false;
  showBulkDelete: boolean = false;

  constructor(private accountDbService: AccountdbService,
    private accountReportDbService: AccountReportDbService,
    private router: Router,
    private dbChangesService: DbChangesService,
    private sharedDataService: SharedDataService,
    private toastNotificationService: ToastNotificationsService,
    private loadingService: LoadingService
  ) { }

  ngOnInit() {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
    this.reportSub = this.accountReportDbService.accountReports.subscribe(reports => {
      this.reports = reports;
    });
  }

  ngOnDestroy() {
    this.itemsPerPageSub.unsubscribe();
    this.reportSub.unsubscribe();
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

  openBulkDeleteModal() {
    this.showBulkDelete = true;
  }

  get anyChecked(): boolean {
    return this.reports.some(report => report.checked);
  }

  toggleChecked() {
    const filteredReports = this.getFilteredReports();
    this.allChecked = filteredReports.length > 0 && filteredReports.every(report => report.checked);
  }

  getFilteredReports(): Array<IdbAccountReport> {
    if (!this.selectedReportType || this.selectedReportType == '') {
      return this.reports;
    }
    return this.reports.filter(report => report.reportType == this.selectedReportType);
  }

  checkAll() {
    const filteredReports = this.getFilteredReports();
    filteredReports.forEach(report => {
      report.checked = this.allChecked;
    });
  }

  cancelBulkDelete() {
    this.showBulkDelete = false;
  }

  async bulkDelete() {
    this.cancelBulkDelete();
    const filteredReports = this.getFilteredReports();
    this.loadingService.setLoadingMessage("Deleting Reports...");
    this.loadingService.setLoadingStatus(true);
    let reportsToDelete: Array<IdbAccountReport> = new Array();
    filteredReports.forEach(report => {
      if (report.checked) {
        reportsToDelete.push(report);
      }
    });
    for (let index = 0; index < reportsToDelete.length; index++) {
      await firstValueFrom(this.accountReportDbService.deleteWithObservable(reportsToDelete[index].id));
    }
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountReports(selectedAccount);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast("Report Items Deleted!", undefined, undefined, false, "alert-success");
    this.selectedReportType = '';
    this.allChecked = false;
  }

  get selectedItemsForBulkDelete() {
    return this.getFilteredReports().filter(report => report.checked);
  }
}
