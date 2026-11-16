import { AnalysisReportEditor } from '../analysis/editing/analysis-report-editor.service';
import { WorkspaceCalendarizationService } from '@app/v1/shared/calendarization/workspace-calendarization.service';
import { mergeFacilityAnalysisSettings, mergeFacilityDataQualitySettings } from '@data/account-workspace/facility-report-setup.models';
import { resolveDataQualitySelection } from '@domain/reports/data-quality-report-selection';
import { AccountReportActionsService } from '@app/v1/reports/account/account-report-actions.service';
import { Component, Provider, computed, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { filter, map, of } from 'rxjs';
import { WorkbenchLayoutService } from '@app/v1/shared/workbench/workbench-layout.service';
import type { StatusItem } from '@app/v1/status/status.models';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { FACILITY_REPORT_ROUTES } from '../facility-reports.routes';
import { FacilityReportsModule } from '../facility-reports.module';
import { FacilityReportActionsService } from '../facility-report-actions.service';
import { FacilityReportWorkbenchComponent } from '../workbench/facility-report-workbench.component';
import { reportFacility, reportFixture, reportSnapshot } from './report-test-fixtures';

@Component({ standalone: true, template: '<h1>Reports inventory</h1>' })
class ReportInventoryDestination {}

export async function setupReportWorkbench(reports = [reportFixture(), reportFixture({ id: 20, guid: 'report-b', name: 'Overview', facilityReportType: 'overview' })], extraProviders: Provider[] = [], snapshot = reportSnapshot(reports)) {
  const store = new AccountWorkspaceStore();
  store.publish(snapshot, { facility: snapshot.facilities[0] });
  const updateName = vi.fn(async (_facility: string, guid: string, name: string) => {
    const report = { ...store.facilityReports().find(item => item.guid === guid)!, name };
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [report] }] });
    return report;
  });
  const updateSetup = vi.fn(async (_facility, guid, changes) => {
    const current = store.facilityReports().find(item => item.guid === guid)!;
    const report = { ...current, ...(changes.name !== undefined ? { name: changes.name.trim() } : {}),
      ...(changes.analysisItemId !== undefined ? { analysisItemId: changes.analysisItemId ?? undefined } : {}),
      ...(changes.analysisReportSettings ? { analysisReportSettings: mergeFacilityAnalysisSettings(current.analysisReportSettings, changes.analysisReportSettings) } : {}) };
    if (current.facilityReportType === 'dataQuality') {
      const settings = mergeFacilityDataQualitySettings(current.dataQualityReportSettings, changes.dataQualityReportSettings ?? {});
      settings.missingSelection = !resolveDataQualitySelection({ accountGuid: current.accountId, facilityGuid: current.facilityId,
        settings, facilityAnalyses: store.facilityAnalyses(), meters: store.meters(), predictors: store.predictors() }).valid;
      report.dataQualityReportSettings = settings;
      const patch = changes.dataQualityReportSettings;
      if (patch?.selectedMode !== undefined || patch?.selectedAnalysisItemId !== undefined) {
        report.analysisItemId = settings.selectedMode === 'analysis' ? settings.selectedAnalysisItemId : undefined;
      }
    }
    store.publishCommittedPatch({ collections: [{ collection: 'facilityReports', upsert: [report] }] }); return report;
  });
  const status = { state: signal<'ready' | 'evaluating' | 'error'>('ready'), items: signal<StatusItem[]>([]) };
  await TestBed.configureTestingModule({ imports: [FacilityReportsModule], providers: [
    provideLocationMocks(),
    { provide: AccountReportActionsService, useValue: {} },
    { provide: WorkbenchLayoutService, useFactory: () => { const factsExpanded = signal(true); return { factsExpanded, toggleFacts: () => factsExpanded.update(value => !value) }; } },
    provideRouter([{ path: 'v1/workspace/account/:accountGuid/reports/dashboard', component: ReportInventoryDestination }, { path: 'v1/workspace/facility/:facilityGuid/reports', children: FACILITY_REPORT_ROUTES }, { path: 'elsewhere', component: FacilityReportWorkbenchComponent }]),
    { provide: AccountWorkspaceStore, useValue: store },
    { provide: WorkspaceStatusService, useValue: status },
    { provide: FacilityReportActionsService, useValue: { updateName, updateSetup } },
    { provide: WorkspaceCalendarizationService, useValue: { calendarizeBase: () => of({ state: 'idle', meters: [] }), retry: vi.fn() } },
    { provide: WorkspaceNavigationService, useFactory: () => {
      const router = inject(Router);
      const url = toSignal(router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), map(event => event.urlAfterRedirects)), { initialValue: router.url });
      const routeState = computed(() => parseWorkspaceRoute(url()));
      return { isSingleSiteWorkspace: () => false,
        facilityInventoryLink: (guid: string) => ({ route: ['/v1', 'workspace', 'account', 'account-a', 'reports', 'dashboard'], queryParams: { facility: guid } }),
        inventoryFacilityGuid: () => undefined, routeState, activeReportGuid: computed(() => routeState().reportGuid),
        accountReportsRoute: (guid: string) => ['/v1', 'workspace', 'account', guid, 'reports', 'dashboard'],

        facilityAnalysisWorkbenchRoute: (facility, analysis) => ['/v1', 'workspace', 'facility', facility, 'analysis', 'workbench', analysis, 'setup'],
        facilityReportWorkbenchRoute: (facility: string, report: string, stage = 'setup') => ['/v1', 'workspace', 'facility', facility, 'reports', 'workbench', report, stage]
      };
    } }, ...extraProviders
  ] }).compileComponents();
  const harness = await RouterTestingHarness.create();
  const router = TestBed.inject(Router);
  router.setUpLocationChangeListener();
  const open = async (report = 'report-a', stage = 'setup') => await harness.navigateByUrl(`/v1/workspace/facility/${snapshot.facilities[0].guid}/reports/workbench/${report}/${stage}`, FacilityReportWorkbenchComponent) as FacilityReportWorkbenchComponent & { readonly editor: AnalysisReportEditor };
  return { harness, router, store, updateName, updateSetup, status, open };
}
