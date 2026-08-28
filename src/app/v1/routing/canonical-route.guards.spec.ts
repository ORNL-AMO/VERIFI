import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
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
  let workspace: { account: ReturnType<typeof vi.fn>; facilities: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { createUrlTree: vi.fn(commands => ({ commands })) };
    workspace = {
      account: vi.fn(() => ({ guid: 'account-a', name: 'Account A' })),
      facilities: vi.fn(() => [])
    };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: AccountWorkspaceStore, useValue: workspace }
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

  it('redirects valid single-site account routes to the sole facility route', () => {
    workspace.account.mockReturnValue({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    workspace.facilities.mockReturnValue([{ guid: 'facility-a', name: 'Site A', accountId: 'account-a' }]);

    expect(invoke(
      singleSiteAccountRedirectGuard,
      route({ accountGuid: 'account-a' }),
      { url: '/v1/workspace/account/account-a/settings/financial' }
    )).toEqual({ commands: ['/v1', 'workspace', 'facility', 'facility-a', 'settings', 'financial'] });

    expect(singleSiteRedirectCommands(
      { url: '/v1/workspace/account/account-a/home/overview' } as any,
      'facility-a'
    )).toEqual(['/v1', 'workspace', 'facility', 'facility-a', 'home', 'overview']);
  });

  it('does not redirect portfolio or invalid single-site account states', () => {
    expect(invoke(
      singleSiteAccountRedirectGuard,
      route({ accountGuid: 'account-a' }),
      { url: '/v1/workspace/account/account-a/home/overview' }
    )).toBe(true);

    workspace.account.mockReturnValue({ guid: 'account-a', name: 'Account A', isSingleFacilityCompany: true });
    workspace.facilities.mockReturnValue([
      { guid: 'facility-a', name: 'Facility A', accountId: 'account-a' },
      { guid: 'facility-b', name: 'Facility B', accountId: 'account-a' }
    ]);

    expect(invoke(
      singleSiteAccountRedirectGuard,
      route({ accountGuid: 'account-a' }),
      { url: '/v1/workspace/account/account-a/home/overview' }
    )).toBe(true);
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
