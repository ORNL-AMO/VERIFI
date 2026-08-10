import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, inject, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ReportCommandHandler } from 'src/app/account-workspace/handlers/report-command-handler.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { ReportType } from 'src/app/models/constantsAndTypes';
import { AnalyticsService } from 'src/app/analytics/analytics.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { getNewIdbAccountReport, IdbAccountReport } from 'src/app/models/idbModels/accountReport';

@Component({
  selector: 'app-account-reports-dashboard',
  templateUrl: './account-reports-dashboard.component.html',
  styleUrls: ['./account-reports-dashboard.component.css'],
  standalone: false
})
export class AccountReportsDashboardComponent {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private router: Router = inject(Router);
  private readonly commandBoundary = inject(WorkspaceCommandBoundary);
  private readonly reportHandler = inject(ReportCommandHandler);
  private toastNotificationService: ToastNotificationsService = inject(ToastNotificationsService);
  private analyticsService: AnalyticsService = inject(AnalyticsService);

  selectedAccount: Signal<IdbAccount> = this.accountWorkspaceStore.account;
  newReportType: ReportType = 'betterPlants';
  displayNewReport: boolean = false;

  async createNewReport() {
    const account: IdbAccount = this.selectedAccount();
    let facilities: Array<IdbFacility> = [...this.accountWorkspaceStore.facilities()];
    let groups: Array<IdbUtilityMeterGroup> = [...this.accountWorkspaceStore.meterGroups()];
    let newReport: IdbAccountReport = getNewIdbAccountReport(account, facilities, groups);
    newReport.reportType = this.newReportType;
    const { value: addedReport } = await this.commandBoundary.execute(
      { entityKind: 'accountReport', changeKind: 'add', label: 'Create Account Report' ,
        publication: { mode: 'patch', buildPatch: value => ({ collections: [{ collection: 'accountReports', upsert: [value] }] }) }},
      () => this.reportHandler.addAccountReport(newReport, this.accountWorkspaceStore.account()?.guid)
    );
    this.analyticsService.sendEvent('create_report');
    this.accountWorkspaceService.selectAccountReport((addedReport)?.guid);
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
