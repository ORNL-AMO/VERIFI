import { Component, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
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
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-account-reports-dashboard',
  templateUrl: './account-reports-dashboard.component.html',
  styleUrls: ['./account-reports-dashboard.component.css'],
  standalone: false
})
export class AccountReportsDashboardComponent {
  private router: Router = inject(Router);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private accountReportDbService: AccountReportDbService = inject(AccountReportDbService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private toastNotificationService: ToastNotificationsService = inject(ToastNotificationsService);
  private analyticsService: AnalyticsService = inject(AnalyticsService);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private utilityMeterGroupDbService: UtilityMeterGroupdbService = inject(UtilityMeterGroupdbService);

  selectedAccount: Signal<IdbAccount> = toSignal(this.accountDbService.selectedAccount);
  newReportType: ReportType = 'betterPlants';
  displayNewReport: boolean = false;

  async createNewReport() {
    const account: IdbAccount = this.selectedAccount();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
    let newReport: IdbAccountReport = getNewIdbAccountReport(account, facilities, groups);
    newReport.reportType = this.newReportType;
    let addedReport: IdbAccountReport = await firstValueFrom(this.accountReportDbService.addWithObservable(newReport));
    await this.dbChangesService.setAccountReports(account);
    this.analyticsService.sendEvent('create_report');
    this.accountReportDbService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('Report Created', undefined, undefined, false, "alert-success");
    this.router.navigateByUrl('/data-evaluation/account/reports/setup');

  }

  openCreateReport() {
    this.displayNewReport = true;
  }

  cancelCreate() {
    this.displayNewReport = false;
  }
}
