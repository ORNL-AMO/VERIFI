import { Component, inject, Signal, computed, WritableSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ReportType } from 'src/app/models/constantsAndTypes';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AccountReportStatusCheck } from 'src/app/calculations/status-check-calculations/accountReportStatusCheck';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { AccountStatusCheck } from 'src/app/calculations/status-check-calculations/accountStatusCheck';
import { getGUID } from 'src/app/shared/sharedHelperFunctions';
import * as _ from 'lodash';

interface ReportListItem {
  id: number;
  guid: string;
  name: string;
  reportType: ReportType;
  reportYear: number;
  baselineYear: number;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  modifiedDate: Date;
  statusCheck: AccountReportStatusCheck | undefined;
}

@Component({
  selector: 'app-account-reports-dashboard-table',
  standalone: false,
  templateUrl: './account-reports-dashboard-table.component.html',
  styleUrl: './account-reports-dashboard-table.component.css'
})
export class AccountReportsDashboardTableComponent {
  private accountDbService: AccountdbService = inject(AccountdbService);
  private accountReportDbService: AccountReportDbService = inject(AccountReportDbService);
  private router: Router = inject(Router);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private toastNotificationService: ToastNotificationsService = inject(ToastNotificationsService);
  private loadingService: LoadingService = inject(LoadingService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  selectedAccount: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount);
  itemsPerPage: Signal<number> = toSignal(this.sharedDataService.itemsPerPage);
  reports: Signal<Array<IdbAccountReport>> = toSignal(this.accountReportDbService.accountReports);
  accountStatusCheck: Signal<AccountStatusCheck> = toSignal(this.accountStatusCheckService.accountStatusCheck);

  reportTypes: Array<ReportType> = ['betterPlants', 'dataOverview', 'performance', 'betterClimate', 'analysis', 'accountEmissionFactors', 'accountSavings'];

  orderDataField: WritableSignal<'name' | 'reportType' | 'reportYear' | 'modifiedDate'> = signal('name');
  orderByDirection: WritableSignal<'asc' | 'desc'> = signal('desc');
  selectedReportType: WritableSignal<ReportType | ''> = signal('');
  currentPageNumber: number = 1;

  allChecked: WritableSignal<boolean> = signal(false);
  checkedGuids: WritableSignal<Set<string>> = signal(new Set<string>());
  showBulkDelete: WritableSignal<boolean> = signal(false);
  displayDeleteModal: WritableSignal<boolean> = signal(false);
  deletedReport: WritableSignal<IdbAccountReport | undefined> = signal(undefined);

  filteredReports: Signal<Array<ReportListItem>> = computed(() => {
    const reports = this.reports();
    const selectedReportType = this.selectedReportType();
    const orderByDirection = this.orderByDirection();
    const orderDataField = this.orderDataField();
    const accountStatusCheck = this.accountStatusCheck();

    let filtered: Array<ReportListItem> = reports.map(report => ({
      id: report.id,
      guid: report.guid,
      name: report.name,
      reportType: report.reportType,
      reportYear: this.getReportYear(report),
      baselineYear: report.baselineYear,
      startYear: report.startYear,
      startMonth: report.startMonth,
      endYear: report.endYear,
      endMonth: report.endMonth,
      modifiedDate: report.modifiedDate,
      statusCheck: accountStatusCheck?.accountReportStatusChecks?.find(sc => sc.guid === report.guid)
    }));

    if (selectedReportType !== '') {
      filtered = filtered.filter(report => report.reportType === selectedReportType);
    }

    return _.orderBy(filtered, [orderDataField], [orderByDirection]);
  });

  hasCheckedItems: Signal<boolean> = computed(() => this.checkedGuids().size > 0);

  checkedItems: Signal<Array<ReportListItem>> = computed(() =>
    this.filteredReports().filter(item => this.checkedGuids().has(item.guid))
  );

