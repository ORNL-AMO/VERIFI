import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import * as _ from 'lodash';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { ReportType } from 'src/app/models/constantsAndTypes';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { getNewIdbAccountReport, IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
    selector: 'app-account-reports-dashboard',
    templateUrl: './account-reports-dashboard.component.html',
    styleUrls: ['./account-reports-dashboard.component.css'],
    standalone: false
})
export class AccountReportsDashboardComponent {

  selectedAccount: IdbAccount;
  newReportType: ReportType = 'betterPlants';
  displayNewReport: boolean;
  constructor(private router: Router,
    private accountDbService: AccountdbService,
    private accountReportDbService: AccountReportDbService,
    private dbChangesService: DbChangesService,
    private toastNotificationService: ToastNotificationsService,
    private analyticsService: AnalyticsService,
    private facilityDbService: FacilitydbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  ngOnInit(): void {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
  }

  async createNewReport() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let newReport: IdbAccountReport = getNewIdbAccountReport(account, facilities, groups);
    newReport.reportType = this.newReportType;
    let addedReport: IdbAccountReport = await firstValueFrom(this.accountReportDbService.addWithObservable(newReport));
    await this.dbChangesService.setAccountReports(this.selectedAccount);
    this.analyticsService.sendEvent('create_report');
    this.accountReportDbService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('Report Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('/data-evaluation/account/reports/setup');

  }

  openCreateReport() {
    if (this.router.url.includes('performance')) {
      this.newReportType = 'performance';
    } else if (this.router.url.includes('better-plants')) {
      this.newReportType = 'betterPlants';
    } else if (this.router.url.includes('overview')) {
      this.newReportType = 'dataOverview';
    } else if (this.router.url.includes('better-climate')) {
      this.newReportType = 'betterClimate';
    } else if (this.router.url.includes('analysis')) {
      this.newReportType = 'analysis';
    } else if (this.router.url.includes('account-savings')) {
      this.newReportType = 'accountSavings';
    } else if (this.router.url.includes('account-emission-factors')) {
      this.newReportType = 'accountEmissionFactors';
    }
    this.displayNewReport = true;
  }

  cancelCreate() {
    this.displayNewReport = false;
  }
}
