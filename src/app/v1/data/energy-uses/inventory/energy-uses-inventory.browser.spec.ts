import { Location } from '@angular/common';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationCancel, Router, RouterOutlet, provideRouter } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';
import { page, userEvent } from 'vitest/browser';
import { LocalStorageService } from 'ngx-webstorage';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { SingleFacilityAnalysisPairService } from '@app/v1/analysis/single-facility-analysis-pair.service';
import { DataModule } from '@app/v1/data/data.module';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { V1Routes } from '@app/v1/v1.routes';
import { EnergyUsesInventoryComponent } from './energy-uses-inventory.component';
import { EnergyUseSettingsComponent } from '../energy-use-workbench/settings/energy-use-settings.component';
import { EnergyUseActionsService } from '../energy-use-actions.service';
import { energyUseItem, energyUseSource, energyUsesSnapshot } from '../energy-uses.testing';

const inventoryUrl = '/v1/workspace/account/account-a/data/portfolio/energy-uses';
const itemUrl = '/v1/workspace/facility/facility-a/data/energy-uses/energy-00/settings';
@Component({ standalone: true, imports: [RouterOutlet], template: '<main class="v1-root" style="height:560px;min-height:0;overflow:auto;width:100%"><router-outlet/></main>' })
class EnergyUsesBrowserHost {}

function setup(single = false) {
  const store = new AccountWorkspaceStore();
  const base = energyUsesSnapshot(Array.from({ length: 50 }, (_, index) => energyUseItem({
    guid: `energy-${String(index).padStart(2, '0')}`, name: `Pump ${String(index).padStart(2, '0')}`,
    facilityId: index === 49 ? 'facility-b' : 'facility-a',
    ...(index === 0 ? { utilityData: [energyUseSource(), energyUseSource({ energySource: 'Natural Gas' }), energyUseSource({ energySource: 'Other Energy' })] } : {})
  })));
  const snapshot = single ? { ...base, account: { ...base.account, isSingleFacilityCompany: true }, facilities: [base.facilities[0]],
    energyUseEquipment: base.energyUseEquipment.filter(item => item.facilityId === 'facility-a') } : base;
  store.publish(snapshot);
  const pairService = { ensurePairs: vi.fn(async () => true) };
  const workspaceService = { selectAccount: vi.fn(), selectFacility: vi.fn() };
  const account = V1Routes[0].children!.find(route => route.path === 'workspace/account/:accountGuid')!;
  const facility = V1Routes[0].children!.find(route => route.path === 'workspace/facility/:facilityGuid')!;
  TestBed.configureTestingModule({ imports: [DataModule, EnergyUsesBrowserHost], providers: [
    provideRouter([
      { path: 'v1/workspace/account/:accountGuid', canActivateChild: account.canActivateChild, children: account.children!.filter(route => route.path === 'data') },
      { path: 'v1/workspace/facility/:facilityGuid', children: facility.children!.filter(route => route.path === 'data') }
    ]),
    { provide: AccountWorkspaceStore, useValue: store }, { provide: AccountWorkspaceService, useValue: workspaceService },
    { provide: EnergyUseActionsService, useValue: {} },
    { provide: ApplicationLifecycleService, useValue: { usableAccounts: () => [snapshot.account] } },
    { provide: WorkspaceStatusService, useValue: { state: signal('ready'), items: signal([]), accountTodos: signal([]), discardedItems: signal([]) } },
    { provide: SingleFacilityAnalysisPairService, useValue: pairService },
    { provide: LocalStorageService, useValue: { retrieve: () => null, store: vi.fn() } }
  ] });
  const fixture = TestBed.createComponent(EnergyUsesBrowserHost); fixture.detectChanges();
  const router = TestBed.inject(Router); router.setUpLocationChangeListener();
  const inventory = () => fixture.debugElement.query(By.directive(EnergyUsesInventoryComponent)).componentInstance as EnergyUsesInventoryComponent;
  const root = fixture.nativeElement.querySelector('main') as HTMLElement;
  for (const name of ['--v1-rail-width', '--v1-section-nav-width', '--v1-support-panel-width']) root.style.setProperty(name, '0px');
  return { store, snapshot, fixture, root, router, inventory, pairService, navigation: TestBed.inject(WorkspaceNavigationService) };
}
async function settle(view: ReturnType<typeof setup>): Promise<void> {
  view.fixture.detectChanges(); await view.fixture.whenStable();
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  view.fixture.detectChanges();
}

