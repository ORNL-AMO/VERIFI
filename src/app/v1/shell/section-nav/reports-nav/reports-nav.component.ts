import { reportTypeChoices, ReportScope } from '@app/v1/reports/report-inventory.models';
import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { reportTypeAvailable } from '@app/v1/reports/report-availability';
import { reportIcon } from '@app/v1/reports/report-icons';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { buildFacilityReportPresentation } from '@app/v1/reports/facility/facility-report.models';
import { buildFacilityReportStages } from '@app/v1/reports/facility/workbench/facility-report-workbench.models';
import { RecentItemsService } from '../recent-items.service';

@Component({
  selector: 'app-reports-nav', standalone: false,
  templateUrl: './reports-nav.component.html',
  styleUrls: ['./reports-nav.component.css']
})
export class ReportsNavComponent {
  readonly recent = inject(RecentItemsService);
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
      buildFacilityReportPresentation(report, this.navigation.contextAnalyses(), this.status.items(), this.status.state()).status) : [];
  });
  readonly inventoryLink = computed(() => {
    const facility = this.navigation.contextFacility();
    return facility ? this.navigation.facilityInventoryLink(facility.guid, 'reports')
      : { route: this.navigation.accountReportsRoute(this.navigation.account()?.guid ?? ''), queryParams: {} };
  });
  readonly reportGroups = computed(() => {
    const accountGuid = this.workspace.account()?.guid;
    const single = this.navigation.isSingleSiteWorkspace();
    const facilityGuid = single ? this.navigation.singleFacilityContext()?.guid : this.navigation.contextFacility()?.guid;
    const state = this.navigation.routeState();
    const choices = reportTypeChoices(single, this.workspace.account()?.displayEmissions);
    const reports = [
      ...(!facilityGuid || single ? this.workspace.accountReports().filter(report => report.accountId === accountGuid)
        .map(report => ({ guid: report.guid, name: report.name || 'Untitled report', type: report.reportType, scope: 'account' as const,
          icon: reportIcon(report), facilityGuid: undefined, route: this.navigation.accountReportWorkbenchRoute(report.accountId, report.guid) })) : []),
      ...(facilityGuid ? this.workspace.facilityReports().filter(report => report.accountId === accountGuid && report.facilityId === facilityGuid)
        .map(report => ({ guid: report.guid, name: report.name || 'Untitled report', type: report.facilityReportType, scope: 'facility' as const,
          icon: reportIcon(report), facilityGuid: report.facilityId, route: this.navigation.facilityReportWorkbenchRoute(report.facilityId, report.guid) })) : [])
    ].filter(report => choices.some(choice => choice.value === `${report.scope}:${report.type}`))
      .sort((a, b) => a.name.localeCompare(b.name) || a.guid.localeCompare(b.guid));
    const groups = new Map<string, { id: string; label: string; reports: Array<{
      key: string; guid: string; name: string; scope: ReportScope; icon: ReturnType<typeof reportIcon>; route: string[]; active: boolean; formatLabel?: string;
    }> }>();
    for (const choice of choices) {
      if (!single && choice.scope !== (facilityGuid ? 'facility' : 'account')) continue;
      const groupKey = single ? choice.typeLabel : choice.value;
      if (!groups.has(groupKey)) groups.set(groupKey, { id: choice.type, label: choice.typeLabel, reports: [] });
    }
    for (const report of reports) {
      const choice = choices.find(option => option.value === `${report.scope}:${report.type}`)!;
      groups.get(single ? choice.typeLabel : choice.value)?.reports.push({ ...report,
        key: JSON.stringify([report.scope, report.facilityGuid ?? accountGuid, report.guid]), formatLabel: choice.formatLabel,
        active: this.navigation.activeReportGuid() === report.guid && this.navigation.contextMode() === report.scope
          && (report.scope === 'account' || report.facilityGuid === state.facilityGuid) });
    }
    return [...groups.values()].filter(group => group.reports.length);
  });
}
