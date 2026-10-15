import { computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { filter, map } from 'rxjs';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import type { StatusItem } from '@app/v1/status/status.models';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService, parseWorkspaceRoute } from '@app/v1/shell/workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FACILITY_REPORT_ROUTES } from '../facility-reports.routes';
import { FacilityReportsModule } from '../facility-reports.module';
import { FacilityReportActionsService } from '../facility-report-actions.service';
import { FacilityReportWorkbenchComponent } from '../facility-report-workbench/facility-report-workbench.component';
import { reportFacility, reportFixture, reportSnapshot } from './report-test-fixtures';

export async function setupReportWorkbench(reports = [reportFixture(), reportFixture({ id: 20, guid: 'report-b', name: 'Overview', facilityReportType: 'overview' })]) {
  const store = new AccountWorkspaceStore();
  store.publish(reportSnapshot(reports), { facility: reportFacility });
  const updateName = vi.fn(async (_facility: string, guid: string, name: string) => {
    const report = { ...store.facilityReports().find(item => item.guid === guid)!, name };
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [report] }] });
    return report;
  });
  const status = { state: signal<'ready' | 'evaluating' | 'error'>('ready'), items: signal<StatusItem[]>([]) };
  await TestBed.configureTestingModule({ imports: [FacilityReportsModule], providers: [
    provideLocationMocks(),
    { provide: WorkbenchLayoutService, useFactory: () => { const factsExpanded = signal(true); return { factsExpanded, toggleFacts: () => factsExpanded.update(value => !value) }; } },
    provideRouter([{ path: 'v1/workspace/facility/:facilityGuid/reports', children: FACILITY_REPORT_ROUTES }, { path: 'elsewhere', component: FacilityReportWorkbenchComponent }]),
    { provide: AccountWorkspaceStore, useValue: store },
    { provide: WorkspaceStatusService, useValue: status },
    { provide: FacilityReportActionsService, useValue: { updateName } },
    { provide: WorkspaceNavigationService, useFactory: () => {
      const router = inject(Router);
      const url = toSignal(router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), map(event => event.urlAfterRedirects)), { initialValue: router.url });
      const routeState = computed(() => parseWorkspaceRoute(url()));
      return {
        routeState, activeReportGuid: computed(() => routeState().reportGuid),
        accountReportsRoute: (guid: string) => ['/v1', 'workspace', 'account', guid, 'reports', 'dashboard'],
        facilityReportsRoute: (guid: string) => ['/v1', 'workspace', 'facility', guid, 'reports', 'dashboard'],
        facilityReportWorkbenchRoute: (facility: string, report: string, stage = 'setup') => ['/v1', 'workspace', 'facility', facility, 'reports', 'workbench', report, stage]
      };
    } }
  ] }).compileComponents();
  const harness = await RouterTestingHarness.create();
  const router = TestBed.inject(Router);
  router.setUpLocationChangeListener();
  const open = (report = 'report-a', stage = 'setup') => harness.navigateByUrl(`/v1/workspace/facility/facility-a/reports/workbench/${report}/${stage}`, FacilityReportWorkbenchComponent);
  return { harness, router, store, updateName, status, open };
}
