import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { buildFacilityReportCard } from '../facility-report.models';
import { reportTypeAvailable } from '@app/v1/shared/reports/report-availability';

@Component({
  selector: 'app-facility-report-landing', standalone: false,
  templateUrl: './facility-report-landing.component.html',
  styleUrls: ['./facility-report-landing.component.css']
})
export class FacilityReportLandingComponent {
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  private readonly status = inject(WorkspaceStatusService);
  readonly dashboardRoute = computed(() => this.navigation.facilityReportsRoute(this.navigation.routeState().facilityGuid!));
  readonly card = computed(() => {
    const report = this.workspace.facilityReports().find(item => item.guid === this.navigation.activeReportGuid()
      && item.facilityId === this.navigation.routeState().facilityGuid && item.accountId === this.workspace.account()?.guid);
    return report && reportTypeAvailable(report.facilityReportType, this.workspace.account()?.displayEmissions)
      ? buildFacilityReportCard(report, this.workspace.selectedFacilityAnalyses(), this.status.items(), this.status.state()) : undefined;
  });
}
