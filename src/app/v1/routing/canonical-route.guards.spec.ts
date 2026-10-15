import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SingleFacilityAnalysisPairService } from '@app/v1/facility/analysis/single-facility-analysis-pair.service';
import {
  accountHomeCommands,
  accountHomeCanonicalGuard,
  facilityHomeCommands,
  facilityHomeCanonicalGuard,
  singleSiteAccountRedirectGuard,
  singleSiteRedirectCommands
} from './canonical-route.guards';

describe('v1 canonical route guards', () => {
  let router: { createUrlTree: ReturnType<typeof vi.fn> };
  let workspace: {
    account: ReturnType<typeof vi.fn>;
    facilities: ReturnType<typeof vi.fn>;
    accountAnalyses: ReturnType<typeof vi.fn>;
  };
  const ensurePairs = vi.fn(async () => false);

  beforeEach(() => {
    ensurePairs.mockClear();
    router = { createUrlTree: vi.fn(commands => ({ commands })) };
    workspace = {
      account: vi.fn(() => ({ guid: 'account-a', name: 'Account A' })),
      facilities: vi.fn(() => []),
      accountAnalyses: vi.fn(() => [])
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AccountWorkspaceStore, useValue: workspace },
        { provide: SingleFacilityAnalysisPairService, useValue: { ensurePairs } }
      ]
    });
  });

  it('allows canonical account and facility home routes', () => {
    expect(invoke(accountHomeCanonicalGuard, route({ detail: 'overview' }, route({ accountGuid: 'account-a' }))))
      .toBe(true);
    expect(invoke(facilityHomeCanonicalGuard, route({ detail: 'overview' }, route({ facilityGuid: 'facility-a' }))))
      .toBe(true);
  });

  it('redirects invalid account and facility home routes to canonical defaults', () => {
    expect(invoke(accountHomeCanonicalGuard, route({ detail: 'todo-list' }, route({ accountGuid: 'account-a' }))))
      .toEqual({ commands: accountHomeCommands('account-a') });
    expect(invoke(facilityHomeCanonicalGuard, route({ detail: 'unknown' }, route({ facilityGuid: 'facility-a' }))))
      .toEqual({ commands: facilityHomeCommands('facility-a') });
  });

  it('allows single-facility Account Reports without reconciling analysis pairs', async () => {
    workspace.account.mockReturnValue({ guid: 'account-a', isSingleFacilityCompany: true });
    workspace.facilities.mockReturnValue([{ guid: 'facility-a', accountId: 'account-a' }]);
    await expect(invoke(singleSiteAccountRedirectGuard, route({ accountGuid: 'account-a' }),
      { url: '/v1/workspace/account/account-a/reports/dashboard' })).resolves.toBe(true);
    expect(ensurePairs).not.toHaveBeenCalled();
  });

  it('redirects valid single-site account routes to the sole facility route', async () => {
    workspace.account.mockReturnValue({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    workspace.facilities.mockReturnValue([{ guid: 'facility-a', name: 'Site A', accountId: 'account-a' }]);

    await expect(invoke(
      singleSiteAccountRedirectGuard,
      route({ accountGuid: 'account-a' }),
      { url: '/v1/workspace/account/account-a/settings/financial' }
    )).resolves.toEqual({ commands: ['/v1', 'workspace', 'facility', 'facility-a', 'settings', 'financial'] });

    expect(singleSiteRedirectCommands(
      { url: '/v1/workspace/account/account-a/home/overview' } as any,
      'facility-a'
    )).toEqual(['/v1', 'workspace', 'facility', 'facility-a', 'home', 'overview']);
  });

  it('redirects single-site custom database routes into the sole facility context', async () => {
    workspace.account.mockReturnValue({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    workspace.facilities.mockReturnValue([{ guid: 'facility-a', name: 'Site A', accountId: 'account-a' }]);

    await expect(invoke(
      singleSiteAccountRedirectGuard,
      route({ accountGuid: 'account-a' }),
      { url: '/v1/workspace/account/account-a/data/custom-fuels' }
    )).resolves.toEqual({ commands: ['/v1', 'workspace', 'facility', 'facility-a', 'data', 'custom-fuels'] });

    expect(singleSiteRedirectCommands(
      { url: '/v1/workspace/account/account-a/data/custom-grid-factors' } as any,
      'facility-a'
    )).toEqual(['/v1', 'workspace', 'facility', 'facility-a', 'data', 'custom-grid-factors']);
  });

  it('keeps explicit account portfolio routes reachable for valid single-site accounts', async () => {
    workspace.account.mockReturnValue({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    workspace.facilities.mockReturnValue([{ guid: 'facility-a', name: 'Site A', accountId: 'account-a' }]);

    await expect(invoke(
      singleSiteAccountRedirectGuard,
      route({ accountGuid: 'account-a' }),
      { url: '/v1/workspace/account/account-a/data/portfolio' }
    )).resolves.toBe(true);
    expect(ensurePairs).toHaveBeenCalledOnce();
  });

  it('does not redirect portfolio or invalid single-site account states', async () => {
    await expect(invoke(
      singleSiteAccountRedirectGuard,
      route({ accountGuid: 'account-a' }),
      { url: '/v1/workspace/account/account-a/home/overview' }
    )).resolves.toBe(true);

    workspace.account.mockReturnValue({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    workspace.facilities.mockReturnValue([
      { guid: 'facility-a', name: 'Facility A', accountId: 'account-a' },
      { guid: 'facility-b', name: 'Facility B', accountId: 'account-a' }
    ]);

    await expect(invoke(
      singleSiteAccountRedirectGuard,
      route({ accountGuid: 'account-a' }),
      { url: '/v1/workspace/account/account-a/home/overview' }
    )).resolves.toBe(true);
  });

  it('bypasses account analysis and preserves the corresponding facility result view', () => {
    const pair = {
      guid: 'account-analysis-a',
      facilityAnalysisItems: [{ facilityId: 'facility-a', analysisItemId: 'facility-analysis-a' }]
    } as any;

    expect(singleSiteRedirectCommands(
      { url: '/v1/workspace/account/account-a/analysis/dashboard' } as any,
      'facility-a',
      [pair]
    )).toEqual(['/v1', 'workspace', 'facility', 'facility-a', 'analysis', 'dashboard']);
    expect(singleSiteRedirectCommands(
      { url: '/v1/workspace/account/account-a/analysis/workbench/account-analysis-a/results/monthly-table' } as any,
      'facility-a',
      [pair]
    )).toEqual([
      '/v1', 'workspace', 'facility', 'facility-a', 'analysis', 'workbench',
      'facility-analysis-a', 'facility', 'monthly-table'
    ]);
  });
});

function invoke(guard: Function, snapshot: ActivatedRouteSnapshot, state: { url?: string } = {}): any {
  const injector = TestBed.inject(EnvironmentInjector);
  return runInInjectionContext(injector, () => guard(snapshot, state));
}

function route(parameters: Record<string, string> = {}, parent?: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  return {
    paramMap: convertToParamMap(parameters),
    parent: parent ?? null
  } as ActivatedRouteSnapshot;
}
