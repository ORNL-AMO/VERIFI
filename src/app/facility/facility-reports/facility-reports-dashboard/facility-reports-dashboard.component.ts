import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
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

@Component({
    selector: 'app-facility-reports-dashboard',
    templateUrl: './facility-reports-dashboard.component.html',
    styleUrl: './facility-reports-dashboard.component.css',
    standalone: false
})
export class FacilityReportsDashboardComponent {

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  facilityReports: Array<IdbFacilityReport>;
  facilityReportsSub: Subscription;

  newReportType: FacilityReportType = 'analysis';
  displayNewReport: boolean = false;
  routerSub: Subscription;
  reportType: 'Analysis' | 'Data Overview' | 'Savings';
  constructor(private facilityDbService: FacilitydbService,
    private facilityReportsDbService: FacilityReportsDbService,
    private dbChangesService: DbChangesService,
    private accountDbService: AccountdbService,
    private analyticsService: AnalyticsService,
    private toastNotificationService: ToastNotificationsService,
    private router: Router,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService
  ) {

  }

  ngOnInit() {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
    });

    this.facilityReportsSub = this.facilityReportsDbService.facilityReports.subscribe(reports => {
      this.facilityReports = reports;
    });
    this.routerSub = this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.setReportType(event.urlAfterRedirects);
      }
    });
    //navigationsEnd isn't fired on init. Call here.
    this.setReportType(this.router.url);
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
    this.facilityReportsSub.unsubscribe();
    this.routerSub.unsubscribe();
  }

  openCreateReport() {
    this.displayNewReport = true;
  }

  cancelCreate() {
    this.displayNewReport = false;
  }

  async createReport() {
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.getFacilityGroups(this.selectedFacility.guid);
    let newReport: IdbFacilityReport = getNewIdbFacilityReport(this.selectedFacility.guid, this.selectedFacility.accountId, this.newReportType, groups);
    let addedReport: IdbFacilityReport = await firstValueFrom(this.facilityReportsDbService.addWithObservable(newReport));
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setAccountFacilityReports(account, this.selectedFacility);
    this.analyticsService.sendEvent('create_facility_analysis', undefined)
    this.facilityReportsDbService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('New Report Created', undefined, undefined, false, "alert-success");
    this.facilityReportsDbService.selectedReport.next(addedReport);
    this.router.navigateByUrl('facility/' + this.selectedFacility.id + '/reports/setup');
  }


  setReportType(url: string) {
    if (url.includes('analysis')) {
      this.reportType = 'Analysis';
    } else if (url.includes('overview')) {
      this.reportType = 'Data Overview';
    } else if (url.includes('savings')) {
      this.reportType = 'Savings';
    }
  }



}
