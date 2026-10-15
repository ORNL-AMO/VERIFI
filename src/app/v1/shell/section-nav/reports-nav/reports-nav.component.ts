import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { reportTypeAvailable } from '@app/v1/shared/reports/report-availability';
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
    const report = this.workspace.facilityReports().find(item => item.guid === this.navigation.activeReportGuid()
      && item.facilityId === state.facilityGuid && item.accountId === this.workspace.account()?.guid
      && reportTypeAvailable(item.facilityReportType, this.workspace.account()?.displayEmissions));
    return report ? buildFacilityReportStages(report, state.reportStage ?? 'setup',
      buildFacilityReportCard(report, this.workspace.selectedFacilityAnalyses(), this.status.items(), this.status.state()).status) : [];
  });
  readonly reportGroups = computed(() => {
    const reports = this.workspace.facilityReports()
      .filter(report => report.facilityId === this.navigation.routeState().facilityGuid && report.accountId === this.workspace.account()?.guid
        && reportTypeAvailable(report.facilityReportType, this.workspace.account()?.displayEmissions))
      .map(report => ({ guid: report.guid, name: report.name || 'Untitled facility report', type: report.facilityReportType }))
      .sort((first, second) => first.name.localeCompare(second.name) || first.guid.localeCompare(second.guid));
    return FACILITY_REPORT_TYPES.map(type => ({
      id: type.value,
      label: type.label,
      reports: reports.filter(report => report.type === type.value)
    })).filter(group => group.reports.length > 0);
  });
}
