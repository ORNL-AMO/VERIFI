import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbFacilityReport, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-facility-report-item-card',
  templateUrl: './facility-report-item-card.component.html',
  styleUrl: './facility-report-item-card.component.css'
})
export class FacilityReportItemCardComponent {
  @Input({ required: true })
  report: IdbFacilityReport;
  @Input({ required: true })
  facility: IdbFacility;

  displayDeleteModal: boolean = false;
  constructor(private facilityDbReportsService: FacilityReportsDbService,
    private router: Router,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private toastNotificationService: ToastNotificationsService,
    private analyticsService: AnalyticsService
  ) {

  }

  selectReport() {
    this.facilityDbReportsService.selectedReport.next(this.report);
    if (this.report.facilityReportType == 'analysis') {
      this.router.navigateByUrl('facility/' + this.facility.id + '/reports/setup');
    }
  }

  async createCopy() {
    let newReport: IdbFacilityReport = getNewIdbFacilityReport(this.report.facilityId, this.report.accountId, this.report.facilityReportType);
    newReport.name = this.report.name + ' (Copy)';
    newReport.analysisItemId = this.report.analysisItemId;
    let addedReport: IdbFacilityReport = await firstValueFrom(this.facilityDbReportsService.addWithObservable(newReport));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityReports(account, this.facility);
    this.analyticsService.sendEvent('create_facility_analysis', undefined)
    this.facilityDbReportsService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('New Report Created', undefined, undefined, false, "alert-success");
    this.facilityDbReportsService.selectedReport.next(addedReport);
    if (addedReport.facilityReportType == 'analysis') {
      this.router.navigateByUrl('facility/' + this.facility.id + '/reports/setup');
    }
  }

  deleteItem() {
    this.displayDeleteModal = true;
  }

  cancelDelete() {
    this.displayDeleteModal = false;
  }

  async confirmDelete() {
    await firstValueFrom(this.facilityDbReportsService.deleteWithObservable(this.report.id));
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityReports(selectedAccount, this.facility);
    this.displayDeleteModal = false;
    this.toastNotificationService.showToast('Analysis Item Deleted', undefined, undefined, false, "alert-success");
  }
}