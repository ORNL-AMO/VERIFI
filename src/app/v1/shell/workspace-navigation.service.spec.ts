import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
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

    TestBed.configureTestingModule({
      providers: [
        WorkspaceNavigationService,
        { provide: Router, useValue: router },
        { provide: ApplicationLifecycleService, useValue: { usableAccounts: vi.fn(() => []) } },
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: vi.fn(() => undefined),
            facilities: vi.fn(() => []),
            selectedFacility: vi.fn(() => undefined),
            meters: vi.fn(() => []),
            facilityMeters: vi.fn(() => []),
            predictors: vi.fn(() => []),
            facilityPredictors: vi.fn(() => []),
            accountAnalyses: vi.fn(() => []),
            selectedFacilityAnalyses: vi.fn(() => []),
            accountReports: vi.fn(() => []),
            selectedFacilityReports: vi.fn(() => [])
          }
        },
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
});