describe('energy uses browser journeys', () => {
  it('restores scope, filters, page, detail, scroll and focus through item drill-in and browser Back/Forward', async () => {
    await page.viewport(1100, 850);
    const view = setup();
    await view.router.navigateByUrl(`${inventoryUrl}?facility=facility-a`); await settle(view);
    const before = structuredClone(view.store.snapshot());
    view.inventory().filtersForm.controls.search.setValue('pump'); view.inventory().inventory.detailControl.setValue('detailed');
    view.inventory().inventory.selectPage(1); await settle(view);
    // A criteria edit resets the page; choose it after the edit has rendered.
    view.inventory().inventory.selectPage(1); await settle(view);
    const link = view.root.querySelector<HTMLAnchorElement>('.portfolio-inventory .portfolio-tile__name')!;
    const guid = link.dataset['browseId']!;
    link.focus({ preventScroll: true }); view.root.scrollTop = 220;
    const scroll = view.root.scrollTop;
    link.click(); await settle(view);
    expect(view.router.url).toContain(`/energy-uses/${guid}/settings`);
    expect([...view.root.querySelectorAll('app-page-identity nav a')].map(link => link.textContent?.trim()))
      .toEqual(['Example account', 'North plant']);
    TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toBe(`${inventoryUrl}?facility=facility-a`)); await settle(view);
    expect(view.inventory().filters().search).toBe('pump'); expect(view.inventory().inventory.page()).toBe(1);
    expect(view.inventory().inventory.detail()).toBe('detailed');
    expect(document.activeElement?.getAttribute('data-browse-id')).toBe(guid);
    expect(view.root.scrollTop).toBeCloseTo(scroll, 0);
    TestBed.inject(Location).forward(); await vi.waitFor(() => expect(view.router.url).toContain(`/energy-uses/${guid}/settings`)); await settle(view);
    expect(view.store.snapshot()).toEqual(before); expect(view.pairService.ensurePairs).not.toHaveBeenCalled();
    view.fixture.destroy();
  });
  it('normalizes legacy links, preserves Energy Uses on scope changes, and retains context after a canceled exit', async () => {
    const view = setup();
    await view.router.navigateByUrl('/v1/workspace/facility/facility-a/data/energy-uses'); await settle(view);
    expect(view.router.url).toBe(`${inventoryUrl}?facility=facility-a`);
    await view.router.navigateByUrl(itemUrl); await settle(view);
    const panel = view.fixture.debugElement.query(By.directive(EnergyUseSettingsComponent)).componentInstance as EnergyUseSettingsComponent;
    const dirty = vi.spyOn(panel, 'hasUnsavedChanges').mockReturnValue(true);
    vi.spyOn(TestBed.inject(UnsavedChangesService), 'confirmDiscard').mockReturnValue(false);
    expect(await view.navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' })).toBe(false);
    expect(view.navigation.activeEnergyUseGuid()).toBe('energy-00'); expect(view.navigation.headerFacility()?.guid).toBe('facility-a');
    dirty.mockReturnValue(false);
    expect(await view.navigation.changeFacilityScope({ kind: 'facility', facilityGuid: 'facility-b' })).toBe(true); await settle(view);
    expect(view.router.url).toBe(`${inventoryUrl}?facility=facility-b`); expect(view.inventory().entries()).toHaveLength(1);
    const unregister = TestBed.inject(UnsavedChangesService).register(() => false, () => {}, () => true);
    const canceled = firstValueFrom(view.router.events.pipe(filter(event => event instanceof NavigationCancel)));
    TestBed.inject(Location).back(); await canceled;
    expect(view.navigation.inventoryFacilityGuid()).toBe('facility-b'); expect(view.navigation.activeEnergyUseGuid()).toBeUndefined();
    unregister(); view.fixture.destroy();
  });
  it('uses implicit single-facility scope and canonical breadcrumbs without initializing records', async () => {
    const view = setup(true); const before = structuredClone(view.store.snapshot());
    await view.router.navigateByUrl(inventoryUrl); await settle(view);
    expect(view.router.url).toBe(inventoryUrl); expect(view.navigation.inventoryFacilityGuid()).toBe('facility-a');
    expect(view.root.querySelector('.portfolio-tile__header-owner')).toBeNull();
    await view.router.navigateByUrl(itemUrl); await settle(view);
    const breadcrumb = view.root.querySelector<HTMLAnchorElement>('app-page-identity nav a')!;
    expect(breadcrumb.textContent).toContain('Energy Uses'); expect(breadcrumb.getAttribute('href')).toBe(inventoryUrl);
    breadcrumb.click(); await settle(view); expect(view.router.url).toBe(inventoryUrl);
    expect(view.pairService.ensurePairs).not.toHaveBeenCalled(); expect(view.store.snapshot()).toEqual(before);
    view.fixture.destroy();
  });
  it('keeps keyboard controls, wrapping, contrast and print cards usable across themes and window widths', async () => {
    const view = setup(); await view.router.navigateByUrl(inventoryUrl); await settle(view);
    view.inventory().inventory.detailControl.setValue('detailed'); await settle(view);
    for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
      await page.viewport(width, 850); view.root.className = `v1-root ${theme}`; await settle(view);
      expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
      const tile = view.root.querySelector<HTMLElement>('.portfolio-inventory .portfolio-tile')!;
      expect(tile.scrollWidth).toBeLessThanOrEqual(tile.clientWidth + 1);
      const name = tile.querySelector<HTMLElement>('.portfolio-tile__name')!;
      expect(textContrast(name, tile)).toBeGreaterThanOrEqual(4.5);
      const source = tile.querySelector<HTMLElement>('dd')!;
      expect(parseFloat(getComputedStyle(source).fontSize)).toBeGreaterThanOrEqual(14);
      expect(source.textContent).toContain('Other Energy');
      expect(source.scrollWidth).toBeLessThanOrEqual(source.clientWidth + 1);
      expect([...view.root.querySelectorAll('select')].every(select => select.classList.contains('v1-select'))).toBe(true);
      await page.screenshot({ element: view.root, path: `./__screenshots__/energy-uses-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
    }
    const search = view.root.querySelector<HTMLInputElement>('input[type="search"]')!;
    search.focus(); await userEvent.keyboard('{Tab}');
    expect(document.activeElement?.getAttribute('formControlName')).toBe('category');
    const print = view.root.querySelector<HTMLElement>('.portfolio-inventory-print')!;
    expect(print.querySelectorAll('app-inventory-tile')).toHaveLength(50);
    expect(view.root.querySelectorAll('.portfolio-tile__menu-button').length).toBeGreaterThan(0);
    expect(print.querySelectorAll('button,input')).toHaveLength(0);
    await view.router.navigateByUrl(itemUrl); await settle(view);
    expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
    const panel = view.root.querySelector<HTMLElement>('app-energy-use-settings section')!;
    expect(getComputedStyle(panel).borderRadius).toBe('0px');
    await page.screenshot({ element: view.root, path: './__screenshots__/energy-use-workbench-narrow-contrast.png' });
    view.fixture.destroy();
  });
});
