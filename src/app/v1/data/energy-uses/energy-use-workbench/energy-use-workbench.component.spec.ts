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
import { energyUseItem, energyUsesSnapshot } from '../energy-uses.testing';
import { EnergyUsesWorkspaceService } from '../energy-uses-workspace.service';
import { EnergyUseWorkbenchComponent } from './energy-use-workbench.component';
import { EnergyUseSettingsComponent } from './settings/energy-use-settings.component';
import { EnergyUseSetupValues, energyUseSetup } from '../models/energy-use-setup.models';
import { EnergyUseActionsService } from '../energy-use-actions.service';

@Component({ standalone: true, template: 'Inventory' })
class InventoryDestination {}

describe('energy use workbench routes', () => {
  const path = (guid: string, tab = 'settings', facility = 'facility-a') => `/v1/workspace/facility/${facility}/data/energy-uses/${guid}/${tab}`;
  async function setup() {
    const singleSite = signal(false);
    const store = new AccountWorkspaceStore();
    const snapshot = energyUsesSnapshot([energyUseItem(), energyUseItem({ guid: 'energy-b', name: 'Fan B' }), energyUseItem({ guid: 'energy-c', facilityId: 'facility-b' })]);
    store.publish(snapshot);
    const actions = { updateSetup: vi.fn(async (_identity, value: EnergyUseSetupValues) => value) };
    const changes = { confirmDiscard: vi.fn(() => false), register: () => () => {}, protectBeforeUnload: () => () => {} };
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: EnergyUseActionsService, useValue: actions },
      { provide: WorkspaceNavigationService, useValue: { accountPortfolioRoute: () => ['/inventory'], isSingleSiteWorkspace: singleSite } },
      { provide: UnsavedChangesService, useValue: changes },
      provideRouter([{ path: 'v1/workspace/facility/:facilityGuid/data', children: ENERGY_USE_WORKBENCH_ROUTES }, { path: 'inventory', component: InventoryDestination }])
    ] });
    const harness = await RouterTestingHarness.create();
    return { store, snapshot, changes, actions, harness, singleSite, router: TestBed.inject(Router) };
  }
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
  it('opens direct links, defaults invalid tabs, reuses item context and preserves the tab when switching', async () => {
    const { harness, router } = await setup();
    const workbench = await harness.navigateByUrl(path('energy-a', ''), EnergyUseWorkbenchComponent);
    expect(router.url).toBe(path('energy-a'));
    expect(workbench.context.entry()?.name).toBe('Pump A');
    expect(workbench.context.resources().map(resource => resource.id)).toEqual(['energy-b', 'energy-a']);
    expect(workbench.context.activeTab()).toBe('settings');
    expect(workbench.tabs).toEqual([{ id: 'settings', label: 'Setup', icon: 'settings' }]);
    expect(harness.routeNativeElement?.querySelector('app-energy-use-annual-data-fields')).not.toBeNull();
    workbench.context.switchResource('energy-b'); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(path('energy-b'));
    expect(workbench.context.entry()?.name).toBe('Fan B');
    workbench.context.switchResource('energy-c'); await harness.fixture.whenStable();
    expect(router.url).toBe(path('energy-b'));
    await harness.navigateByUrl(path('energy-b', 'invalid'));
    expect(router.url).toBe(path('energy-b'));
  });
  it('drops stale content for missing, wrong-facility and deleted items and waits for readiness', async () => {
    const { harness, store, snapshot } = await setup();
    const workbench = await harness.navigateByUrl(path('energy-a'), EnergyUseWorkbenchComponent);
    store.beginLoad(false); harness.detectChanges();
    expect(workbench.context.notFound()).toBe(false); expect(harness.routeNativeElement?.textContent).toContain('Loading energy use');
    store.publish(snapshot); harness.detectChanges();
    await harness.navigateByUrl(path('energy-c'));
    expect(workbench.context.notFound()).toBe(true); expect(harness.routeNativeElement?.textContent).toContain('Energy use unavailable');
    expect(harness.routeNativeElement?.querySelector('app-energy-use-annual-data-fields section')).toBeNull();
    await harness.navigateByUrl(path('energy-a'));
    store.publish({ ...snapshot, energyUseEquipment: [] }); harness.detectChanges();
    expect(workbench.context.entry()).toBeUndefined(); expect(harness.routeNativeElement?.textContent).not.toContain('Pump A');
    expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe('/inventory?facility=facility-a');
  });
  it('keeps header save feedback visible through its own refresh without loading or read-only alerts', async () => {
    const { harness, store, snapshot, actions } = await setup();
    let finish!: (value: EnergyUseSetupValues) => void;
    actions.updateSetup.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const workbench = await harness.navigateByUrl(path('energy-a'), EnergyUseWorkbenchComponent);
    const panel = harness.routeDebugElement!.query(By.directive(EnergyUseSettingsComponent)).componentInstance as EnergyUseSettingsComponent;
    const header = harness.routeNativeElement!.querySelector('.v1-data-workbench-header');
    panel.form()!.controls.settings.controls.name.setValue('Changed');
    const saving = panel.editor.saveNow(); harness.detectChanges();
    store.beginLoad(false); harness.detectChanges();
    expect(workbench.context.entry()?.guid).toBe('energy-a');
    expect(harness.routeNativeElement!.querySelector('.v1-data-workbench-header')).toBe(header);
    expect(header?.textContent).toContain('Saving…');
    expect(harness.routeNativeElement!.textContent).not.toContain('Loading energy use');
    expect(harness.routeNativeElement!.textContent).not.toContain('Setup is read-only');
    const saved = { ...snapshot.energyUseEquipment[0], name: 'Changed' };
    store.publish({ ...snapshot, energyUseEquipment: [saved, ...snapshot.energyUseEquipment.slice(1)] });
    finish(energyUseSetup(saved)); await saving; harness.detectChanges();
    expect(header?.textContent).toContain('Saved');
    expect(harness.routeNativeElement!.querySelector('footer')?.textContent).not.toContain('Save setup');
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
    expect(workbench.context.energyUseGuid()).toBe('energy-a'); expect(workbench.context.activeTab()).toBe('settings');
    expect(changes.confirmDiscard).toHaveBeenCalled();
    dirty.mockReturnValue(false);
    await harness.navigateByUrl('/inventory');
    await harness.navigateByUrl(path('energy-a'));
    expect(harness.routeDebugElement!.injector.get(EnergyUsesWorkspaceService)).not.toBe(first);
  });
});
