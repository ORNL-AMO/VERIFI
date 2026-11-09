import { SessionStorageService } from 'ngx-webstorage';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { EnergyUsesModule } from '../energy-uses.module';
import { ENERGY_USE_WORKBENCH_ROUTES } from '../energy-uses.routes';
import { energyUseGroup, energyUseItem, energyUsesSnapshot } from '../energy-uses.testing';
import { EnergyUsesWorkspaceService } from '../energy-uses-workspace.service';
import { EnergyUseWorkbenchComponent } from './energy-use-workbench.component';
import { EnergyUseSettingsComponent } from './settings/energy-use-settings.component';
import { EnergyUseSetupValues, energyUseSetup } from '../models/energy-use-setup.models';
import { EnergyUseActionsService } from '../energy-use-actions.service';
import { EnergyUseResultsService } from './results/energy-use-results.service';

@Component({ standalone: true, template: 'Inventory' })
class InventoryDestination {}

describe('energy use workbench routes', () => {
  const groupPath = (group = 'group-a', facility = 'facility-a') => `/v1/workspace/facility/${facility}/data/energy-uses/groups/${group}`;
  const path = (guid: string, group = 'group-a', facility = 'facility-a') => `${groupPath(group, facility)}/items/${guid}`;
  async function setup() {
    const singleSite = signal(false);
    const store = new AccountWorkspaceStore();
    const snapshot = energyUsesSnapshot([energyUseItem(), energyUseItem({ guid: 'energy-b', name: 'Fan B' }), energyUseItem({ guid: 'energy-c', facilityId: 'facility-b' })]);
    store.publish(snapshot);
    const actions = { updateSetup: vi.fn(async (_identity, value: EnergyUseSetupValues) => value) };
    const changes = { confirmDiscard: vi.fn(() => false), register: () => () => {}, protectBeforeUnload: () => () => {}, hasUnsavedChanges: () => false };
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [
      { provide: SessionStorageService, useValue: { retrieve: () => null, store: vi.fn() } },
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: EnergyUseActionsService, useValue: actions },
      { provide: WorkspaceNavigationService, useValue: { accountPortfolioRoute: () => ['/inventory'], isSingleSiteWorkspace: singleSite } },
      { provide: UnsavedChangesService, useValue: changes },
      provideRouter([{ path: 'v1/workspace/facility/:facilityGuid/data', children: ENERGY_USE_WORKBENCH_ROUTES }, { path: 'inventory', component: InventoryDestination }])
    ] });
    const harness = await RouterTestingHarness.create();
    return { store, snapshot, changes, actions, harness, singleSite, router: TestBed.inject(Router) };
  }
  it('opens alphabetical defaults, remembers successful visits per group, and gives direct links precedence', async () => {
    const { harness, router } = await setup();
    const workbench = await harness.navigateByUrl(groupPath(), EnergyUseWorkbenchComponent);
    await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(path('energy-b'));
    expect(workbench.context.items().map(item => item.guid)).toEqual(['energy-b', 'energy-a']);
    workbench.context.openItem('energy-a'); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(path('energy-a'));
    await harness.navigateByUrl('/inventory');
    await harness.navigateByUrl(groupPath()); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(path('energy-a'));
    await harness.navigateByUrl(path('energy-b')); expect(router.url).toBe(path('energy-b'));
  });
  it('switches only among facility groups and keeps unavailable-group items reachable', async () => {
    const { harness, store, snapshot } = await setup();
    store.publish({ ...snapshot, energyUseGroups: [...snapshot.energyUseGroups, energyUseGroup({ guid: 'other', name: 'Other' })], energyUseEquipment: [...snapshot.energyUseEquipment,
      energyUseItem({ guid: 'other-item', energyUseGroupId: 'other' }), energyUseItem({ guid: 'orphan', energyUseGroupId: 'missing' })] });
    const workbench = await harness.navigateByUrl(path('energy-a'), EnergyUseWorkbenchComponent);
    expect(workbench.context.resources().map(resource => resource.id)).toEqual(['unavailable', 'other', 'group-a']);
    workbench.context.switchResource('other'); await harness.fixture.whenStable(); harness.detectChanges();
    expect(routerUrl(harness)).toContain('/groups/other/items/other-item');
    await harness.navigateByUrl(path('orphan', 'unavailable'));
    expect(workbench.context.items().map(item => item.guid)).toEqual(['orphan']);
    expect(workbench.canCreate()).toBe(false);
  });
  function routerUrl(_harness: RouterTestingHarness): string { return TestBed.inject(Router).url; }
  it('keeps empty groups usable and refuses item links belonging to a different group or facility', async () => {
    const { harness, store, snapshot, router } = await setup();
    store.publish({ ...snapshot, energyUseGroups: [...snapshot.energyUseGroups, energyUseGroup({ guid: 'empty', name: 'Empty' })] });
    const workbench = await harness.navigateByUrl(groupPath('empty'), EnergyUseWorkbenchComponent);
    expect(router.url).toBe(`${groupPath('empty')}/items`);
    expect(harness.routeNativeElement?.textContent).toContain('No energy uses in this group');
    expect(workbench.canCreate()).toBe(true);
    await harness.navigateByUrl(path('energy-a', 'empty'));
    expect(workbench.context.notFound()).toBe(true);
    expect(harness.routeNativeElement?.querySelector('app-energy-use-settings-fields')).toBeNull();
    await harness.navigateByUrl(path('energy-c'));
    expect(workbench.context.notFound()).toBe(true);
    expect(harness.routeNativeElement?.querySelector('app-energy-use-settings-fields')).toBeNull();
  });
  it('removes old item and History destinations without compatibility aliases', async () => {
    const { router } = await setup();
    await expect(router.navigateByUrl('/v1/workspace/facility/facility-a/data/energy-uses/energy-a/settings')).rejects.toThrow();
    await expect(router.navigateByUrl(`${groupPath()}/history`)).rejects.toThrow();
  });
  it('matches meter and predictor breadcrumb rules in portfolio and single-facility modes', async () => {
    const { harness, singleSite } = await setup();
    const workbench = await harness.navigateByUrl(path('energy-a'), EnergyUseWorkbenchComponent);
    const portfolio = workbench.breadcrumbs();
    expect(portfolio).toEqual([
      { label: 'Example account', route: ['/inventory'] },
      { label: 'North plant', route: ['/inventory'], queryParams: { facility: 'facility-a' } }
    ]);
    const breadcrumb = () => harness.routeNativeElement?.querySelector('app-page-identity nav');
    expect(breadcrumb()?.textContent).not.toContain('Energy Uses');
    expect(breadcrumb()?.querySelectorAll('a')).toHaveLength(2);
    singleSite.set(true); harness.detectChanges();
    expect(workbench.breadcrumbs()).toEqual([{ label: 'Energy Uses', icon: 'tools', route: ['/inventory'], queryParams: {} }]);
    expect(breadcrumb()?.querySelectorAll('a')).toHaveLength(1);
    singleSite.set(false); harness.detectChanges();
    expect(workbench.breadcrumbs()).toEqual(portfolio);
  });
  it('opens results directly without the item rail, shares preferences across tabs and preserves the tab when switching groups', async () => {
    const { harness, store, snapshot, router } = await setup();
    store.publish({ ...snapshot, energyUseGroups: [...snapshot.energyUseGroups, energyUseGroup({ guid: 'other' })] });
    const workbench = await harness.navigateByUrl(`${groupPath()}/group-footprint`, EnergyUseWorkbenchComponent);
    await harness.fixture.whenStable(); harness.detectChanges();
    expect(workbench.context.activeTab()).toBe('group-footprint');
    expect(workbench.tabs.filter(tab => ['group-summary', 'group-footprint', 'facility-footprint'].includes(tab.id))).toEqual([
      { id: 'group-summary', label: 'Group Summary', icon: 'barChartHorizontal' },
      { id: 'group-footprint', label: 'Group Footprint', icon: 'groupEnergyFootprint' },
      { id: 'facility-footprint', label: 'Facility Footprint', icon: 'facilityEnergyFootprint' }
    ]);
    expect(harness.routeNativeElement?.querySelector('.v1-member-rail')).toBeNull();
    const results = harness.routeDebugElement!.injector.get(EnergyUseResultsService);
    results.historyControl.setValue(true);
    workbench.context.openTab('group-summary'); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(`${groupPath()}/group-summary`);
    expect(results.history()).toBe(true);
    workbench.context.switchResource('other'); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(`${groupPath('other')}/group-summary`);
    expect(results.history()).toBe(false);
    expect(harness.routeNativeElement?.textContent).toContain('No energy uses in this group');
    workbench.context.switchResource('group-a'); await harness.fixture.whenStable(); harness.detectChanges();
    expect(results.history()).toBe(true);
    workbench.context.openTab('facility-footprint'); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(`${groupPath()}/facility-footprint`);
    workbench.context.switchResource('other'); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(`${groupPath('other')}/facility-footprint`);
    expect(harness.routeNativeElement?.querySelector('.v1-member-rail')).toBeNull();
    await router.navigateByUrl(`${groupPath()}/table-results`); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(`${groupPath()}/group-summary`);
    expect(workbench.tabs.some(tab => tab.id === 'table-results')).toBe(false);
  });
  it('opens the existing combined Setup form beside the item sidebar without a finder or repeated item title', async () => {
    const { harness, router } = await setup();
    const workbench = await harness.navigateByUrl(path('energy-a'), EnergyUseWorkbenchComponent);
    expect(workbench.tabs.map(tab => tab.label)).toEqual(['Setup Group', 'Energy Use Items', 'Group Summary', 'Group Footprint', 'Facility Footprint']);
    expect(harness.routeNativeElement?.querySelector('app-energy-use-annual-data-fields')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelector('input[type=search]')).toBeNull();
    expect(harness.routeNativeElement?.querySelector('.energy-use-workbench__chips')).toBeNull();
    expect(harness.routeNativeElement?.querySelectorAll('[aria-label="Energy-use items"] button')).toHaveLength(2);
    expect(harness.routeNativeElement?.querySelector('aside [aria-label="Energy-use items"]')).not.toBeNull();
    workbench.context.openItem('energy-b'); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(path('energy-b')); expect(workbench.context.entry()?.name).toBe('Fan B');
    workbench.context.openItem('energy-c'); await harness.fixture.whenStable();
    expect(router.url).toBe(path('energy-b'));
  });
  it('drops stale content for missing, wrong-facility and deleted items and waits for readiness', async () => {
    const { harness, store, snapshot } = await setup();
    const workbench = await harness.navigateByUrl(path('energy-a'), EnergyUseWorkbenchComponent);
    store.beginLoad(false); harness.detectChanges();
    expect(workbench.context.notFound()).toBe(false); expect(harness.routeNativeElement?.textContent).toContain('Loading energy-use group');
    store.publish(snapshot); harness.detectChanges();
    await harness.navigateByUrl(path('energy-c'));
    expect(workbench.context.notFound()).toBe(true); expect(harness.routeNativeElement?.textContent).toContain('Energy use unavailable');
    expect(harness.routeNativeElement?.querySelector('app-energy-use-annual-data-fields section')).toBeNull();
    await harness.navigateByUrl(path('energy-a'));
    store.publish({ ...snapshot, energyUseEquipment: [] }); harness.detectChanges();
    expect(workbench.context.entry()).toBeUndefined(); expect(harness.routeNativeElement?.textContent).not.toContain('Pump A');
    expect(harness.routeNativeElement?.textContent).toContain('Your draft has been retained');
  });
  it('keeps form save feedback visible through its own refresh and group header independent of the editor', async () => {
    const { harness, store, snapshot, actions } = await setup();
    let finish!: (value: EnergyUseSetupValues) => void;
    actions.updateSetup.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const workbench = await harness.navigateByUrl(path('energy-a'), EnergyUseWorkbenchComponent);
    const panel = harness.routeDebugElement!.query(By.directive(EnergyUseSettingsComponent)).componentInstance as EnergyUseSettingsComponent;
    const header = harness.routeNativeElement!.querySelector('.v1-data-workbench-sticky');
    panel.form()!.controls.settings.controls.name.setValue('Changed');
    const saving = panel.editor.saveNow(); harness.detectChanges();
    store.beginLoad(false); harness.detectChanges();
    expect(workbench.context.entry()?.guid).toBe('energy-a');
    expect(harness.routeNativeElement!.querySelector('.v1-data-workbench-sticky')).toBe(header);
    expect(header?.textContent).not.toContain('Saving');
    expect(harness.routeNativeElement!.querySelector('app-energy-use-save-status')?.textContent).toContain('Saving setup');
    expect(harness.routeNativeElement!.textContent).not.toContain('Loading energy-use group');
    expect(harness.routeNativeElement!.textContent).not.toContain('Setup is read-only');
    const saved = { ...snapshot.energyUseEquipment[0], name: 'Changed' };
    store.publish({ ...snapshot, energyUseEquipment: [saved, ...snapshot.energyUseEquipment.slice(1)] });
    finish(energyUseSetup(saved)); await saving; harness.detectChanges();
    expect(harness.routeNativeElement!.querySelector('app-energy-use-save-status')?.textContent).toContain('Saved.');
    expect(harness.routeNativeElement!.querySelector('footer')?.textContent).not.toContain('Save setup');
  });
  it('selects new copies and neighbors after deletion while preserving the group', async () => {
    const { harness, actions, store, snapshot, router } = await setup();
    const copy = energyUseItem({ guid: 'copy', name: 'Pump A copy' });
    Object.assign(actions, {
      copy: vi.fn(async () => { store.publish({ ...snapshot, energyUseEquipment: [...snapshot.energyUseEquipment, copy] }); return copy; }),
      delete: vi.fn(async identity => { store.publish({ ...store.snapshot()!, energyUseEquipment: store.energyUseEquipment().filter(item => item.guid !== identity.energyUseGuid) }); })
    });
    const workbench = await harness.navigateByUrl(path('energy-a'), EnergyUseWorkbenchComponent);
    const panel = () => harness.routeDebugElement!.query(By.directive(EnergyUseSettingsComponent)).componentInstance as EnergyUseSettingsComponent;
    await panel().copy(); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(path('copy'));
    panel().requestDelete(); await panel().confirmReview(); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(path('energy-a'));
    expect(workbench.context.group()?.guid).toBe('group-a');
    panel().requestDelete(); await panel().confirmReview(); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(path('energy-b'));
    panel().requestDelete(); await panel().confirmReview(); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(`${groupPath()}/items`);
  });
  it('preselects group creation and opens the successfully created member', async () => {
    const { harness, store, snapshot, router } = await setup();
    const workbench = await harness.navigateByUrl(path('energy-a'), EnergyUseWorkbenchComponent);
    workbench.openCreation(); harness.detectChanges();
    expect(workbench.creating()).toBe(true);
    const created = energyUseItem({ guid: 'new-member', name: 'New member' });
    store.publish({ ...snapshot, energyUseEquipment: [...snapshot.energyUseEquipment, created] });
    await workbench.openCreated(created); await harness.fixture.whenStable(); harness.detectChanges();
    expect(workbench.creating()).toBe(false); expect(router.url).toBe(path('new-member'));
  });

  it('opens the first item created in an empty group without a competing default navigation', async () => {
    const { harness, store, snapshot, router } = await setup();
    store.publish({ ...snapshot, energyUseEquipment: [] });
    const workbench = await harness.navigateByUrl(groupPath(), EnergyUseWorkbenchComponent);
    workbench.openCreation(); harness.detectChanges();
    const created = energyUseItem({ guid: 'first-member' });
    store.publish({ ...snapshot, energyUseEquipment: [created] }); harness.detectChanges();
    await workbench.openCreated(created); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(path('first-member')); expect(workbench.context.navigationError()).toBe('');
  });
  it('blocks group management for failed or disappeared drafts until the editor is resolved', async () => {
    const { harness, actions, store, snapshot, router } = await setup();
    const workbench = await harness.navigateByUrl(path('energy-a'), EnergyUseWorkbenchComponent);
    const panel = harness.routeDebugElement!.query(By.directive(EnergyUseSettingsComponent)).componentInstance as EnergyUseSettingsComponent;
    actions.updateSetup.mockRejectedValueOnce(new Error('Save failed'));
    panel.form()!.controls.settings.controls.name.setValue('Retain me'); await panel.editor.saveNow(); harness.detectChanges();
    expect(workbench.canManage()).toBe(false);
    store.publish({ ...snapshot, energyUseEquipment: [] }); harness.detectChanges();
    expect(workbench.canManage()).toBe(false);
    expect(await router.navigateByUrl('/inventory')).toBe(false);
    expect(panel.form()!.controls.settings.controls.name.value).toBe('Retain me');
  });
  it('shares providers with the editor, releases them on exit and honors canceled tab and item navigation', async () => {
    const { harness, router, changes } = await setup();
    const workbench = await harness.navigateByUrl(path('energy-a'), EnergyUseWorkbenchComponent);
    const first = harness.routeDebugElement!.injector.get(EnergyUsesWorkspaceService);
    const panel = harness.routeDebugElement!.query(By.directive(EnergyUseSettingsComponent)).componentInstance as EnergyUseSettingsComponent;
    expect(panel.context).toBe(workbench.context);
    const dirty = vi.spyOn(panel, 'hasUnsavedChanges').mockReturnValue(true);
    expect(await router.navigateByUrl('/inventory')).toBe(false);
    expect(await router.navigateByUrl(path('energy-b'))).toBe(false);
    expect(await router.navigateByUrl(`${groupPath()}/group-footprint`)).toBe(false);
    expect(await router.navigateByUrl(`${groupPath()}/group-summary`)).toBe(false);
    expect(await router.navigateByUrl(`${groupPath()}/facility-footprint`)).toBe(false);
    expect(workbench.context.energyUseGuid()).toBe('energy-a');
    expect(changes.confirmDiscard).toHaveBeenCalled();
    dirty.mockReturnValue(false);
    await harness.navigateByUrl('/inventory');
    await harness.navigateByUrl(path('energy-a'));
    expect(harness.routeDebugElement!.injector.get(EnergyUsesWorkspaceService)).not.toBe(first);
  });
});