  selectReport(report: ReportListItem) {
    const raw = this.reports().find(r => r.guid === report.guid);
    if (raw) {
      this.accountReportDbService.selectedReport.next(raw);
      this.router.navigateByUrl('/data-evaluation/account/reports/setup');
    }
  }

  async createCopy(report: ReportListItem) {
    const raw = this.reports().find(r => r.guid === report.guid);
    if (!raw) return;
    let newReport: IdbAccountReport = JSON.parse(JSON.stringify(raw));
    delete newReport.id;
    newReport.name = newReport.name + ' (Copy)';
    newReport.guid = getGUID();
    let addedReport: IdbAccountReport = await firstValueFrom(this.accountReportDbService.addWithObservable(newReport));
    await this.dbChangesService.setAccountReports(this.selectedAccount());
    this.accountReportDbService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('Report Copy Created', undefined, undefined, false, 'alert-success');
    this.router.navigateByUrl('/data-evaluation/account/reports/setup');
  }

  deleteItem(report: ReportListItem) {
    const raw = this.reports().find(r => r.guid === report.guid);
    if (raw) {
      this.deletedReport.set(raw);
      this.displayDeleteModal.set(true);
    }
  }

  cancelDelete() {
    this.displayDeleteModal.set(false);
    this.deletedReport.set(undefined);
  }

  async confirmDelete() {
    const report = this.deletedReport();
    if (!report) return;
    await firstValueFrom(this.accountReportDbService.deleteWithObservable(report.id));
    await this.dbChangesService.setAccountReports(this.selectedAccount());
    this.displayDeleteModal.set(false);
    this.deletedReport.set(undefined);
    this.toastNotificationService.showToast('Report Deleted', undefined, undefined, false, 'alert-success');
  }

  setOrderDataField(field: 'name' | 'reportType' | 'reportYear' | 'modifiedDate') {
    if (field === this.orderDataField()) {
      this.orderByDirection.set(this.orderByDirection() === 'desc' ? 'asc' : 'desc');
    } else {
      this.orderDataField.set(field);
      this.orderByDirection.set('asc');
    }
  }

  checkAll() {
    if (this.allChecked()) {
      this.checkedGuids.set(new Set(this.filteredReports().map(r => r.guid)));
    } else {
      this.checkedGuids.set(new Set());
    }
  }

  toggleCheck(guid: string, checked: boolean) {
    const newSet = new Set(this.checkedGuids());
    if (checked) {
      newSet.add(guid);
    } else {
      newSet.delete(guid);
    }
    this.checkedGuids.set(newSet);
    this.allChecked.set(
      this.filteredReports().length > 0 &&
      this.filteredReports().every(r => newSet.has(r.guid))
    );
  }

  openBulkDeleteModal() {
    this.sharedDataService.modalOpen.next(true);
    this.showBulkDelete.set(true);
  }

  cancelBulkDelete() {
    this.sharedDataService.modalOpen.next(false);
    this.showBulkDelete.set(false);
  }

  async bulkDelete() {
    this.cancelBulkDelete();
    const itemsToDelete = this.checkedItems();
    this.loadingService.setLoadingMessage('Deleting Reports...');
    this.loadingService.setLoadingStatus(true);
    for (const item of itemsToDelete) {
      await firstValueFrom(this.accountReportDbService.deleteWithObservable(item.id));
    }
    await this.dbChangesService.setAccountReports(this.selectedAccount());
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Report Items Deleted!', undefined, undefined, false, 'alert-success');
    this.selectedReportType.set('');
    this.allChecked.set(false);
    this.checkedGuids.set(new Set());
  }

  getReportYear(report: IdbAccountReport): number {
    switch (report.reportType) {
      case 'accountEmissionFactors':
        return report.endYear ?? report.startYear;
      case 'dataOverview':
        return report.endYear ?? report.startYear;
      case 'accountSavings':
        return report.endYear;
      default:
        return report.reportYear;
    }
  }
}
