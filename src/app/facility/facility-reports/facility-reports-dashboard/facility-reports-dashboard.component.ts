import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { FacilityReportType, getNewIdbFacilityReport, IdbFacilityReport } from 'src/app/models/idbModels/facilityReport';

@Component({
  selector: 'app-facility-reports-dashboard',
  templateUrl: './facility-reports-dashboard.component.html',
  styleUrl: './facility-reports-dashboard.component.css'
})
export class FacilityReportsDashboardComponent {

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  facilityReports: Array<IdbFacilityReport>;
  facilityReportsSub: Subscription;

  newReportType: FacilityReportType = 'analysis';
  displayNewReport: boolean = false;
  constructor(private facilityDbService: FacilitydbService,
    private facilityDbReportsService: FacilityReportsDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private analyticsService: AnalyticsService,
    private toastNotificationService: ToastNotificationsService,
    private router: Router
  ) {

  }

  ngOnInit() {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });

    this.facilityReportsSub = this.facilityDbReportsService.facilityReports.subscribe(reports => {
      this.facilityReports = reports;
    })
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.facilityReportsSub.unsubscribe();
  }

  openCreateReport() {
    this.displayNewReport = true;
  }

  cancelCreate() {
    this.displayNewReport = false;
  }

  async createReport() {
    let newReport: IdbFacilityReport = getNewIdbFacilityReport(this.selectedFacility.guid, this.selectedFacility.accountId, this.newReportType);
    let addedReport: IdbFacilityReport = await firstValueFrom(this.facilityDbReportsService.addWithObservable(newReport));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityReports(account, this.selectedFacility);
    this.analyticsService.sendEvent('create_facility_analysis', undefined)
    this.facilityDbReportsService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('New Report Created', undefined, undefined, false, "alert-success");
    this.facilityDbReportsService.selectedReport.next(addedReport);
    if (addedReport.facilityReportType == 'analysis') {
      this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/reports/setup');
    }
  }




}