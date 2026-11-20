import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { getNewIdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { homeAccountOwner, homeOwnerState } from '@domain/home/testing/home-fixtures';
import { homeDefaultGuard } from './home-navigation.guards';
import { homeRecord, setupHome } from './testing/home-testing';

function enter(url: string) { return TestBed.runInInjectionContext(() => homeDefaultGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot)); }
describe('Home explicit default entry', () => {
  it('resolves default entry to an explicit identity so a later default change cannot replace an open editor', () => {
    const { store, snapshot } = setupHome();
    store.publish({ ...snapshot, homeDashboards: [homeRecord('a'), homeRecord('b')],
      homeOwners: [getNewIdbHomeOwner('account-a', homeAccountOwner, { ...homeOwnerState(['a', 'b']), defaultDashboardGuid: 'b' })] });
    const target = enter('/v1/workspace/account/account-a/home/overview');
    expect(TestBed.inject(Router).serializeUrl(target as never)).toBe('/v1/workspace/account/account-a/home/dashboard/b');
    expect(enter('/v1/workspace/account/account-a/home/dashboard/a')).toBe(true);
  });
  it('keeps empty, stale-account and invalid single-facility entries in recovery without writes', () => {
    const { store, snapshot } = setupHome();
    expect(enter('/v1/workspace/account/account-a/home/overview')).toBe(true);
    store.publish({ ...snapshot, homeDashboards: [homeRecord('a')] });
    expect(enter('/v1/workspace/account/stale/home/overview')).toBe(true);
    store.publish({ ...snapshot, account: { ...snapshot.account, isSingleFacilityCompany: true }, facilities: [] });
    expect(enter('/v1/workspace/account/account-a/home/overview')).toBe(true);
    expect(store.homeOwners()).toEqual([]);
  });
});
