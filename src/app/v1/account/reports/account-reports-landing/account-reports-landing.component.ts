import { Component, computed, inject } from '@angular/core';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { ReportLifecycleService } from '@app/v1/shared/reports/report-lifecycle.service';
import { buildReportInventory } from '@app/v1/shared/reports/report-inventory.models';

@Component({ selector: 'app-account-reports-landing', standalone: false, host: { class: 'v1-inventory-dashboard-host' }, providers: [ReportLifecycleService],
  templateUrl: './account-reports-landing.component.html', styleUrls: ['./account-reports-landing.component.css'] })
export class AccountReportsLandingComponent {
  readonly workspace = inject(AccountWorkspaceStore);
  readonly navigation = inject(WorkspaceNavigationService);
  readonly status = inject(WorkspaceStatusService);
  readonly lifecycle = inject(ReportLifecycleService);
  readonly entry = computed(() => {
    const snapshot = this.workspace.snapshot();
    const route = this.navigation.routeState();
    return snapshot && snapshot.account.guid === route.accountGuid
      ? buildReportInventory(snapshot, this.status.items(), this.status.state()).find(entry => entry.scope === 'account' && entry.report.guid === route.reportGuid)
      : undefined;
  });
  readonly dashboardRoute = computed(() => this.navigation.accountReportsRoute(this.navigation.routeState().accountGuid ?? ''));
  readonly breadcrumbs = computed(() => [{ label: `${this.workspace.account()?.name || 'Account'} Reports`, route: this.dashboardRoute() }, { label: this.entry()?.report.name || 'Report' }]);
  hasUnsavedChanges(): boolean { return this.lifecycle.draftChanged(); }
  isNavigationBlocked(): boolean { return this.lifecycle.navigationBlocked(); }
}
