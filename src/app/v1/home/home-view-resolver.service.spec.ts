import { TestBed } from '@angular/core/testing';
import { getNewIdbHomeOwner } from '@data/models/idbModels/homeOwner';
import { HomeTemplateCatalog, HOME_COMPLETE_RECIPES } from './home-template-catalog.service';
import { HomeContext } from './home-context.service';
import { homeRecord, setupHome } from './testing/home-testing';
import { homeAccountOwner, homeDefinition, homeOwnerState } from '@domain/home/testing/home-fixtures';
import { parseWorkspaceRoute } from '@app/v1/routing/workspace-route';
import { homeViewKey } from '@domain/home/home-views';

const reference = { kind: 'built-in' as const, template: 'home' as const, version: 3 };
function setup() {
  TestBed.overrideProvider(HOME_COMPLETE_RECIPES, { useValue: [{ template: 'home', label: 'Test complete', description: 'Catalog boundary fixture', complete: true,
    build: () => ({ template: 'home', version: 3, dashboard: homeDefinition(), charts: [] }) }] });
  return setupHome();
}
describe('read-only built-in Home resolution', () => {
  it('resolves a new owner and an explicit version without creating records; initialized empty and imported sets retain precedence', () => {
    const { store, snapshot, route } = setup(), home = TestBed.inject(HomeContext), before = store.snapshot();
    expect(home.selected()?.reference).toEqual(reference); expect(store.snapshot()).toBe(before);
    expect(store.homeOwners()).toEqual([]); expect(store.homeDashboards()).toEqual([]); expect(store.savedVisualizations()).toEqual([]);
    route.set(parseWorkspaceRoute('/v1/workspace/account/account-a/home/built-in/home/3'));
    expect(home.definition()?.builtIn).toEqual(reference);
    route.set(parseWorkspaceRoute('/v1/workspace/account/account-a/home/built-in/home/99')); expect(home.missing()).toBe(true);
    store.publish({ ...snapshot, homeOwners: [getNewIdbHomeOwner('account-a', homeAccountOwner, homeOwnerState())] });
    expect(home.entries()).toEqual([]);
    store.publish({ ...snapshot, homeDashboards: [homeRecord('imported')] });
    route.set(parseWorkspaceRoute('/v1/workspace/account/account-a/home/overview')); expect(home.selectedGuid()).toBe('imported');
  });
  it('uses saved customization once, preserves unavailable catalog versions, and never refills deleted built-ins', () => {
    const { store, snapshot } = setup(), home = TestBed.inject(HomeContext);
    const views = { version: 1 as const, catalog: [reference], order: [reference], default: reference, hidden: [], deleted: [] };
    const owner = getNewIdbHomeOwner('account-a', homeAccountOwner, { ...homeOwnerState(['preference']), views });
    const saved = { ...homeRecord('preference'), definition: { ...homeDefinition(), name: 'My Home', builtIn: reference } };
    store.publish({ ...snapshot, homeOwners: [owner], homeDashboards: [saved] });
    expect(home.entries()).toHaveLength(1); expect(home.selected()?.record?.guid).toBe('preference'); expect(home.selectedGuid()).toBe(homeViewKey(reference));
    store.publish({ ...snapshot, homeOwners: [{ ...owner, state: { ...homeOwnerState(), views: { ...views, deleted: [reference] } } }] });
    expect(home.entries()).toEqual([]);
    const unknown = { ...reference, version: 99 };
    store.publish({ ...snapshot, homeOwners: [{ ...owner, state: { ...homeOwnerState(), views: { ...views, catalog: [unknown], order: [unknown], default: unknown } } }] });
    expect(home.entries()).toHaveLength(1); expect(home.entries()[0].available).toBe(false); expect(home.defaultGuid()).toBeUndefined();
  });
  it('rejects saved-definition graphs as read-only defaults and binds complete builders to the requested owner', () => {
    setup(); const catalog = TestBed.inject(HomeTemplateCatalog);
    expect(catalog.buildBuiltIn(reference, 'account-a', homeAccountOwner).baseline?.builtIn).toEqual(reference);
    expect(() => catalog.buildBuiltIn({ ...reference, version: 1 }, 'account-a', homeAccountOwner)).toThrow('unavailable');
  });
});
