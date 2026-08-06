import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
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
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly reportHandler = inject(ReportCommandHandler);
  private analyticsService: AnalyticsService = inject(AnalyticsService);
  private toastNotificationService: ToastNotificationsService = inject(ToastNotificationsService);
  private router: Router = inject(Router);

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
    let groups: Array<IdbUtilityMeterGroup> = this.accountWorkspaceQuery.getFacilityMeterGroups(selectedFacility.guid);
    let newReport: IdbFacilityReport = getNewIdbFacilityReport(selectedFacility.guid, selectedFacility.accountId, this.newReportType, groups);
    const { value: addedReport } = await this.commandBoundary.execute(
      { entityKind: 'facilityReport', changeKind: 'add', label: 'Create Facility Report' },
      () => this.reportHandler.addFacilityReport(newReport)
    );
    this.analyticsService.sendEvent('create_facility_analysis', undefined)
    this.accountWorkspaceService.selectFacilityReport((addedReport)?.guid);
    this.toastNotificationService.showToast('New Report Created', undefined, undefined, false, "alert-success");
    this.accountWorkspaceService.selectFacilityReport((addedReport)?.guid);
    this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid + '/reports/setup');
  }
}
