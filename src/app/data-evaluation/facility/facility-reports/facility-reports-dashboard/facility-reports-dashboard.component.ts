import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private facilityDbService: FacilitydbService = inject(FacilitydbService);
  private facilityReportsDbService: FacilityReportsDbService = inject(FacilityReportsDbService);
  private dbChangesService: DbChangesService = inject(DbChangesService);
  private accountDbService: AccountdbService = inject(AccountdbService);
  private analyticsService: AnalyticsService = inject(AnalyticsService);
  private toastNotificationService: ToastNotificationsService = inject(ToastNotificationsService);
  private router: Router = inject(Router);
  private utilityMeterGroupDbService: UtilityMeterGroupdbService = inject(UtilityMeterGroupdbService);

  selectedFacility: Signal<IdbFacility> = this.accountWorkspaceStore.selectedFacility;

  account: Signal<IdbAccount> = this.accountWorkspaceStore.account;
  newReportType: FacilityReportType = 'analysis';
  displayNewReport: boolean = false;

  openCreateReport() {
    this.displayNewReport = true;
  }

  cancelCreate() {
    this.displayNewReport = false;
  }

  async createReport() {
    const selectedFacility = this.selectedFacility();
    const account = this.account();
    let groups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.getFacilityGroups(selectedFacility.guid);
    let newReport: IdbFacilityReport = getNewIdbFacilityReport(selectedFacility.guid, selectedFacility.accountId, this.newReportType, groups);
    let addedReport: IdbFacilityReport = await firstValueFrom(this.facilityReportsDbService.addWithObservable(newReport));
    await this.dbChangesService.setAccountFacilityReports(account, selectedFacility);
    this.analyticsService.sendEvent('create_facility_analysis', undefined)
    this.facilityReportsDbService.selectedReport.next(addedReport);
    this.toastNotificationService.showToast('New Report Created', undefined, undefined, false, "alert-success");
    this.facilityReportsDbService.selectedReport.next(addedReport);
    this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/reports/setup');
  }
}
