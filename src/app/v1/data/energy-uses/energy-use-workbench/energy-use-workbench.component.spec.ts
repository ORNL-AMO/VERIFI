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
import { EnergyUseWorkbenchPanelComponent } from './panel/energy-use-workbench-panel.component';

@Component({ standalone: true, template: 'Inventory' })
class InventoryDestination {}

describe('energy use workbench routes', () => {
  const path = (guid: string, tab = 'settings', facility = 'facility-a') => `/v1/workspace/facility/${facility}/data/energy-uses/${guid}/${tab}`;
  async function setup() {
    const singleSite = signal(false);
    const store = new AccountWorkspaceStore();
    const snapshot = energyUsesSnapshot([energyUseItem(), energyUseItem({ guid: 'energy-b', name: 'Fan B' }), energyUseItem({ guid: 'energy-c', facilityId: 'facility-b' })]);
    store.publish(snapshot);
    const changes = { confirmDiscard: vi.fn(() => false) };
    TestBed.configureTestingModule({ imports: [EnergyUsesModule], providers: [
      { provide: AccountWorkspaceStore, useValue: store },
      { provide: WorkspaceNavigationService, useValue: { accountPortfolioRoute: () => ['/inventory'], isSingleSiteWorkspace: singleSite } },
      { provide: UnsavedChangesService, useValue: changes },
      provideRouter([{ path: 'v1/workspace/facility/:facilityGuid/data', children: ENERGY_USE_WORKBENCH_ROUTES }, { path: 'inventory', component: InventoryDestination }])
    ] });
    const harness = await RouterTestingHarness.create();
    return { store, snapshot, changes, harness, singleSite, router: TestBed.inject(Router) };
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
    await harness.navigateByUrl(path('energy-a', 'annual-data'));
    expect(workbench.context.activeTab()).toBe('annual-data');
    expect(harness.routeNativeElement?.textContent).toContain('Annual Data');
    expect(harness.routeNativeElement?.querySelector('input,textarea')).toBeNull();
    workbench.context.switchResource('energy-b'); await harness.fixture.whenStable(); harness.detectChanges();
    expect(router.url).toBe(path('energy-b', 'annual-data'));
    expect(workbench.context.entry()?.name).toBe('Fan B');
    workbench.context.switchResource('energy-c'); await harness.fixture.whenStable();
    expect(router.url).toBe(path('energy-b', 'annual-data'));
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
    expect(harness.routeNativeElement?.querySelector('app-energy-use-workbench-panel section')).toBeNull();
    await harness.navigateByUrl(path('energy-a'));
    store.publish({ ...snapshot, energyUseEquipment: [] }); harness.detectChanges();
    expect(workbench.context.entry()).toBeUndefined(); expect(harness.routeNativeElement?.textContent).not.toContain('Pump A');
    expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe('/inventory?facility=facility-a');
  });
  it('shares providers with the panel, releases them on exit and honors canceled tab and item navigation', async () => {
    const { harness, router, changes } = await setup();
    const workbench = await harness.navigateByUrl(path('energy-a'), EnergyUseWorkbenchComponent);
    const first = harness.routeDebugElement!.injector.get(EnergyUsesWorkspaceService);
    const panel = harness.routeDebugElement!.query(By.directive(EnergyUseWorkbenchPanelComponent)).componentInstance as EnergyUseWorkbenchPanelComponent;
    expect(panel.context).toBe(workbench.context);
    const dirty = vi.spyOn(panel, 'hasUnsavedChanges').mockReturnValue(true);
    expect(await router.navigateByUrl(path('energy-a', 'annual-data'))).toBe(false);
    expect(await router.navigateByUrl(path('energy-b'))).toBe(false);
    expect(workbench.context.energyUseGuid()).toBe('energy-a'); expect(workbench.context.activeTab()).toBe('settings');
    expect(changes.confirmDiscard).toHaveBeenCalled();
    dirty.mockReturnValue(false);
    await harness.navigateByUrl('/inventory');
    await harness.navigateByUrl(path('energy-a'));
    expect(harness.routeDebugElement!.injector.get(EnergyUsesWorkspaceService)).not.toBe(first);
  });
});
