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
    workspaceStore = {
      account: vi.fn(() => ({ guid: 'account-a', name: 'Account A' })),
      facilities: vi.fn(() => [{ guid: 'facility-a', name: 'Facility A' }]),
      selectedFacility: vi.fn(() => ({ guid: 'facility-a', name: 'Facility A' })),
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
        { provide: ApplicationLifecycleService, useValue: { usableAccounts: vi.fn(() => []) } },
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

  it('parses account settings routes and enables settings only for account context', () => {
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
      '/v1/workspace/facility/facility-a/home/overview',
      '/v1/workspace/facility/facility-a/home/overview'
    ));

    expect(service.activeSection()).toBe('home');
    expect(service.sections().find(section => section.id === 'settings')?.enabled).toBe(false);
  });

  it('opens account settings from the account section rail only', () => {
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

    expect(router.navigate).not.toHaveBeenCalled();
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
