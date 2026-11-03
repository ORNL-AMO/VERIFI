import { reportTypePresentation } from '@app/v1/reports/catalog/report-catalog';
import { Injectable, computed, inject } from '@angular/core';
import { REPORT_SESSION_IDENTITY } from '@app/v1/reports/shared/workbench/report-runtime.models';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { reportTypeAvailable } from '@app/v1/reports/catalog/report-availability';
import { reportIcon } from '@app/v1/reports/catalog/report-icons';
import { buildFacilityReportPresentation } from '../facility-report.models';
import { buildFacilityReportStages, facilityReportStage } from './facility-report-workbench.models';

@Injectable()
export class FacilityReportWorkbenchContext {
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly status = inject(WorkspaceStatusService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private readonly identity = inject(REPORT_SESSION_IDENTITY, { optional: true });
  readonly guid = computed(() => this.identity?.reportGuid ?? this.params().get('reportGuid') ?? '');
  readonly facility = computed(() => {
    const guid = this.identity?.scope === 'facility' ? this.identity.facilityGuid : this.navigation.routeState().facilityGuid;
    const account = this.identity?.accountGuid ?? this.workspace.account()?.guid;
    return account === this.workspace.account()?.guid ? this.workspace.facilities().find(item => item.guid === guid && item.accountId === account) : undefined;
  });
  readonly reports = computed(() => this.workspace.facilityReports().filter(report => report.facilityId === this.facility()?.guid
    && report.accountId === this.workspace.account()?.guid
    && reportTypeAvailable('facility', report.facilityReportType, this.workspace.account()?.displayEmissions))
    .slice().sort((a, b) => (a.name || 'Untitled facility report').localeCompare(b.name || 'Untitled facility report') || a.guid.localeCompare(b.guid)));
  readonly report = computed(() => this.reports().find(report => report.guid === this.guid()));
  readonly key = computed(() => `${this.identity?.accountGuid ?? this.workspace.account()?.guid}:${this.identity?.scope === 'facility' ? this.identity.facilityGuid : this.navigation.routeState().facilityGuid}:${this.guid()}`);
  readonly typeLabel = computed(() => {
    const report = this.report();
    return report ? reportTypePresentation('facility', report.facilityReportType, this.navigation.isSingleSiteWorkspace()).label : 'Report';
  });
  readonly stage = computed(() => facilityReportStage(this.navigation.routeState().reportStage));
  readonly stages = computed(() => {
    const report = this.report();
    return report ? buildFacilityReportStages(report, this.stage(), this.presentation()?.status) : [];
  });
  readonly presentation = computed(() => {
    const report = this.report();
    return report ? buildFacilityReportPresentation(report, this.workspace.facilityAnalyses().filter(item => item.facilityId === report.facilityId && item.accountId === report.accountId), this.status.items(), this.status.state()) : undefined;
  });
  readonly findings = computed(() => this.status.items().filter(item => item.entity.kind === 'facility-report'
    && item.entity.guid === this.guid() && item.entity.facilityGuid === this.facility()?.guid
    && item.entity.accountGuid === this.workspace.account()?.guid));
  readonly inventoryLink = computed(() => this.navigation.facilityInventoryLink(this.facility()?.guid ?? '', 'reports'));
  readonly resources = computed(() => this.reports().map(report => ({ id: report.guid, label: report.name || 'Untitled facility report', icon: reportIcon(report) })));
}
