import { Component, inject, Signal, computed, WritableSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbAnalysisItem } from 'src/app/models/idbModels/analysisItem';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FacilityReportType, getNewIdbFacilityReport, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import * as _ from 'lodash';
import { FacilityReportStatusCheck } from 'src/app/calculations/status-check-calculations/facilityReportStatusCheck';
import { AccountStatusCheckService } from 'src/app/shared/helper-services/account-status-check.service';
import { FacilityStatusCheck } from 'src/app/calculations/status-check-calculations/facilityStatusCheck';

interface FacilityReportTableItem {
  id: number;
  guid: string;
  name: string;
  facilityId: string;
  accountId: string;
  analysisItemId: string;
  analysisItemName: string;
  facilityReportType: FacilityReportType;
  modifiedDate: Date;
  reportYear: number | undefined;
  statusCheck: FacilityReportStatusCheck | undefined;
}


@Component({
  selector: 'app-facility-reports-dashboard-table',
  standalone: false,
  templateUrl: './facility-reports-dashboard-table.component.html',
  styleUrl: './facility-reports-dashboard-table.component.css'
})
export class FacilityReportsDashboardTableComponent {
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private facilityDbReportsService: FacilityReportsDbService = inject(FacilityReportsDbService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private toastNotificationService: ToastNotificationsService = inject(ToastNotificationsService);
  private analyticsService: AnalyticsService = inject(AnalyticsService);
  private router: Router = inject(Router);
  private sharedDataService: SharedDataService = inject(SharedDataService);
  private utilityMeterGroupDbService: UtilityMeterGroupdbService = inject(UtilityMeterGroupdbService);
  private loadingService: LoadingService = inject(LoadingService);
  private analysisDbService: AnalysisDbService = inject(AnalysisDbService);
  private accountStatusCheckService: AccountStatusCheckService = inject(AccountStatusCheckService);

  facilityReports: Signal<Array<IdbFacilityReport>> = toSignal(this.facilityDbReportsService.facilityReports);
  selectedFacility: Signal<IdbFacility> = toSignal(this.facilityDbService.selectedFacility);
  account: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount);
  itemsPerPage: Signal<number> = toSignal(this.sharedDataService.itemsPerPage);
  facilityAnalysisItems: Signal<Array<IdbAnalysisItem>> = toSignal(this.analysisDbService.facilityAnalysisItems);
  facilityStatusCheck: Signal<FacilityStatusCheck> = toSignal(this.accountStatusCheckService.selectedFacilityStatusCheck$);

  orderDataField: WritableSignal<'name' | 'facilityReportType' | 'analysisItemName' | 'modifiedDate' | 'reportYear'> = signal('name');
  orderByDirection: WritableSignal<'asc' | 'desc'> = signal('desc');
  selectedReportType: WritableSignal<FacilityReportType | ''> = signal('');
  currentPageNumber: number = 1;

  allChecked: WritableSignal<boolean> = signal(false);
  checkedGuids: WritableSignal<Set<string>> = signal(new Set<string>());
  showBulkDelete: WritableSignal<boolean> = signal(false);
  displayDeleteModal: WritableSignal<boolean> = signal(false);
  deletedReport: WritableSignal<IdbFacilityReport | undefined> = signal(undefined);

  filteredReports: Signal<Array<FacilityReportTableItem>> = computed(() => {
    const facilityReports = this.facilityReports();
    const selectedReportType = this.selectedReportType();
    const analysisItems = this.facilityAnalysisItems();
    const orderByDirection = this.orderByDirection();
    const orderDataField = this.orderDataField();
    const facilityStatusCheck = this.facilityStatusCheck();
    
    let filtered: Array<FacilityReportTableItem> = facilityReports.map(report => {
      const analysisItem = analysisItems.find(item => item.guid === report.analysisItemId);
      return {
        id: report.id,
        guid: report.guid,
        name: report.name,
        facilityId: report.facilityId,
        accountId: report.accountId,
        analysisItemId: report.analysisItemId,
        analysisItemName: analysisItem ? analysisItem.name : '',
        facilityReportType: report.facilityReportType,
        modifiedDate: report.modifiedDate,
        reportYear: this.getReportYear(report),
        statusCheck: facilityStatusCheck?.facilityReportStatusChecks.find(check => check.guid === report.guid)
      };
    });
    if (selectedReportType !== '') {
      filtered = filtered.filter(report => report.facilityReportType === selectedReportType);
    }
    return _.orderBy(filtered, [orderDataField], [orderByDirection]);
  });

