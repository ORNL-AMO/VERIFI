import { ACCOUNT_REPORT_TYPES } from '@app/v1/shared/reports/report-inventory.models';
import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { reportTypeAvailable } from '@app/v1/shared/reports/report-availability';
import { reportIcon } from '@app/v1/shared/reports/report-icons';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FACILITY_REPORT_TYPES, buildFacilityReportCard } from '@app/v1/facility/reports/facility-report.models';
import { buildFacilityReportStages } from '@app/v1/facility/reports/facility-report-workbench/facility-report-workbench.models';

@Component({
  selector: 'app-reports-nav', standalone: false,
  templateUrl: './reports-nav.component.html',
  styleUrls: ['./reports-nav.component.css']
})
export class ReportsNavComponent {
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly workspace = inject(AccountWorkspaceStore);
  private readonly status = inject(WorkspaceStatusService);
  readonly activeStages = computed(() => {
    const state = this.navigation.routeState();
    if (!state.facilityGuid) return [];
    const report = this.workspace.facilityReports().find(item => item.guid === this.navigation.activeReportGuid()
      && item.facilityId === state.facilityGuid && item.accountId === this.workspace.account()?.guid
      && reportTypeAvailable(item.facilityReportType, this.workspace.account()?.displayEmissions));
    return report ? buildFacilityReportStages(report, state.reportStage ?? 'setup',
      buildFacilityReportCard(report, this.workspace.selectedFacilityAnalyses(), this.status.items(), this.status.state()).status) : [];
  });
  readonly reportGroups = computed(() => {
    const accountGuid = this.workspace.account()?.guid;
    const facilityGuid = this.navigation.routeState().facilityGuid;
    const reports = (facilityGuid
      ? this.workspace.facilityReports().filter(report => report.facilityId === facilityGuid && report.accountId === accountGuid)
        .map(report => ({ guid: report.guid, name: report.name || 'Untitled facility report', type: report.facilityReportType, icon: reportIcon(report),
          route: this.navigation.facilityReportWorkbenchRoute(facilityGuid, report.guid) }))
      : this.workspace.accountReports().filter(report => report.accountId === accountGuid)
        .map(report => ({ guid: report.guid, name: report.name || 'Untitled account report', type: report.reportType, icon: reportIcon(report),
          route: this.navigation.accountReportWorkbenchRoute(accountGuid!, report.guid) })))
      .filter(report => reportTypeAvailable(report.type, this.workspace.account()?.displayEmissions))
      .sort((first, second) => first.name.localeCompare(second.name) || first.guid.localeCompare(second.guid));
    const types: ReadonlyArray<{ value: string; label: string }> = facilityGuid ? FACILITY_REPORT_TYPES : ACCOUNT_REPORT_TYPES;
    return types.map(type => ({
      id: type.value,
      label: type.label,
      reports: reports.filter(report => report.type === type.value)
    })).filter(group => group.reports.length > 0);
  });
}
