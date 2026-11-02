import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DefaultUrlSerializer, NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import type { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { reportFixture, reportSnapshot } from '@app/v1/reports/facility/testing/report-test-fixtures';
import { WorkspaceContextService } from './workspace-context.service';

const metersUrl = '/v1/workspace/account/account-a/data/portfolio/meters';
const workbenchUrl = '/v1/workspace/facility/facility-a/data/meters/meter-a/settings';

function setup(url = metersUrl) {
  const store = new AccountWorkspaceStore();
  const base = reportSnapshot();
  const snapshot = { ...base, facilities: [base.facilities[0], { ...base.facilities[0], guid: 'facility-b', name: 'Other plant' }],
    meters: [
      { guid: 'meter-a', accountId: 'account-a', facilityId: 'facility-a' },
      { guid: 'meter-b', accountId: 'account-a', facilityId: 'facility-b' }
    ] as IdbUtilityMeter[] };
  store.publish(snapshot, { facility: snapshot.facilities[1] });
  const catalog = signal([snapshot.account]);
  const events = new Subject<unknown>();
  const serializer = new DefaultUrlSerializer();
  const router = { url, events, parseUrl: (value: string) => serializer.parse(value), navigate: vi.fn(), navigateByUrl: vi.fn() };
  TestBed.configureTestingModule({ providers: [
    { provide: Router, useValue: router }, { provide: AccountWorkspaceStore, useValue: store },
    { provide: ApplicationLifecycleService, useValue: { usableAccounts: catalog } }
  ] });
  const context = TestBed.inject(WorkspaceContextService);
  const accept = (target: string) => events.next(new NavigationEnd(1, target, target));
  return { context, store, snapshot, catalog, events, router, accept };
}

describe('WorkspaceContextService', () => {
  it('starts from direct-entry ownership and advances its URL pair only after accepted navigation', () => {
    const { context, events, accept, router } = setup(workbenchUrl);
    expect(context.currentUrl()).toBe(workbenchUrl);
    expect(context.previousUrl()).toBe(workbenchUrl);
    expect(context.headerFacility()?.guid).toBe('facility-a');
    expect(context.routeMotion()).toBe('none');
    events.next(new NavigationStart(2, metersUrl));
    events.next(new NavigationCancel(2, metersUrl, 'Editor rejected exit'));
    events.next(new NavigationError(3, metersUrl, new Error('Failed exit')));
    expect(context.currentUrl()).toBe(workbenchUrl);
    expect(context.previousUrl()).toBe(workbenchUrl);
    expect(context.headerFacility()?.guid).toBe('facility-a');
    accept(metersUrl);
    expect(context.previousUrl()).toBe(workbenchUrl);
    expect(context.currentUrl()).toBe(metersUrl);
    expect(context.routeMotion()).toBe('drill-out');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('filters committed collections by validated scope independently of remembered selection', () => {
    const { context, store, snapshot, accept, router } = setup();
    expect(store.selectedFacility()?.guid).toBe('facility-b');
    expect(context.inventoryScope()).toEqual({ kind: 'all' });
    expect(context.contextMeters().map(meter => meter.guid)).toEqual(['meter-a', 'meter-b']);
    accept(`${metersUrl}?facility=facility-a`);
    expect(context.inventoryScope()).toEqual({ kind: 'facility', facilityGuid: 'facility-a' });
    expect(context.contextMeters().map(meter => meter.guid)).toEqual(['meter-a']);
    expect(context.contextCounts().meters).toBe(1);
    store.publish({ ...snapshot, meters: snapshot.meters.filter(meter => meter.guid !== 'meter-a') });
    expect(context.contextCounts().meters).toBe(0);
    accept(`${metersUrl}?facility=foreign`);
    expect(context.inventoryScope()).toEqual({ kind: 'all' });
    expect(context.contextMeters().map(meter => meter.guid)).toEqual(['meter-b']);
    // Projection does not own the facade's URL-cleanup navigation effect.
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('defers inventory scope while unavailable or owned by a different committed account', () => {
    const { context, store, snapshot, accept } = setup(`${metersUrl}?facility=facility-a`);
    store.beginLoad(false);
    expect(context.inventoryScope()).toEqual({ kind: 'all' });
    expect(context.scopeAvailability()).toContain('Loading');
    store.publish(snapshot);
    expect(context.inventoryFacilityGuid()).toBe('facility-a');
    accept('/v1/workspace/account/account-b/data/portfolio/meters?facility=facility-a');
    expect(context.inventoryScope()).toEqual({ kind: 'all' });
  });

  it('retains implicit single-site Data scope and combined account-backed Reports', () => {
    const { context, store, snapshot, accept } = setup();
    const sole = snapshot.facilities[0];
    store.publish({ ...snapshot, account: { ...snapshot.account, isSingleFacilityCompany: true }, facilities: [sole],
      facilityReports: [reportFixture()], accountReports: snapshot.accountReports });
    expect(context.singleFacilityContext()?.guid).toBe(sole.guid);
    expect(context.inventoryFacilityGuid()).toBe(sole.guid);
    expect(context.contextCounts().meters).toBe(1);
    accept('/v1/workspace/account/account-a/reports/dashboard');
    expect(context.headerFacility()?.guid).toBe(sole.guid);
    expect(context.effectiveScope()).toEqual({ kind: 'all' });
    expect(context.contextCounts().reports).toBe(snapshot.accountReports.length + 1);
    expect(context.contextFacility()).toBeUndefined();
  });

  it('derives recovery and implicit scope from committed facilities, including first-facility repair', () => {
    const { context, store, snapshot } = setup();
    const singleAccount = { ...snapshot.account, isSingleFacilityCompany: true };
    store.publish({ ...snapshot, account: singleAccount, facilities: [] });
    expect(context.singleSiteWorkspaceState()).toBe('missing-facility');
    expect(context.singleFacilityContext()).toBeUndefined();
    store.publish({ ...snapshot, account: singleAccount, facilities: [snapshot.facilities[0]] });
    expect(context.singleSiteWorkspaceState()).toBe('valid');
    expect(context.inventoryFacilityGuid()).toBe('facility-a');
    store.publish({ ...snapshot, account: singleAccount });
    expect(context.singleSiteWorkspaceState()).toBe('multiple-facilities');
    expect(context.hasSingleSiteRecovery()).toBe(true);
    expect(context.singleFacilityContext()).toBeUndefined();
    store.publish({ ...snapshot, facilities: [snapshot.facilities[0]] });
    expect(context.isSingleSiteWorkspace()).toBe(false);
    expect(context.inventoryScope()).toEqual({ kind: 'all' });
  });

  it('keeps the account catalog display fallback separate from committed scope ownership', () => {
    const { context, catalog, snapshot } = setup('/v1/workspace/account/catalog-account/home/overview');
    catalog.set([{ ...snapshot.account, guid: 'catalog-account', name: 'Catalog name' }]);
    expect(context.account()?.name).toBe('Catalog name');
    expect(context.inventoryScope()).toEqual({ kind: 'all' });
  });

  it('releases its accepted-navigation subscription with its injector', () => {
    const { context, accept } = setup();
    TestBed.resetTestingModule();
    accept(workbenchUrl);
    expect(context.currentUrl()).toBe(metersUrl);
  });
  it.each([
    ['account/account-a/analysis/dashboard', 'facility/facility-a/analysis/dashboard', 'drill-in'],
    ['account/account-a/analysis/dashboard', 'account/account-a/analysis/workbench/account-analysis/setup', 'drill-in'],
    ['account/account-a/analysis/dashboard', 'facility/facility-a/analysis/workbench/analysis-a/setup', 'drill-in'],
    ['facility/facility-a/analysis/workbench/analysis-a/setup', 'account/account-a/analysis/dashboard', 'drill-out'],
    ['facility/facility-a/analysis/dashboard', 'facility/facility-a/analysis/workbench/analysis-a/setup', 'drill-in'],
    ['facility/facility-a/analysis/workbench/analysis-a/setup', 'facility/facility-a/analysis/dashboard', 'drill-out'],
    ['account/account-a/analysis/workbench/account-analysis/select-items', 'facility/facility-a/analysis/workbench/analysis-a/setup', 'drill-in'],
    ['facility/facility-a/analysis/workbench/analysis-a/setup', 'account/account-a/analysis/workbench/account-analysis/select-items', 'drill-out'],
    ['facility/facility-a/analysis/workbench/analysis-a/setup', 'facility/facility-a/analysis/workbench/analysis-b/setup', 'peer'],
    ['facility/facility-a/analysis/dashboard', 'facility/facility-b/analysis/dashboard', 'peer'],
    ['facility/facility-a/analysis/workbench/analysis-a/setup', 'facility/facility-a/analysis/workbench/analysis-a/facility/annual', 'none'],
    ['facility/facility-a/data/meters', 'facility/facility-a/analysis/dashboard', 'none'],
    ['account/account-a/data/portfolio/facilities', 'facility/facility-a/data/meters', 'drill-in'],
    ['account/account-a/data/portfolio/meters', 'facility/facility-a/data/meters/meter-a/settings', 'drill-in'],
    ['facility/facility-a/data/meters', 'facility/facility-a/data/meters/meter-a/settings', 'drill-in'],
    ['facility/facility-a/data/meters/meter-a/settings', 'facility/facility-a/data/meters', 'drill-out'],
    ['facility/facility-a/data/meters', 'account/account-a/data/portfolio/facilities', 'drill-out'],
    ['facility/facility-a/data/meters/meter-a/settings', 'account/account-a/data/portfolio/meters', 'drill-out'],
    ['facility/facility-a/data/meters', 'facility/facility-b/data/meters', 'peer'],
    ['facility/facility-a/data/meters/meter-a/settings', 'facility/facility-a/data/meters/meter-b/settings', 'peer'],
    ['facility/facility-a/data/meters/meter-a/settings', 'facility/facility-b/data/meters', 'peer'],
    ['facility/facility-a/data/meters/meter-a/settings', 'facility/facility-a/data/meters/meter-a/readings', 'none'],
    ['account/account-a/data/portfolio/meters', 'facility/facility-a/data/meter-grouping/group-a/monthly-table', 'drill-in'],
    ['facility/facility-a/data/meter-grouping', 'facility/facility-a/data/meter-grouping/group-a/monthly-table', 'drill-in'],
    ['facility/facility-a/data/meters', 'facility/facility-a/data/meter-grouping/group-a/monthly-table', 'drill-in'],
    ['facility/facility-a/data/meters/meter-a/settings', 'facility/facility-a/data/meter-grouping/group-a/monthly-table', 'peer'],
    ['facility/facility-a/data/meter-grouping/group-a/monthly-table', 'facility/facility-a/data/meters/meter-a/settings', 'peer'],
    ['facility/facility-a/data/meter-grouping/group-a/monthly-table', 'facility/facility-a/data/meter-grouping/group-b/monthly-table', 'peer'],
    ['facility/facility-a/data/meter-grouping/group-a/monthly-table', 'facility/facility-a/data/meter-grouping/group-a/monthly-chart', 'none'],
    ['facility/facility-a/data/meter-grouping/group-a/monthly-table', 'facility/facility-a/data/meter-grouping', 'drill-out'],
    ['facility/facility-a/data/meter-grouping/group-a/monthly-table', 'account/account-a/data/portfolio/meters', 'drill-out'],
    ['facility/facility-a/data/meter-grouping/group-a/monthly-table', 'facility/facility-b/data/meter-grouping/group-b/monthly-table', 'peer'],
    ['account/account-a/data/portfolio/facilities', 'account/account-a/data/portfolio/meters', 'none'],
    ['account/account-a/home/overview', 'facility/facility-a/home/overview', 'none'],
    ['account/account-a/data/portfolio/facilities', 'facility/facility-a/settings/profile', 'none'],
    ['account/account-a/data/portfolio/facilities', 'account/account-b/data/portfolio/facilities', 'none']
  ])('classifies %s → %s as %s', (from, to, expected) => {
    const { context, events } = setup();
    events.next(new NavigationEnd(1, `/v1/workspace/${from}`, `/v1/workspace/${from}`));
    events.next(new NavigationEnd(2, `/v1/workspace/${to}`, `/v1/workspace/${to}`));
    expect(context.routeMotion()).toBe(expected);
    expect(context.routeMotionKey()).toBe(`/v1/workspace/${to}`);
  });

  it('does not animate direct entry or welcome transitions', () => {
    const { context, events } = setup();
    events.next(new NavigationEnd(1, '/v1', '/v1'));
    events.next(new NavigationEnd(2, '/v1/workspace/facility/facility-a/data/meters', '/v1/workspace/facility/facility-a/data/meters'));
    expect(context.routeMotion()).toBe('none');
  });
});
