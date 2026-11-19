import { TestBed } from '@angular/core/testing';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { homeAccountOwner, homeOwnerState, homeDefinition, chartWidget } from '@domain/home/testing/home-fixtures';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { HomeContext } from './home-context.service';
import { homeRecord, setupHome } from './testing/home-testing';

describe('Home owner navigation', () => {
  it('uses saved default and visible order, retaining unavailable preferences without writes', () => {
    const { store, snapshot } = setupHome();
    const a = homeRecord('a'), b = homeRecord('b'), water = { ...homeRecord('water'), definition: { ...homeRecord('water').definition as object, visibility: 'water' } };
    const owner = getNewIdbHomeOwner('account-a', homeAccountOwner, { ...homeOwnerState(['water', 'b', 'a']), defaultDashboardGuid: 'missing' });
    store.publish({ ...snapshot, homeDashboards: [a, b, water], homeOwners: [owner] });
    const home = TestBed.inject(HomeContext), before = store.snapshot();
    expect(home.entries().map(item => item.record.guid)).toEqual(['b', 'a']);
    expect(home.selectedGuid()).toBe('b');
    expect(store.snapshot()).toBe(before);
  });
  it('uses owner-scoped empty water meters and account emissions visibility without exposing conditional widgets early', () => {
    const { store, snapshot, route } = setupHome();
    const record = homeRecord('facility', 'Facility', 'facility-a');
    const definition = { version: 1, name: 'Conditional', defaults: {}, visibility: 'always', widgets: [
      { id: 'water', kind: 'note', size: 'half', text: 'Water', visibility: 'water' },
      { id: 'emissions', kind: 'note', size: 'half', text: 'Emissions', visibility: 'emissions' }
    ] };
    const foreignMeter = { ...getNewIdbUtilityMeter('facility-a', 'account-a', false, 'MMBtu'), facilityId: 'other', source: 'Water Intake' as const };
    const account = { ...snapshot.account, displayEmissions: false };
    store.publish({ ...snapshot, account, homeDashboards: [{ ...record, definition }], meters: [foreignMeter] });
    route.set(parseWorkspaceRoute('/v1/workspace/facility/facility-a/home/overview'));
    const home = TestBed.inject(HomeContext); expect(home.widgets()).toEqual([]);
    store.publish({ ...snapshot, account, homeDashboards: [{ ...record, definition }], meters: [{ ...foreignMeter, facilityId: 'facility-a' }] });
    expect(home.widgets().map(widget => widget.id)).toEqual(['water']);
    expect(store.homeOwners()).toEqual([]);
  });
  it('retains missing and blocked links and never labels a coincident blocked preference as a verified default', () => {
    const { store, snapshot } = setupHome();
    const record = { ...homeRecord('a'), definition: homeDefinition([chartWidget('missing', 'missing'), chartWidget('coincident', 'blocked')]),
      preservation: { references: [{ path: 'widgets.blocked.visualizationGuid', kind: 'visualization' as const, guid: 'coincident', reason: 'not-transferred' as const }], transfers: [] } };
    const owner = { ...getNewIdbHomeOwner('account-a', homeAccountOwner, homeOwnerState(['a'])),
      preservation: { references: [{ path: 'defaultDashboardGuid', kind: 'dashboard' as const, guid: 'a', reason: 'not-transferred' as const }], transfers: [] } };
    store.publish({ ...snapshot, homeDashboards: [record], homeOwners: [owner] });
    const home = TestBed.inject(HomeContext);
    expect(home.configuredDefaultGuid()).toBeUndefined();
    expect(home.widgetShells().map(shell => shell.state)).toEqual(['missing-source', 'repair-required']);
    expect(store.homeDashboards()[0].preservation).toEqual(record.preservation);
  });
  it('keeps an initialized empty owner empty and adopts readable imported dashboards without a marker', () => {
    const { store, snapshot } = setupHome();
    store.publish({ ...snapshot, homeOwners: [getNewIdbHomeOwner('account-a', homeAccountOwner, homeOwnerState())] });
    const home = TestBed.inject(HomeContext);
    expect(home.view()?.initialization).toBe('initialized'); expect(home.selected()).toBeUndefined();
    store.publish({ ...snapshot, homeDashboards: [homeRecord('imported')] });
    expect(home.selectedGuid()).toBe('imported'); expect(store.homeOwners()).toEqual([]);
  });
  it('isolates owners, rejects foreign deep links and never uses an obsolete account route', () => {
    const { store, snapshot, route } = setupHome();
    store.publish({ ...snapshot, homeDashboards: [homeRecord('account'), homeRecord('facility', 'Facility', 'facility-a')] });
    const home = TestBed.inject(HomeContext);
    expect(home.selectedGuid()).toBe('account');
    route.set(parseWorkspaceRoute('/v1/workspace/facility/facility-a/home/overview'));
    expect(home.selectedGuid()).toBe('facility');
    route.set(parseWorkspaceRoute('/v1/workspace/facility/facility-a/home/dashboard/account'));
    expect(home.missing()).toBe(true); expect(home.selected()).toBeUndefined();
    route.set(parseWorkspaceRoute('/v1/workspace/account/old-account/home/overview'));
    expect(home.owner()).toBeUndefined(); expect(home.entries()).toEqual([]);
  });
  it('exposes the sole facility once only for a valid flagged account; invalid flags retain recovery', () => {
    const { store, snapshot } = setupHome(); const home = TestBed.inject(HomeContext);
    expect(home.owner()).toEqual(homeAccountOwner);
    store.publish({ ...snapshot, account: { ...snapshot.account, isSingleFacilityCompany: true } });
    expect(home.owner()).toEqual({ kind: 'facility', guid: 'facility-a' });
    store.publish({ ...snapshot, account: { ...snapshot.account, isSingleFacilityCompany: true }, facilities: [] });
    expect(home.owner()).toBeUndefined(); expect(store.homeOwners()).toEqual([]);
  });
});
