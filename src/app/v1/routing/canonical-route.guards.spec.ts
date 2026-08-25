import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router } from '@angular/router';
import { vi } from 'vitest';
import {
  accountHomeCommands,
  accountHomeCanonicalGuard,
  facilityHomeCommands,
  facilityHomeCanonicalGuard
} from './canonical-route.guards';

describe('v1 canonical route guards', () => {
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    router = { createUrlTree: vi.fn(commands => ({ commands })) };
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: router }]
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
});

function invoke(guard: Function, snapshot: ActivatedRouteSnapshot): any {
  const injector = TestBed.inject(EnvironmentInjector);
  return runInInjectionContext(injector, () => guard(snapshot, {}));
}

function route(parameters: Record<string, string> = {}, parent?: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  return {
    paramMap: convertToParamMap(parameters),
    parent: parent ?? null
  } as ActivatedRouteSnapshot;
}
