import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DefaultUrlSerializer, NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from './workspace-navigation.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { makeFinding } from '@app/v1/status/status.models';
import { presentFindings } from '@app/v1/status/status.catalog';

describe('WorkspaceNavigationService', () => {
  afterEach(() => vi.restoreAllMocks());

  let service: WorkspaceNavigationService;
  let router: { parseUrl: DefaultUrlSerializer['parse']; navigateByUrl: ReturnType<typeof vi.fn>; url: string; events: Subject<unknown>; navigate: ReturnType<typeof vi.fn> };
  let workspaceService: { selectAccount: ReturnType<typeof vi.fn>; selectFacility: ReturnType<typeof vi.fn> };
  let usableAccounts: ReturnType<typeof vi.fn>;
  let accountSignal: ReturnType<typeof signal<any>>;
  let facilitiesSignal: ReturnType<typeof signal<any[]>>;
  let selectedFacilitySignal: ReturnType<typeof signal<any>>;
  let workspaceStore: {
    status: ReturnType<typeof vi.fn>; hasPending: ReturnType<typeof vi.fn>;
    account: ReturnType<typeof vi.fn>;
    facilities: ReturnType<typeof vi.fn>;
    selectedFacility: ReturnType<typeof vi.fn>;
    meters: ReturnType<typeof vi.fn>;
    facilityMeters: ReturnType<typeof vi.fn>;
    predictors: ReturnType<typeof vi.fn>;
    facilityPredictors: ReturnType<typeof vi.fn>;
    accountAnalyses: ReturnType<typeof vi.fn>;
    selectedFacilityAnalyses: ReturnType<typeof vi.fn>;
    accountReports: ReturnType<typeof vi.fn>;
    selectedFacilityReports: ReturnType<typeof vi.fn>;
    facilityAnalyses: ReturnType<typeof vi.fn>; facilityReports: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    router = {
      parseUrl: new DefaultUrlSerializer().parse.bind(new DefaultUrlSerializer()),
      navigateByUrl: vi.fn().mockResolvedValue(true),
      url: '/v1/workspace/account/account-a/home/overview',
      events: new Subject<unknown>(),
      navigate: vi.fn().mockResolvedValue(true)
    };
    workspaceService = {
      selectAccount: vi.fn().mockResolvedValue('published'),
      selectFacility: vi.fn()
    };
    usableAccounts = vi.fn(() => []);
    accountSignal = signal({ guid: 'account-a', name: 'Account A' });
    facilitiesSignal = signal([{ guid: 'facility-a', name: 'Facility A', accountId: 'account-a' }, { guid: 'facility-b', name: 'Facility B', accountId: 'account-a' }]);
    selectedFacilitySignal = signal({ guid: 'facility-a', name: 'Facility A' });
    workspaceStore = {
      status: vi.fn(() => 'ready'), hasPending: vi.fn(() => false),
      account: vi.fn(() => accountSignal()),
      facilities: vi.fn(() => facilitiesSignal()),
      selectedFacility: vi.fn(() => selectedFacilitySignal()),
      meters: vi.fn(() => []),
      facilityMeters: vi.fn(() => []),
      predictors: vi.fn(() => []),
      facilityPredictors: vi.fn(() => []),
      accountAnalyses: vi.fn(() => []),
      selectedFacilityAnalyses: vi.fn(() => []),
      accountReports: vi.fn(() => []),
      selectedFacilityReports: vi.fn(() => []),
      facilityAnalyses: vi.fn(() => []), facilityReports: vi.fn(() => [])
    };

    TestBed.configureTestingModule({
      providers: [
        WorkspaceNavigationService,
        { provide: Router, useValue: router },
        { provide: ApplicationLifecycleService, useValue: { usableAccounts } },
        { provide: AccountWorkspaceStore, useValue: workspaceStore },
        { provide: AccountWorkspaceService, useValue: workspaceService },
        {
          provide: WorkspaceStatusService,
          useValue: {
            accountTodos: vi.fn(() => []),
            selectedFacilityTodos: vi.fn(() => []),
            accountDiscardedWarnings: vi.fn(() => []), discardedItems: vi.fn(() => []),
            selectedFacilityDiscardedWarnings: vi.fn(() => [])
          }
        }
      ]
    });
    service = TestBed.inject(WorkspaceNavigationService);
  });

  it('opens To-dos with a consumable focus request and leaves the panel toggle independent', () => {
    service.hideSupportPanel(); service.openTodos();
    expect(service.activePanelTab()).toBe('todos');
    expect(service.isSupportPanelOpen()).toBe(true);
    expect(service.supportPanelRequested()).toBe(true);
    expect(service.todosFocusRequested()).toBe(true);
    service.completeTodosFocus(); expect(service.todosFocusRequested()).toBe(false);
    expect(service.supportPanelRequested()).toBe(true);
    service.openTodos(); service.toggleSupportPanel();
    expect(service.isSupportPanelOpen()).toBe(false);
    expect(service.supportPanelRequested()).toBe(false);
    expect(service.todosFocusRequested()).toBe(false);
    service.openTodos(); service.setPanelTab('help');
    expect(service.activePanelTab()).toBe('help');
    expect(service.todosFocusRequested()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled(); expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('uses explicit Meters breadcrumb destinations through facility and meter-group navigation', () => {
    router.events.next(new NavigationEnd(1, '', '/v1/workspace/account/account-a/data/portfolio/meters'));
    router.events.next(new NavigationEnd(2, '', '/v1/workspace/facility/facility-a/data/meters/meter-a/settings'));
    expect(service.accountDataReturnRoute('account-a')).toEqual(service.accountPortfolioRoute('account-a', 'meters'));
    router.events.next(new NavigationEnd(3, '', '/v1/workspace/facility/facility-a/data/meter-grouping/group-a/monthly-table'));
    expect(service.accountDataReturnRoute('account-a')).toEqual(service.accountPortfolioRoute('account-a', 'meters'));
    expect(service.accountDataReturnRoute('account-a')).toEqual(service.accountPortfolioRoute('account-a','meters'));
    router.events.next(new NavigationEnd(4, '', '/v1/workspace/facility/facility-b/data/meters'));
    expect(service.accountDataReturnRoute('account-a')).toEqual(service.accountPortfolioRoute('account-a', 'meters'));
    expect(service.accountDataReturnRoute('account-b')).toEqual(service.accountPortfolioRoute('account-b', 'meters'));
    router.events.next(new NavigationEnd(5, '', '/v1/workspace/account/account-a/data/portfolio/facilities'));
    router.events.next(new NavigationEnd(6, '', '/v1/workspace/facility/facility-a/data/meters'));
    expect(service.accountDataReturnRoute('account-a')).toEqual(service.accountPortfolioRoute('account-a', 'meters'));
  });

  it('keeps Predictor origins, picker destinations and standard/weather depth transitions', async () => {
    router.events.next(new NavigationEnd(1, '', '/v1/workspace/account/account-a/data/portfolio/predictors'));
    await service.setFacility('facility-b');
    expect(router.navigate).toHaveBeenLastCalledWith(service.accountPortfolioRoute('account-a', 'predictors'), { queryParams: { facility: 'facility-b' } });
    router.events.next(new NavigationEnd(2, '', '/v1/workspace/facility/facility-a/data/predictors'));
    expect(service.routeMotion()).toBe('drill-in');
    router.events.next(new NavigationEnd(3, '', '/v1/workspace/facility/facility-a/data/predictors/weather/new'));
    expect(service.routeMotion()).toBe('drill-in');
    router.events.next(new NavigationEnd(4, '', '/v1/workspace/facility/facility-a/data/predictors/weather/station%3AKORD/setup'));
    expect(service.routeMotion()).toBe('peer');
    router.events.next(new NavigationEnd(5, '', '/v1/workspace/facility/facility-b/data/predictors'));
    expect(service.routeMotion()).toBe('peer'); expect(service.accountDataReturnRoute('account-a')).toEqual(service.accountPortfolioRoute('account-a', 'predictors'));
    router.events.next(new NavigationEnd(6, '', '/v1/workspace/account/account-a/data/portfolio/predictors'));
    expect(service.routeMotion()).toBe('drill-out');
  });

  it('does not select a facility before navigation commits, and leaves the journey untouched on cancellation', async () => {
    router.events.next(new NavigationEnd(1, '', '/v1/workspace/account/account-a/data/portfolio/meters'));
    const unsaved = TestBed.inject(UnsavedChangesService); vi.spyOn(unsaved, 'confirmDiscard').mockReturnValue(false);
    await service.setFacility('facility-b');
    expect(router.navigate).not.toHaveBeenCalled(); expect(workspaceService.selectFacility).not.toHaveBeenCalled();
    expect(service.contextMode()).toBe('account');
  });

  it('tracks the active portfolio destination without changing existing route detail', () => {
    const url = '/v1/workspace/account/account-a/data/portfolio/predictors';
    router.events.next(new NavigationEnd(1, url, url));
    expect(service.activeDetail()).toBe('portfolio');
    expect(service.activePortfolioTab()).toBe('predictors');
    expect(parseWorkspaceRoute('/v1/workspace/account/account-a/data/portfolio').portfolioTab).toBe('facilities');
  });

  it('enables Reports and retains its dashboard on context and facility switches', async () => {
    expect(service.sections().find(section => section.id === 'reports')?.enabled).toBe(true);
    await service.openSection('reports');
    expect(router.navigate).toHaveBeenLastCalledWith(service.accountReportsRoute('account-a'), { queryParams: {} });
    router.events.next(new NavigationEnd(1, '', '/v1/workspace/facility/facility-a/reports/workbench/report-a/setup'));
    expect(service.activeReportGuid()).toBe('report-a');
    expect(service.routeState().reportStage).toBe('setup');
    expect(parseWorkspaceRoute('/v1/workspace/facility/facility-a/reports/workbench/report-a/data-checks').reportStage).toBe('data-checks');
    expect(parseWorkspaceRoute('/v1/workspace/facility/facility-a/reports/workbench/report-a/report').reportStage).toBe('report');
    await service.setContext('account');
    expect(router.navigate).toHaveBeenLastCalledWith(service.accountReportsRoute('account-a'));
    await service.setFacility('facility-b');
    expect(router.navigate).toHaveBeenLastCalledWith(service.accountReportsRoute('account-a'), { queryParams: { facility: 'facility-b' } });
    await service.openSection('reports');
    expect(router.navigate).toHaveBeenLastCalledWith(service.accountReportsRoute('account-a'), { queryParams: { facility: 'facility-a' } });
    expect(parseWorkspaceRoute('/v1/workspace/facility/facility-a/reports').detail).toBe('dashboard');
  });

  it('parses account report links and applies report-specific drill-in, return, peer and stage motion', () => {
    router.events.next(new NavigationEnd(1, '', '/v1/workspace/account/account-a/reports/dashboard'));
    router.events.next(new NavigationEnd(2, '', '/v1/workspace/account/account-a/reports/workbench/report-a/setup'));
    expect(service.activeReportGuid()).toBe('report-a'); expect(service.routeMotion()).toBe('drill-in');
    expect(service.accountReportWorkbenchRoute('account-a', 'report-a')).toEqual(['/v1', 'workspace', 'account', 'account-a', 'reports', 'workbench', 'report-a', 'setup']);
    router.events.next(new NavigationEnd(3, '', '/v1/workspace/account/account-a/reports/workbench/report-b/setup'));
    expect(service.routeMotion()).toBe('peer');
    router.events.next(new NavigationEnd(4, '', '/v1/workspace/account/account-a/reports/dashboard'));
    expect(service.routeMotion()).toBe('drill-out');
    router.events.next(new NavigationEnd(5, '', '/v1/workspace/facility/facility-a/reports/dashboard'));
    expect(service.routeMotion()).toBe('drill-in');
    router.events.next(new NavigationEnd(6, '', '/v1/workspace/facility/facility-a/reports/workbench/report-a/setup'));
    expect(service.routeMotion()).toBe('drill-in');
    router.events.next(new NavigationEnd(7, '', '/v1/workspace/facility/facility-a/reports/workbench/report-a/report'));
    expect(service.routeMotion()).toBe('none');
  });

  it.each(['setup', 'data-checks', 'report'] as const)('parses and builds the account report %s stage', stage => {
    const route = service.accountReportWorkbenchRoute('account-a', 'report-a', stage);
    expect(route[route.length - 1]).toBe(stage);
    expect(parseWorkspaceRoute(route.join('/')).reportStage).toBe(stage);
  });

  it('lets report route guards finish edits before changing the selected facility', async () => {
    router.events.next(new NavigationEnd(1, '', '/v1/workspace/facility/facility-a/reports/workbench/report-a/setup'));
    const confirmDiscard = vi.spyOn(TestBed.inject(UnsavedChangesService), 'confirmDiscard').mockReturnValue(false);
    await service.setFacility('facility-b');
    expect(router.navigate).toHaveBeenCalledWith(service.accountReportsRoute('account-a'), { queryParams: { facility: 'facility-b' } });
    expect(workspaceService.selectFacility).not.toHaveBeenCalled();
    expect(confirmDiscard).not.toHaveBeenCalled();
  });

  it('rejects unknown facilities and reports navigation failures when leaving a report workbench', async () => {
    router.events.next(new NavigationEnd(1, '', '/v1/workspace/facility/facility-a/reports/workbench/report-a/setup'));
    await service.setFacility('missing-facility');
    expect(router.navigate).not.toHaveBeenCalled();
    router.navigate.mockRejectedValueOnce(new Error('Navigation failed'));
    await service.setFacility('facility-b');
    await Promise.resolve();
    expect(service.contextNavigationError()).toContain('retained');
    expect(workspaceService.selectFacility).not.toHaveBeenCalled();
    await service.setFacility('facility-b');
    expect(service.contextNavigationError()).toBe('');
  });

  it('flushes report edits before account selection and retains a failed draft in its current account', async () => {
    router.events.next(new NavigationEnd(1, '', '/v1/workspace/facility/facility-a/reports/workbench/report-a/setup'));
    const flush = vi.fn().mockResolvedValue(false);
    const unregister = TestBed.inject(UnsavedChangesService).register(() => true, vi.fn(), () => false, flush);
    await service.openWorkspace('account-b');
    expect(flush).toHaveBeenCalledTimes(1);
    expect(workspaceService.selectAccount).not.toHaveBeenCalled();
    unregister();
    let dirty = true;
    TestBed.inject(UnsavedChangesService).register(() => dirty, vi.fn(), () => false, async () => { dirty = false; return true; });
    await service.openWorkspace('account-b');
    expect(workspaceService.selectAccount).toHaveBeenCalledWith('account-b');
  });

  it('exposes the active uploaded file and workflow step from the route', () => {
    router.events.next(new NavigationEnd(
      1,
      '/v1/workspace/account/account-a/imports/file/draft%201/meter-readings',
      '/v1/workspace/account/account-a/imports/file/draft%201/meter-readings'
    ));

    expect(service.activeSection()).toBe('imports');
    expect(service.activeDetail()).toBe('file');
    expect(service.activeImportFileId()).toBe('draft 1');
    expect(service.activeImportStep()).toBe('meter-readings');
  });

  it('limits Data support findings and results to data while retaining analysis/report issues in other sections', () => {
    const status = TestBed.inject(WorkspaceStatusService);
    const items = presentFindings([
      makeFinding('meter.currency.stale', 'warning', 'currency', { kind: 'meter', guid: 'm', name: 'Meter', accountGuid: 'account-a', facilityGuid: 'facility-a' }),
      makeFinding('analysis.configuration.invalid', 'error', 'configuration', { kind: 'facility-analysis', guid: 'a', name: 'Analysis', accountGuid: 'account-a', facilityGuid: 'facility-a' }),
      makeFinding('report.analysis.warning', 'warning', 'readiness', { kind: 'facility-report', guid: 'r', name: 'Report', accountGuid: 'account-a', facilityGuid: 'facility-a' })
    ]);
    const dataItem = items.find(item => item.entity.kind === 'meter')!;
    for (const source of [status.accountTodos, status.selectedFacilityTodos, status.accountDiscardedWarnings, status.selectedFacilityDiscardedWarnings, status.discardedItems]) {
      vi.mocked(source).mockReturnValue(items);
    }
    for (const url of ['/v1/workspace/account/account-a/data/portfolio/facilities', '/v1/workspace/facility/facility-a/data/meters']) {
      router.events.next(new NavigationEnd(1, '', url));
      expect(service.panelContent().todos).toEqual([dataItem]);
      expect(service.panelContent().discardedWarnings).toEqual([dataItem]);
      expect(service.panelContent().results.map(result => result.label)).toEqual(['Facilities', 'Meters', 'Predictors']);
    }
    router.events.next(new NavigationEnd(2, '', '/v1/workspace/account/account-a/analysis/dashboard'));
    expect(service.panelContent().todos).toEqual(items);
    expect(service.panelContent().discardedWarnings).toEqual(items);
    expect(service.panelContent().results.map(result => result.label)).toContain('Analyses');
  });

  it('keeps support panel tab changes in shell state instead of navigating', () => {
    service.isSupportPanelOpen.set(false);

    service.setPanelTab('results');

    expect(service.activePanelTab()).toBe('results');
    expect(service.isSupportPanelOpen()).toBe(true);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('opens accounts on the canonical workspace route', async () => {
    await service.openAccount('account-a');

    expect(workspaceService.selectAccount).toHaveBeenCalledWith('account-a');
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'home',
      'overview'
    ]);
  });

  it('does not switch accounts when discarding registered changes is declined', async () => {
    TestBed.inject(UnsavedChangesService).register(() => true, vi.fn());
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await service.openWorkspace('account-b');

    expect(workspaceService.selectAccount).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('opens valid single-site accounts on the sole facility workspace route', async () => {
    accountSignal.set({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    facilitiesSignal.set([{ guid: 'facility-a', name: 'Site A', accountId: 'account-a' }]);

    await service.openWorkspace('account-a');

    expect(workspaceService.selectAccount).toHaveBeenCalledWith('account-a');
    expect(workspaceService.selectFacility).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'home',
      'overview'
    ]);
  });

  it('keeps portfolio and invalid single-site accounts on account workspace routes', async () => {
    await service.openWorkspace('account-a');
    expect(router.navigate).toHaveBeenLastCalledWith([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'home',
      'overview'
    ]);

    router.navigate.mockClear();
    accountSignal.set({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    facilitiesSignal.set([]);

    await service.openWorkspace('account-a');

    expect(workspaceService.selectFacility).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenLastCalledWith([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'home',
      'overview'
    ]);
    expect(service.hasSingleSiteRecovery()).toBe(true);

    router.navigate.mockClear();
    facilitiesSignal.set([
      { guid: 'facility-a', name: 'Facility A', accountId: 'account-a' },
      { guid: 'facility-b', name: 'Facility B', accountId: 'account-a' }
    ]);

    await service.openWorkspace('account-a');

    expect(router.navigate).toHaveBeenLastCalledWith([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'home',
      'overview'
    ]);
    expect(service.singleSiteWorkspaceState()).toBe('multiple-facilities');
  });

  it('does not substitute a remembered or first facility when a single-site account requires recovery', async () => {
    accountSignal.set({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    for (const facilities of [[], [
      { guid: 'facility-a', name: 'Facility A', accountId: 'account-a' },
      { guid: 'facility-b', name: 'Facility B', accountId: 'account-a' }
    ]]) {
      facilitiesSignal.set(facilities); router.navigate.mockClear();
      expect(await service.setContext('facility')).toBe(false);
      expect(router.navigate).not.toHaveBeenCalled();
      expect(workspaceService.selectFacility).not.toHaveBeenCalled();
    }
    router.events.next(new NavigationEnd(1, '', '/v1/workspace/facility/facility-b/settings/profile'));
    expect(await service.setContext('facility')).toBe(true);
    expect(router.navigate).toHaveBeenLastCalledWith(service.facilitySettingsRoute('facility-b', 'profile'));
  });

  it('opens facilities on the canonical workspace route after selecting the facility', async () => {
    await service.openFacility('facility-a');

    expect(workspaceService.selectFacility).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'home',
      'overview'
    ]);
  });

  it('opens account data after selecting the account', async () => {
    await service.openAccountData('account-a');

    expect(workspaceService.selectAccount).toHaveBeenCalledWith('account-a');
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'data',
      'portfolio'
    ]);
  });

  it('opens imports from account and facility context', async () => {
    await service.openSection('imports');
    expect(router.navigate).toHaveBeenLastCalledWith(
      ['/v1', 'workspace', 'account', 'account-a', 'imports', 'upload'],
      { queryParams: {} }
    );

    router.events.next(new NavigationEnd(
      2,
      '/v1/workspace/facility/facility-a/data/meters',
      '/v1/workspace/facility/facility-a/data/meters'
    ));
    await service.openSection('imports');
    expect(router.navigate).toHaveBeenLastCalledWith(
      ['/v1', 'workspace', 'account', 'account-a', 'imports', 'upload'],
      { queryParams: { facilityGuid: 'facility-a' } }
    );
  });

  it('opens and parses Analysis routes in account and facility contexts', async () => {
    await service.openSection('analysis');
    expect(router.navigate).toHaveBeenLastCalledWith([
      '/v1', 'workspace', 'account', 'account-a', 'analysis', 'dashboard'
    ], { queryParams: {} });

    router.events.next(new NavigationEnd(
      2,
      '/v1/workspace/facility/facility-a/analysis/workbench/analysis%20a/setup',
      '/v1/workspace/facility/facility-a/analysis/workbench/analysis%20a/setup'
    ));
    expect(service.activeSection()).toBe('analysis');
    expect(service.activeDetail()).toBe('workbench');
    expect(service.activeAnalysisGuid()).toBe('analysis a');
    expect(service.activeAnalysisStageScope()).toBe('analysis');
    expect(service.activeAnalysisGroupGuid()).toBeUndefined();
    expect(service.sections().find(section => section.id === 'analysis')?.enabled).toBe(true);

    router.events.next(new NavigationEnd(
      3,
      '/v1/workspace/facility/facility-a/analysis/workbench/analysis%20a/group/group%20a/monthly-table',
      '/v1/workspace/facility/facility-a/analysis/workbench/analysis%20a/group/group%20a/monthly-table'
    ));
    expect(service.activeAnalysisStageScope()).toBe('group');
    expect(service.activeAnalysisGroupGuid()).toBe('group a');

    await service.openSection('analysis');
    expect(router.navigate).toHaveBeenLastCalledWith([
      '/v1', 'workspace', 'account', 'account-a', 'analysis', 'dashboard'
    ], { queryParams: { facility: 'facility-a' } });
  });

  it('parses account and facility settings routes and enables settings in workspace context', () => {
    router.events.next(new NavigationEnd(
      1,
      '/v1/workspace/account/account-a/settings/financial',
      '/v1/workspace/account/account-a/settings/financial'
    ));

    expect(service.activeSection()).toBe('settings');
    expect(service.activeDetail()).toBe('financial');
    expect(service.sections().find(section => section.id === 'settings')?.enabled).toBe(true);

    router.events.next(new NavigationEnd(
      2,
      '/v1/workspace/facility/facility-a/settings/units',
      '/v1/workspace/facility/facility-a/settings/units'
    ));

    expect(service.activeSection()).toBe('settings');
    expect(service.activeDetail()).toBe('units');
    expect(service.sections().find(section => section.id === 'settings')?.enabled).toBe(true);
  });

  it('parses account and facility data routes and enables data in workspace context', () => {
    router.events.next(new NavigationEnd(
      1,
      '/v1/workspace/account/account-a/data/portfolio',
      '/v1/workspace/account/account-a/data/portfolio'
    ));

    expect(service.activeSection()).toBe('data');
    expect(service.activeDetail()).toBe('portfolio');
    expect(service.sections().find(section => section.id === 'data')?.enabled).toBe(true);

    router.events.next(new NavigationEnd(
      2,
      '/v1/workspace/facility/facility-a/data',
      '/v1/workspace/facility/facility-a/data'
    ));

    expect(service.activeSection()).toBe('data');
    expect(service.activeDetail()).toBe('meters');

    router.events.next(new NavigationEnd(
      3,
      '/v1/workspace/facility/facility-a/data/meters/meter-a/readings',
      '/v1/workspace/facility/facility-a/data/meters/meter-a/readings'
    ));

    expect(service.activeSection()).toBe('data');
    expect(service.activeDetail()).toBe('meters');
    expect(service.activeMeterGuid()).toBe('meter-a');

    router.events.next(new NavigationEnd(
      4,
      '/v1/workspace/facility/facility-a/data/meters',
      '/v1/workspace/facility/facility-a/data/meters'
    ));

    expect(service.activeSection()).toBe('data');
    expect(service.activeDetail()).toBe('meters');
    expect(service.activeMeterGuid()).toBeUndefined();

    router.events.next(new NavigationEnd(
      5,
      '/v1/workspace/facility/facility-a/data/meter-grouping/group-a/monthly-table',
      '/v1/workspace/facility/facility-a/data/meter-grouping/group-a/monthly-table'
    ));

    expect(service.activeSection()).toBe('data');
    expect(service.activeDetail()).toBe('meter-grouping');
    expect(service.activeMeterGuid()).toBeUndefined();
    expect(service.activeMeterGroupGuid()).toBe('group-a');

    router.events.next(new NavigationEnd(
      6,
      '/v1/workspace/facility/facility-a/data/meter-grouping',
      '/v1/workspace/facility/facility-a/data/meter-grouping'
    ));

    expect(service.activeSection()).toBe('data');
    expect(service.activeDetail()).toBe('meter-grouping');
    expect(service.activeMeterGuid()).toBeUndefined();
    expect(service.activeMeterGroupGuid()).toBeUndefined();

    router.events.next(new NavigationEnd(
      7,
      '/v1/workspace/facility/facility-a/data/predictors/predictor%20a/quality',
      '/v1/workspace/facility/facility-a/data/predictors/predictor%20a/quality'
    ));

    expect(service.activeDetail()).toBe('predictors');
    expect(service.activePredictorGuid()).toBe('predictor a');
    expect(service.activeWeatherPredictorGroupKey()).toBeUndefined();
    expect(service.activeMeterGuid()).toBeUndefined();

    router.events.next(new NavigationEnd(
      8,
      '/v1/workspace/facility/facility-a/data/predictors/weather/station%3AKORD/readings',
      '/v1/workspace/facility/facility-a/data/predictors/weather/station%3AKORD/readings'
    ));

    expect(service.activeDetail()).toBe('predictors');
    expect(service.activePredictorGuid()).toBeUndefined();
    expect(service.activeWeatherPredictorGroupKey()).toBe('station:KORD');

    router.events.next(new NavigationEnd(
      9,
      '/v1/workspace/facility/facility-a/data/predictors',
      '/v1/workspace/facility/facility-a/data/predictors'
    ));

    expect(service.activePredictorGuid()).toBeUndefined();
    expect(service.activeWeatherPredictorGroupKey()).toBeUndefined();
  });

  it('shows separate support panel help for Meters and Meter Grouping', () => {
    router.events.next(new NavigationEnd(
      1,
      '/v1/workspace/facility/facility-a/data/meters',
      '/v1/workspace/facility/facility-a/data/meters'
    ));

    expect(service.panelContent().help).toContain(
      'Use Meters to search facility meters and compare their available monthly energy, water, and cost data.'
    );
    expect(service.panelContent().help.join(' ')).not.toContain('Switch to Grouping view');

    router.events.next(new NavigationEnd(
      2,
      '/v1/workspace/facility/facility-a/data/meter-grouping',
      '/v1/workspace/facility/facility-a/data/meter-grouping'
    ));

    expect(service.panelContent().help).toContain(
      'Use Meter Grouping to manage groups, drag meter cards between group sections, or use Move meter for keyboard-friendly reassignment.'
    );
  });

  it('opens settings from the active workspace context', async () => {
    await service.openSection('settings');

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'settings',
      'profile'
    ]);

    router.navigate.mockClear();
    router.events.next(new NavigationEnd(
      1,
      '/v1/workspace/facility/facility-a/home/overview',
      '/v1/workspace/facility/facility-a/home/overview'
    ));

    await service.openSection('settings');

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'settings',
      'profile'
    ]);
  });

  it('opens data from the active workspace context', async () => {
    await service.openSection('data');

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'data',
      'portfolio'
    ], { queryParams: {} });

    router.navigate.mockClear();
    router.events.next(new NavigationEnd(
      1,
      '/v1/workspace/facility/facility-a/home/overview',
      '/v1/workspace/facility/facility-a/home/overview'
    ));

    await service.openSection('data');

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'data',
      'portfolio',
      'meters'
    ], { queryParams: { facility: 'facility-a' } });
  });

  it('keeps the active rail section when toggling between account and facility contexts', async () => {
    router.events.next(new NavigationEnd(
      1,
      '/v1/workspace/account/account-a/data/portfolio',
      '/v1/workspace/account/account-a/data/portfolio'
    ));

    await service.setContext('facility');

    expect(router.navigate).toHaveBeenCalledWith(service.accountPortfolioRoute('account-a', 'meters'), { queryParams: { facility: 'facility-a' } });

    router.navigate.mockClear();
    router.events.next(new NavigationEnd(
      2,
      '/v1/workspace/facility/facility-a/data/energy-uses',
      '/v1/workspace/facility/facility-a/data/energy-uses'
    ));

    await service.setContext('account');

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'data',
      'portfolio'
    ]);

    router.navigate.mockClear();
    router.events.next(new NavigationEnd(
      3,
      '/v1/workspace/facility/facility-a/settings/financial',
      '/v1/workspace/facility/facility-a/settings/financial'
    ));

    await service.setContext('account');

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'settings',
      'financial'
    ]);
  });

  it('keeps custom database details when moving them into facility context', async () => {
    router.events.next(new NavigationEnd(
      1,
      '/v1/workspace/account/account-a/data/custom-fuels',
      '/v1/workspace/account/account-a/data/custom-fuels'
    ));

    await service.setContext('facility');

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'custom-fuels'
    ]);
  });

  it('preserves the active facility while a registered editor is saving', async () => {
    TestBed.inject(UnsavedChangesService).register(() => true, vi.fn(), () => true);
    const confirm = vi.spyOn(window, 'confirm');

    await service.setFacility('facility-b');

    expect(workspaceService.selectFacility).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('keeps the active facility rail route when switching facilities', async () => {
    router.events.next(new NavigationEnd(
      1,
      '/v1/workspace/facility/facility-a/data/predictors',
      '/v1/workspace/facility/facility-a/data/predictors'
    ));

    await service.setFacility('facility-b');

    expect(workspaceService.selectFacility).not.toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'data',
      'portfolio',
      'predictors'
    ], { queryParams: { facility: 'facility-b' } });

    router.navigate.mockClear();
    router.events.next(new NavigationEnd(
      2,
      '/v1/workspace/facility/facility-b/data/meter-grouping',
      '/v1/workspace/facility/facility-b/data/meter-grouping'
    ));

    await service.setFacility('facility-a');

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'data',
      'meter-grouping'
    ], { queryParams: {} });

    router.navigate.mockClear();
    router.events.next(new NavigationEnd(
      3,
      '/v1/workspace/facility/facility-b/settings/staleness',
      '/v1/workspace/facility/facility-b/settings/data-validation'
    ));

    await service.setFacility('facility-a');

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'settings',
      'data-validation'
    ], { queryParams: {} });
  });


});
