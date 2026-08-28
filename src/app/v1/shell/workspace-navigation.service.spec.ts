import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from './workspace-navigation.service';

describe('WorkspaceNavigationService', () => {
  let service: WorkspaceNavigationService;
  let router: { url: string; events: Subject<unknown>; navigate: ReturnType<typeof vi.fn> };
  let workspaceService: { selectAccount: ReturnType<typeof vi.fn>; selectFacility: ReturnType<typeof vi.fn> };
  let usableAccounts: ReturnType<typeof vi.fn>;
  let accountSignal: ReturnType<typeof signal<any>>;
  let facilitiesSignal: ReturnType<typeof signal<any[]>>;
  let selectedFacilitySignal: ReturnType<typeof signal<any>>;
  let workspaceStore: {
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
  };

  beforeEach(() => {
    router = {
      url: '/v1/workspace/account/account-a/home/overview',
      events: new Subject<unknown>(),
      navigate: vi.fn()
    };
    workspaceService = {
      selectAccount: vi.fn().mockResolvedValue('published'),
      selectFacility: vi.fn()
    };
    usableAccounts = vi.fn(() => []);
    accountSignal = signal({ guid: 'account-a', name: 'Account A' });
    facilitiesSignal = signal([{ guid: 'facility-a', name: 'Facility A' }]);
    selectedFacilitySignal = signal({ guid: 'facility-a', name: 'Facility A' });
    workspaceStore = {
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
      selectedFacilityReports: vi.fn(() => [])
    };

    TestBed.configureTestingModule({
      providers: [
        WorkspaceNavigationService,
        { provide: Router, useValue: router },
        { provide: ApplicationLifecycleService, useValue: { usableAccounts } },
        { provide: AccountWorkspaceStore, useValue: workspaceStore },
        { provide: AccountWorkspaceService, useValue: workspaceService }
      ]
    });
    service = TestBed.inject(WorkspaceNavigationService);
  });

  it('builds workspace routes without support panel tab state', () => {
    expect(service.accountRoute('account-a')).toEqual([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'home',
      'overview'
    ]);
    expect(service.accountSettingsRoute('account-a', 'units')).toEqual([
      '/v1',
      'workspace',
      'account',
      'account-a',
      'settings',
      'units'
    ]);
    expect(service.facilityRoute('facility-a')).toEqual([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'home',
      'overview'
    ]);
    expect(service.facilitySettingsRoute('facility-a', 'goals')).toEqual([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'settings',
      'goals'
    ]);
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

  it('opens valid single-site accounts on the sole facility workspace route', async () => {
    accountSignal.set({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    facilitiesSignal.set([{ guid: 'facility-a', name: 'Site A', accountId: 'account-a' }]);

    await service.openWorkspace('account-a');

    expect(workspaceService.selectAccount).toHaveBeenCalledWith('account-a');
    expect(workspaceService.selectFacility).toHaveBeenCalledWith('facility-a');
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

  it('exposes account dropdown options with descriptors and active state', () => {
    usableAccounts.mockReturnValue([
      { guid: 'account-a', name: 'Account A', numberOfFacilities: '2' },
      { guid: 'account-b', name: 'Account B', isSingleFacilityCompany: true },
      { guid: 'deleted-account', name: 'Deleted', deleteAccount: true }
    ]);

    expect(service.accountOptions()).toEqual([
      { guid: 'account-a', name: 'Account A', descriptor: '2 facilities', active: true },
      { guid: 'account-b', name: 'Account B', descriptor: 'Single site', active: false }
    ]);
  });

  it('opens facilities on the canonical workspace route after selecting the facility', async () => {
    await service.openFacility('facility-a');

    expect(workspaceService.selectFacility).toHaveBeenCalledWith('facility-a');
    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'home',
      'overview'
    ]);
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

  it('opens settings from the active workspace context', () => {
    service.openSection('settings');

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

    service.openSection('settings');

    expect(router.navigate).toHaveBeenCalledWith([
      '/v1',
      'workspace',
      'facility',
      'facility-a',
      'settings',
      'profile'
    ]);
  });

  it('marks route motion when entering the workspace from welcome', () => {
    router.events.next(new NavigationEnd(1, '/v1', '/v1'));

    router.events.next(new NavigationEnd(
      2,
      '/v1/workspace/account/account-a/home/overview',
      '/v1/workspace/account/account-a/home/overview'
    ));

    expect(service.routeMotion()).toBe('workspace-entry');
  });

  it('marks directional route motion when changing account and facility contexts', () => {
    router.events.next(new NavigationEnd(
      1,
      '/v1/workspace/facility/facility-a/home/overview',
      '/v1/workspace/facility/facility-a/home/overview'
    ));

    expect(service.routeMotion()).toBe('facility-drill-in');

    router.events.next(new NavigationEnd(
      2,
      '/v1/workspace/account/account-a/home/overview',
      '/v1/workspace/account/account-a/home/overview'
    ));

    expect(service.routeMotion()).toBe('account-drill-out');
  });
});
