import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { reportTypeAvailable } from '@app/v1/shared/reports/report-availability';
import { buildFacilityReportCard } from '../facility-report.models';
import { buildFacilityReportStages, facilityReportStage } from './facility-report-workbench.models';

@Injectable()
export class FacilityReportWorkbenchContext {
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly status = inject(WorkspaceStatusService);
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  readonly guid = computed(() => this.params().get('reportGuid') ?? '');
  readonly facility = computed(() => {
    const facility = this.workspace.selectedFacility();
    return facility?.guid === this.navigation.routeState().facilityGuid
      && facility.accountId === this.workspace.account()?.guid ? facility : undefined;
  });
  readonly reports = computed(() => this.workspace.facilityReports().filter(report => report.facilityId === this.facility()?.guid
    && report.accountId === this.workspace.account()?.guid
    && reportTypeAvailable(report.facilityReportType, this.workspace.account()?.displayEmissions))
    .slice().sort((a, b) => (a.name || 'Untitled facility report').localeCompare(b.name || 'Untitled facility report') || a.guid.localeCompare(b.guid)));
  readonly report = computed(() => this.reports().find(report => report.guid === this.guid()));
  readonly key = computed(() => `${this.workspace.account()?.guid}:${this.navigation.routeState().facilityGuid}:${this.guid()}`);
  readonly stage = computed(() => facilityReportStage(this.navigation.routeState().reportStage));
  readonly stages = computed(() => {
    const report = this.report();
    return report ? buildFacilityReportStages(report, this.stage(), this.card()?.status) : [];
  });
  readonly card = computed(() => {
    const report = this.report();
    return report ? buildFacilityReportCard(report, this.workspace.selectedFacilityAnalyses(), this.status.items(), this.status.state()) : undefined;
  });
  readonly findings = computed(() => this.status.items().filter(item => item.entity.kind === 'facility-report'
    && item.entity.guid === this.guid() && item.entity.facilityGuid === this.facility()?.guid
    && item.entity.accountGuid === this.workspace.account()?.guid));
  readonly dashboardRoute = computed(() => this.navigation.facilityReportsRoute(this.navigation.routeState().facilityGuid ?? ''));
  readonly resources = computed(() => this.reports().map(report => ({ id: report.guid, label: report.name || 'Untitled facility report', icon: 'report' as const })));
}
