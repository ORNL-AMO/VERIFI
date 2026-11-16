import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { SingleFacilityAnalysisPairService } from '@app/v1/analysis/single-facility-analysis-pair.service';
import {
  accountHomeCanonicalGuard,
  facilityHomeCanonicalGuard,
  singleFacilityBackupCanonicalGuard,
  singleSiteAccountRedirectGuard,
  singleSiteRedirectCommands
} from './canonical-route.guards';
import { accountRoute, facilityRoute } from './workspace-route';

describe('v1 canonical route guards', () => {
  let router: { createUrlTree: ReturnType<typeof vi.fn> };
  let workspace: {
    status: () => string;
    account: ReturnType<typeof vi.fn>;
    facilities: ReturnType<typeof vi.fn>;
    accountAnalyses: ReturnType<typeof vi.fn>;
  };
  const ensurePairs = vi.fn(async () => false);

  beforeEach(() => {
    ensurePairs.mockClear();
    router = { createUrlTree: vi.fn(commands => ({ commands })) };
    workspace = {
      status: () => 'ready',
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
      .toEqual({ commands: accountRoute('account-a') });
    expect(invoke(facilityHomeCanonicalGuard, route({ detail: 'unknown' }, route({ facilityGuid: 'facility-a' }))))
      .toEqual({ commands: facilityRoute('facility-a') });
  });

  it.each(['settings/backup', 'reports/dashboard', 'visualization/dashboard', 'visualization/workbench/visualization-a', 'imports/upload?facilityGuid=facility-a&returnUrl=%2Ffacility', 'imports/file/file-a/review'])('allows single-facility account %s without reconciling analysis pairs', async path => {
    workspace.account.mockReturnValue({ guid: 'account-a', isSingleFacilityCompany: true });
    workspace.facilities.mockReturnValue([{ guid: 'facility-a', accountId: 'account-a' }]);
    await expect(invoke(singleSiteAccountRedirectGuard, route({ accountGuid: 'account-a' }),
      { url: `/v1/workspace/account/account-a/${path}` })).resolves.toBe(true);
    expect(ensurePairs).not.toHaveBeenCalled();
  });

  it('canonicalizes sole-facility Backup once, leaving portfolio and repair entry alone', async () => {
    workspace.account.mockReturnValue({ guid: 'account-a', isSingleFacilityCompany: true });
    workspace.facilities.mockReturnValue([{ guid: 'facility-a', accountId: 'account-a' }]);
    const backup = Object.assign(route({}), { pathFromRoot: [route({ facilityGuid: 'facility-a' }), route({})] });
    expect(invoke(singleFacilityBackupCanonicalGuard, backup)).toEqual({ commands: ['/v1', 'workspace', 'account', 'account-a', 'settings', 'backup'] });
    await expect(invoke(singleSiteAccountRedirectGuard, route({ accountGuid: 'account-a' }), { url: '/v1/workspace/account/account-a/settings/backup' })).resolves.toBe(true);
    expect(ensurePairs).not.toHaveBeenCalled();
    workspace.facilities.mockReturnValue([{ guid: 'facility-a', accountId: 'account-a' }, { guid: 'facility-b', accountId: 'account-a' }]);
    expect(invoke(singleFacilityBackupCanonicalGuard, backup)).toBe(true);
    workspace.account.mockReturnValue({ guid: 'account-a', isSingleFacilityCompany: false });
    workspace.facilities.mockReturnValue([{ guid: 'facility-a', accountId: 'account-a' }]);
    expect(invoke(singleFacilityBackupCanonicalGuard, backup)).toBe(true);
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

  it.each(['data/portfolio/meters', 'data/portfolio/predictors', 'analysis/dashboard'])('keeps single-site %s on its shared inventory', async path => {
    workspace.account.mockReturnValue({ guid: 'account-a', isSingleFacilityCompany: true });
    workspace.facilities.mockReturnValue([{ guid: 'facility-a', accountId: 'account-a' }]);
    await expect(invoke(singleSiteAccountRedirectGuard, route({ accountGuid: 'account-a' }),
      { url: `/v1/workspace/account/account-a/${path}` })).resolves.toBe(true);
    expect(ensurePairs).toHaveBeenCalledOnce();
  });

  it.each(['data', 'data/portfolio', 'data/portfolio/facilities', 'data/not-supported'])('opens shared Meters for the single-site Data entry %s', async path => {
    workspace.account.mockReturnValue({ guid: 'account-a', isSingleFacilityCompany: true });
    workspace.facilities.mockReturnValue([{ guid: 'facility-a', accountId: 'account-a' }]);
    await expect(invoke(singleSiteAccountRedirectGuard, route({ accountGuid: 'account-a' }),
      { url: `/v1/workspace/account/account-a/${path}` })).resolves.toEqual({ commands: ['/v1', 'workspace', 'account', 'account-a', 'data', 'portfolio', 'meters'] });
  });

  it('keeps single-site Energy Uses on its shared inventory route', async () => {
    workspace.account.mockReturnValue({ guid: 'account-a', isSingleFacilityCompany: true });
    workspace.facilities.mockReturnValue([{ guid: 'facility-a', accountId: 'account-a' }]);
    await expect(invoke(singleSiteAccountRedirectGuard, route({ accountGuid: 'account-a' }),
      { url: '/v1/workspace/account/account-a/data/portfolio/energy-uses' })).resolves.toBe(true);
    expect(ensurePairs).not.toHaveBeenCalled();
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

  it.each([
    [false, 1], [false, 2], [true, 0], [true, 2]
  ])('preserves account Data when the single-facility flag is %s and the facility count is %s', async (singleSite, count) => {
    workspace.account.mockReturnValue({ guid: 'account-a', isSingleFacilityCompany: singleSite });
    workspace.facilities.mockReturnValue(Array.from({ length: count }, (_, index) => ({ guid: `facility-${index}`, accountId: 'account-a' })));
    await expect(invoke(singleSiteAccountRedirectGuard, route({ accountGuid: 'account-a' }),
      { url: '/v1/workspace/account/account-a/data/portfolio/meters' })).resolves.toBe(true);
    expect(ensurePairs).not.toHaveBeenCalled();
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
    )).toBeUndefined();
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