  hasCheckedItems: Signal<boolean> = computed(() => this.checkedGuids().size > 0);

  checkedItems: Signal<Array<FacilityReportTableItem>> = computed(() =>
    this.filteredReports().filter(item => this.checkedGuids().has(item.guid))
  );

  //TODO: add back in cost savings report type once ready to be released.
  reportTypes: Array<FacilityReportType> = ['analysis', 'overview', 'emissionFactors', 'savings', 'modeling'];

  selectReport(report: FacilityReportTableItem) {
    const raw = this.facilityReports().find(r => r.guid === report.guid);
    if (raw) {
      this.facilityDbReportsService.selectedReport.next(raw);
      this.router.navigateByUrl('/data-evaluation/facility/' + raw.facilityId + '/reports/setup');
    }
  }

  async createCopy(report: FacilityReportTableItem) {
    const raw = this.facilityReports().find(r => r.guid === report.guid);
    if (!raw) return;
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.getFacilityGroups(raw.facilityId);
    let newReport: IdbFacilityReport = getNewIdbFacilityReport(raw.facilityId, raw.accountId, raw.facilityReportType, groups);
    newReport.name = raw.name + ' (Copy)';
    newReport.analysisItemId = raw.analysisItemId;
    let addedReport: IdbFacilityReport = await firstValueFrom(this.facilityDbReportsService.addWithObservable(newReport));
    await this.dbChangesService.setAccountFacilityReports(this.account(), this.selectedFacility());
    this.analyticsService.sendEvent('create_facility_analysis', undefined);
    this.facilityDbReportsService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('New Report Created', undefined, undefined, false, 'alert-success');
    this.router.navigateByUrl('/data-evaluation/facility/' + raw.facilityId + '/reports/setup');
  }

  deleteItem(report: FacilityReportTableItem) {
    const raw = this.facilityReports().find(r => r.guid === report.guid);
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
    await firstValueFrom(this.facilityDbReportsService.deleteWithObservable(report.id));
    await this.dbChangesService.setAccountFacilityReports(this.account(), this.selectedFacility());
    this.displayDeleteModal.set(false);
    this.deletedReport.set(undefined);
    this.toastNotificationService.showToast('Report Item Deleted', undefined, undefined, false, 'alert-success');
  }

  setOrderDataField(field: 'name' | 'facilityReportType' | 'analysisItemName' | 'modifiedDate' | 'reportYear') {
    if (field === this.orderDataField()) {
      this.orderByDirection.set(this.orderByDirection() === 'desc' ? 'asc' : 'desc');
    } else {
      this.orderDataField.set(field);
      this.orderByDirection.set('asc');
    }
  }

  checkAll(event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    this.allChecked.set(checked);
    if (checked) {
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
      await firstValueFrom(this.facilityDbReportsService.deleteWithObservable(item.id));
    }
    await this.dbChangesService.setAccountFacilityReports(this.account(), this.selectedFacility());
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Report Items Deleted!', undefined, undefined, false, 'alert-success');
    this.selectedReportType.set('');
    this.allChecked.set(false);
    this.checkedGuids.set(new Set());
  }

  getReportYear(report: IdbFacilityReport): number | undefined {
    switch (report.facilityReportType) {
      case 'emissionFactors':
        return report.emissionFactorsReportSettings.endYear ?? report.emissionFactorsReportSettings.startYear;
      case 'overview':
        return report.dataOverviewReportSettings.endYear ?? report.dataOverviewReportSettings.startYear;
      case 'savings':
        return report.savingsReportSettings.endYear;
      case 'modeling':
        return report.modelingReportSettings.reportYear;
      case 'costSavings':
        return report.costSavingsReportSettings.endYear;
      default:
        return undefined;
    }
  }
}
