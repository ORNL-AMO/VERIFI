import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FacilityReportType, getNewIdbFacilityReport, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
  selector: 'app-facility-reports-dashboard-table',
  standalone: false,

  templateUrl: './facility-reports-dashboard-table.component.html',
  styleUrl: './facility-reports-dashboard-table.component.css'
})
export class FacilityReportsDashboardTableComponent {

  facilityReports: Array<IdbFacilityReport>;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  facilityReportsSub: Subscription;
  selectedReportType = '';
  reportTypes: Array<FacilityReportType> = ['analysis', 'overview', 'emissionFactors', 'savings'];
  displayDeleteModal: boolean;
  deletedReport: IdbFacilityReport;
  account: IdbAccount;

  currentPageNumber: number = 1;
  itemsPerPage: number;
  itemsPerPageSub: Subscription;
  orderDataField: string = 'name';
  orderByDirection: 'asc' | 'desc' = 'desc';

  constructor(private facilityDbService: FacilitydbService,
    private facilityDbReportsService: FacilityReportsDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private toastNotificationService: ToastNotificationsService,
    private analyticsService: AnalyticsService,
    private router: Router,
    private sharedDataService: SharedDataService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService
  ) { }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });

    this.getReports();

    this.itemsPerPageSub = this.sharedDataService.itemsPerPage.subscribe(val => {
      this.itemsPerPage = val;
    });
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.facilityReportsSub.unsubscribe();
    this.itemsPerPageSub.unsubscribe();
  }

  async getReports() {
     this.facilityReportsSub = this.facilityDbReportsService.facilityReports.subscribe(reports => {
      this.facilityReports = reports;
    });
  }

  selectReport(report: IdbFacilityReport) {
    this.facilityDbReportsService.selectedReport.next(report);
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/reports/setup');
  }

  async createCopy(report: IdbFacilityReport) {
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.getFacilityGroups(report.guid);
    let newReport: IdbFacilityReport = getNewIdbFacilityReport(report.facilityId, report.accountId, report.facilityReportType, groups);
    newReport.name = report.name + ' (Copy)';
    newReport.analysisItemId = report.analysisItemId;
    let addedReport: IdbFacilityReport = await firstValueFrom(this.facilityDbReportsService.addWithObservable(newReport));
    await this.dbChangesService.setAccountFacilityReports(this.account, this.selectedFacility);
    this.analyticsService.sendEvent('create_facility_analysis', undefined)
    this.facilityDbReportsService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('New Report Created', undefined, undefined, false, "alert-success");
    this.facilityDbReportsService.selectedReport.next(addedReport);
    this.router.navigateByUrl('/data-evaluation/facility/' + this.selectedFacility.guid + '/reports/setup');
  }


  deleteItem(report: IdbFacilityReport) {
    this.displayDeleteModal = true;
    this.deletedReport = report;
  }

  cancelDelete() {
    this.displayDeleteModal = false;
  }

  async confirmDelete() {
    await firstValueFrom(this.facilityDbReportsService.deleteWithObservable(this.deletedReport.id));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, this.selectedFacility);
    this.displayDeleteModal = false;
    this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "alert-success");
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

  get sortYear(): string {
    return 'sortYear';
  }
}
