import { TestBed } from '@angular/core/testing';
import { computed, inject, signal, Provider } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { filter, map } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountReportSetupChanges, accountReportAnalysisSetupKey } from '@data/account-workspace/account-report-setup.models';
import { WorkspaceNavigationService, parseWorkspaceRoute } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import { StatusItem } from '@app/v1/status/status.models';
import { AccountReportsModule } from '../account-reports.module';
import { ACCOUNT_REPORT_ROUTES } from '../account-reports.routes';
import { AccountReportActionsService } from '../account-report-actions.service';
import { FacilityReportActionsService } from '@app/v1/facility/reports/facility-report-actions.service';
import { AccountReportWorkbenchComponent } from '../account-report-workbench/account-report-workbench.component';
import { accountReportSnapshot } from './account-report-test-fixtures';

export async function setupAccountReportWorkbench(snapshot: AccountWorkspaceSnapshot = accountReportSnapshot(), providers: Provider[] = []) {
  const store = new AccountWorkspaceStore(); store.publish(snapshot);
  const status = { state: signal<'ready' | 'evaluating' | 'error'>('ready'), items: signal<StatusItem[]>([]) };
  const updateSetup = vi.fn(async (guid: string, changes: AccountReportSetupChanges) => {
    const report = store.accountReports().find(item => item.guid === guid)!;
    const key = accountReportAnalysisSetupKey(report.reportType);
    const updated = { ...report, ...(changes.name !== undefined ? { name: changes.name } : {}),
      ...(key && changes.analysis !== undefined ? { [key]: { ...report[key], analysisItemId: changes.analysis?.analysisGuid } } : {}) };
    store.publishCommittedPatch({ collections: [{ collection: 'accountReports', upsert: [updated] }] }); return updated;
  });
  await TestBed.configureTestingModule({ imports: [AccountReportsModule], providers: [provideLocationMocks(),
    provideRouter([{ path: 'v1/workspace/account/:accountGuid/reports', children: ACCOUNT_REPORT_ROUTES }, { path: 'elsewhere', component: AccountReportWorkbenchComponent }]),
    { provide: AccountWorkspaceStore, useValue: store }, { provide: WorkspaceStatusService, useValue: status },
    { provide: AccountReportActionsService, useValue: { updateSetup } }, { provide: FacilityReportActionsService, useValue: {} },
    { provide: WorkbenchLayoutService, useFactory: () => { const factsExpanded = signal(true); return { factsExpanded, toggleFacts: () => factsExpanded.update(value => !value) }; } },
    { provide: WorkspaceNavigationService, useFactory: () => {
      const router = inject(Router);
      const url = toSignal(router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), map(event => event.urlAfterRedirects)), { initialValue: router.url });
      const routeState = computed(() => parseWorkspaceRoute(url()));
      return { routeState, activeReportGuid: computed(() => routeState().reportGuid),
        accountReportsRoute: (account: string) => ['/v1', 'workspace', 'account', account, 'reports', 'dashboard'],
        accountReportWorkbenchRoute: (account: string, report: string, stage = 'setup') => ['/v1', 'workspace', 'account', account, 'reports', 'workbench', report, stage] };
    } }, ...providers
  ] }).compileComponents();
  const harness = await RouterTestingHarness.create(); const router = TestBed.inject(Router); router.setUpLocationChangeListener();
  const open = (report = 'account-report', stage = 'setup') => harness.navigateByUrl(`/v1/workspace/account/${snapshot.account.guid}/reports/workbench/${report}/${stage}`, AccountReportWorkbenchComponent);
  return { store, status, updateSetup, harness, router, open };
}
