import { SectionNavModule } from '@app/v1/shell/section-nav/section-nav.module';
import { Location } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { PortalModule } from '@angular/cdk/portal';
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
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { UnsavedChangesService } from '@app/v1/shared/navigation/unsaved-changes.service';
import { WorkspaceStatusService } from '@app/v1/status/workspace-status.service';
import { textContrast } from '@app/v1/shared/inventory/inventory-browser-test.helpers';
import { V1Routes } from '@app/v1/v1.routes';
import { EnergyUsesInventoryComponent } from './energy-uses-inventory.component';
import { EnergyUseSettingsComponent } from '../energy-use-workbench/settings/energy-use-settings.component';
import { EnergyUseActionsService } from '../energy-use-actions.service';
import { energyUseGroup, energyUseItem, energyUseSource, energyUsesSnapshot } from '../energy-uses.testing';

const inventoryUrl = '/v1/workspace/account/account-a/data/portfolio/energy-uses';
const itemUrl = '/v1/workspace/facility/facility-a/data/energy-uses/energy-00/settings';
@Component({ standalone: true, imports: [RouterOutlet, PortalModule, SectionNavModule], template: '<main class="v1-root" style="height:560px;min-height:0;overflow:auto;width:100%">@if (showNav()) { <div style="width:16rem;max-width:100%"><app-section-nav/></div> }<router-outlet/><ng-template [cdkPortalOutlet]="modal.activePortal()"/></main>' })
class EnergyUsesBrowserHost { readonly showNav = signal(false); readonly modal = inject(ModalPortalService); }

function setup(single = false) {
  const store = new AccountWorkspaceStore();
  const initial = energyUsesSnapshot(Array.from({ length: 50 }, (_, index) => energyUseItem({
    guid: `energy-${String(index).padStart(2, '0')}`, name: `Pump ${String(index).padStart(2, '0')}`,
    energyUseGroupId: `group-${String(index).padStart(2, '0')}`, facilityId: index === 49 ? 'facility-b' : 'facility-a',
    ...(index === 0 ? { utilityData: [energyUseSource(), energyUseSource({ energySource: 'Natural Gas' }), energyUseSource({ energySource: 'Other Energy' })] } : {})
  })));
  const base = { ...initial, energyUseGroups: initial.energyUseEquipment.map(item => energyUseGroup({ guid: item.energyUseGroupId, facilityId: item.facilityId, name: item.name })) };
  const snapshot = single ? { ...base, account: { ...base.account, isSingleFacilityCompany: true }, facilities: [base.facilities[0]],
    energyUseEquipment: base.energyUseEquipment.filter(item => item.facilityId === 'facility-a') } : base;
  store.publish(snapshot);
  const pairService = { ensurePairs: vi.fn(async () => true) };
  const workspaceService = { selectAccount: vi.fn(), selectFacility: vi.fn() };
  const actions = { updateSetup: vi.fn(async (_identity, value) => value) };
  const account = V1Routes[0].children!.find(route => route.path === 'workspace/account/:accountGuid')!;
  const facility = V1Routes[0].children!.find(route => route.path === 'workspace/facility/:facilityGuid')!;
  TestBed.configureTestingModule({ imports: [DataModule, EnergyUsesBrowserHost], providers: [
    provideRouter([
      { path: 'v1/workspace/account/:accountGuid', canActivateChild: account.canActivateChild, children: account.children!.filter(route => route.path === 'data') },
      { path: 'v1/workspace/facility/:facilityGuid', children: facility.children!.filter(route => route.path === 'data') }
    ]),
    { provide: AccountWorkspaceStore, useValue: store }, { provide: AccountWorkspaceService, useValue: workspaceService },
    { provide: EnergyUseActionsService, useValue: actions },
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
  return { store, snapshot, fixture, root, router, inventory, pairService, actions, navigation: TestBed.inject(WorkspaceNavigationService) };
}
async function settle(view: ReturnType<typeof setup>): Promise<void> {
  view.fixture.detectChanges(); await view.fixture.whenStable();
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  view.fixture.detectChanges();
}

describe('energy uses browser journeys', () => {
  it('keeps group item lists bounded and readable across themes with equipment icons and long names', async () => {
    const view = setup();
    const types = ['Motor', 'HVAC', 'Lighting', 'Mobile', 'Pump', 'Fan'] as const;
    view.store.publish({ ...view.snapshot, energyUseGroups: [energyUseGroup({ notes: 'Process equipment and shared systems' })],
      energyUseEquipment: Array.from({ length: 1000 }, (_, index) => energyUseItem({ guid: `item-${index}`, name: `Equipment ${String(index).padStart(4, '0')} with a long process description`, equipmentType: types[index % types.length] })) });
    const before = structuredClone(view.store.snapshot());
    await view.router.navigateByUrl('/v1/workspace/facility/facility-a/data/energy-uses/groups/group-a'); await settle(view);
    for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
      await page.viewport(width, 850); view.root.className = `v1-root ${theme}`; await settle(view);
      expect(view.root.querySelectorAll('tbody tr')).toHaveLength(24);
      expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
      const region = view.root.querySelector<HTMLElement>('.energy-use-list')!;
      if (width === 390) expect(region.scrollWidth).toBeGreaterThan(region.clientWidth);
      const cell = view.root.querySelector<HTMLElement>('tbody td')!;
      expect(textContrast(cell, cell)).toBeGreaterThanOrEqual(4.5);
      await page.screenshot({ element: view.root, path: `./__screenshots__/energy-use-group-items-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
    }
    await page.getByRole('button', { name: 'Next', exact: true }).click(); await settle(view);
    expect(view.root.querySelectorAll('tbody tr')).toHaveLength(24); expect(view.inventory().inventory.page()).toBe(1);
    expect(view.store.snapshot()).toEqual(before); view.fixture.destroy();
  });

  it('opens the active item beyond the sidebar preview and supports keyboard disclosure and group navigation', async () => {
    const view = setup(); view.fixture.componentInstance.showNav.set(true);
    view.store.publish({ ...view.snapshot, energyUseGroups: [energyUseGroup()], energyUseEquipment: view.snapshot.energyUseEquipment.map(item => ({ ...item, energyUseGroupId: 'group-a' })) });
    const before = structuredClone(view.store.snapshot());
    await view.router.navigateByUrl(itemUrl.replace('energy-00', 'energy-45')); await settle(view);
    const sidebar = view.root.querySelector('app-section-nav')!;
    expect(sidebar.querySelectorAll('.v1-nav__nested-items a')).toHaveLength(21);
    expect(sidebar.querySelector('[aria-current="page"]')?.textContent).toContain('Pump 45');
    const toggle = page.getByRole('button', { name: 'Hide items in Production', exact: true });
    (toggle.element() as HTMLElement).focus(); await userEvent.keyboard('{Enter}'); await settle(view);
    expect(sidebar.querySelectorAll('.v1-nav__nested-items a')).toHaveLength(0);
    await userEvent.keyboard('{Enter}'); await settle(view);
    expect(sidebar.querySelectorAll('.v1-nav__nested-items a')).toHaveLength(21);
    await page.screenshot({ element: sidebar, path: './__screenshots__/energy-use-group-sidebar.png' });
    const viewAll = [...sidebar.querySelectorAll<HTMLAnchorElement>('a')].find(link => link.textContent?.includes('View all'))!;
    viewAll.click(); await settle(view);
    expect(view.navigation.activeEnergyUseGroupGuid()).toBe('group-a'); expect(view.root.querySelectorAll('tbody tr')).toHaveLength(24);
    expect(view.store.snapshot()).toEqual(before); view.fixture.destroy();
  });
  it('restores independent group filters when browser history reuses the same group route component', async () => {
    const view = setup();
    const url = (group: string) => `/v1/workspace/facility/facility-a/data/energy-uses/groups/${group}?search=pump`;
    await view.router.navigateByUrl(url('group-00')); await settle(view);
    view.inventory().filtersForm.controls.search.setValue('changed first'); await settle(view);
    await view.router.navigateByUrl(url('group-01')); await settle(view);
    expect(view.inventory().filters().search).toBe('pump');
    view.inventory().filtersForm.controls.search.setValue('changed second'); await settle(view);
    TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toBe(url('group-00'))); await settle(view);
    expect(view.inventory().filters().search).toBe('changed first');
    TestBed.inject(Location).forward(); await vi.waitFor(() => expect(view.router.url).toBe(url('group-01'))); await settle(view);
    expect(view.inventory().filters().search).toBe('changed second'); view.fixture.destroy();
  });

  it.each(['utilities', 'meter-groups'] as const)('closes the %s selection on browser Back between items with identical setup', async kind => {
    const view = setup();
    const group = getNewIdbUtilityMeterGroup('Energy', 'Gas supply', 'facility-a', 'account-a');
    const meter = { ...getNewIdbUtilityMeter('facility-a', 'account-a', true, 'kWh'), source: 'Natural Gas' as const, groupId: group.guid };
    view.store.publish({ ...view.snapshot, meterGroups: [group], meters: [meter], energyUseEquipment: view.snapshot.energyUseEquipment.map(item =>
      ['energy-01', 'energy-02'].includes(item.guid) ? { ...item, utilityMeterGroupIds: [] } : item) });
    const before = structuredClone(view.store.snapshot());
    const firstUrl = itemUrl.replace('energy-00', 'energy-01'), secondUrl = itemUrl.replace('energy-00', 'energy-02');
    const panel = () => view.fixture.debugElement.query(By.directive(EnergyUseSettingsComponent)).componentInstance as EnergyUseSettingsComponent;
    try {
      await view.router.navigateByUrl(firstUrl); await settle(view);
      await view.router.navigateByUrl(secondUrl); await settle(view);
      const reusedEditor = panel();
      const title = kind === 'utilities' ? 'Select Utilities' : 'Select Meter Groups';
      const choice = kind === 'utilities' ? 'Natural Gas' : 'Gas supply';
      await page.getByRole('button', { name: title, exact: true }).click(); await settle(view);
      await page.getByRole('dialog', { name: title, exact: true }).getByRole('checkbox', { name: choice, exact: true }).click(); await settle(view);
      expect(reusedEditor.editor.dirty()).toBe(false);
      TestBed.inject(Location).back();
      await vi.waitFor(() => expect(view.router.url).toBe(firstUrl)); await settle(view);
      expect(panel()).toBe(reusedEditor);
      expect(view.root.querySelector('[role="dialog"]')).toBeNull();
      expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
      expect(view.actions.updateSetup).not.toHaveBeenCalled();
      expect(view.store.snapshot()).toEqual(before);
      await page.getByRole('button', { name: title, exact: true }).click(); await settle(view);
      const fresh = page.getByRole('dialog', { name: title, exact: true });
      expect(fresh.getByRole('checkbox', { name: choice, exact: true }).element()).toHaveProperty('checked', false);
      await fresh.getByRole('button', { name: 'Cancel', exact: true }).click(); await settle(view);
      expect(view.actions.updateSetup).not.toHaveBeenCalled();
    } finally { view.fixture.destroy(); }
  });
  it('restores dashboard and group filters, paging, scroll and focus through Back/Forward without writing records', async () => {
    await page.viewport(1100, 850);
    const view = setup();
    // One large group plus enough empty groups to page the dashboard independently.
    view.store.publish({ ...view.snapshot,
      energyUseEquipment: view.snapshot.energyUseEquipment.filter(item => item.facilityId === 'facility-a').map(item => ({ ...item, energyUseGroupId: 'group-00' })),
      energyUseGroups: view.snapshot.energyUseGroups.map(group => ({ ...group, name: group.guid === 'group-00' ? 'Z Production' : group.name })) });
    const before = structuredClone(view.store.snapshot());
    await view.router.navigateByUrl(`${inventoryUrl}?facility=facility-a`); await settle(view);
    view.inventory().inventory.selectPage(2); await settle(view);
    const groupLink = [...view.root.querySelectorAll<HTMLAnchorElement>('.portfolio-tile__name')].find(link => link.textContent === 'Z Production')!;
    groupLink.focus(); groupLink.click(); await settle(view);
    expect(view.router.url).toContain('/energy-uses/groups/group-00');
    expect(view.root.querySelectorAll('tbody tr')).toHaveLength(24);
    expect(view.inventory().filters().search).toBe('');
    view.inventory().filtersForm.controls.search.setValue('pump'); await settle(view);
    view.inventory().inventory.selectPage(1); await settle(view);
    const itemLink = view.root.querySelector<HTMLAnchorElement>('tbody a')!;
    const guid = itemLink.dataset['browseId']; itemLink.focus(); itemLink.click(); await settle(view);
    expect(view.router.url).toContain(`/energy-uses/${guid}/settings`);
    TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toContain('/groups/group-00')); await settle(view);
    expect(view.inventory().filters().search).toBe('pump'); expect(view.inventory().inventory.page()).toBe(1);
    expect(document.activeElement?.getAttribute('data-browse-id')).toBe(guid);
    TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toBe(`${inventoryUrl}?facility=facility-a`)); await settle(view);
    expect(view.inventory().inventory.page()).toBe(2);
    TestBed.inject(Location).forward(); await vi.waitFor(() => expect(view.router.url).toContain('/groups/group-00')); await settle(view);
    expect(view.inventory().filters().search).toBe('pump'); expect(view.inventory().inventory.page()).toBe(1);
    expect(view.store.snapshot()).toEqual(before); expect(view.pairService.ensurePairs).not.toHaveBeenCalled();
    view.fixture.destroy();
  });
  it('carries item search into its group, preselects creation, and rejects foreign group ownership', async () => {
    const view = setup(); await view.router.navigateByUrl(inventoryUrl); await settle(view);
    view.inventory().filtersForm.controls.search.setValue('Pump 00'); await settle(view);
    view.root.querySelector<HTMLAnchorElement>('.portfolio-tile__name')!.click(); await settle(view);
    expect(view.inventory().filters().search).toBe('Pump 00'); expect(view.root.querySelectorAll('tbody tr')).toHaveLength(1);
    await page.getByRole('button', { name: 'Add energy use', exact: true }).click(); await settle(view);
    expect(view.root.querySelector('app-create-energy-use-drawer #energy-use-name')).not.toBeNull();
    expect(view.root.querySelector('app-create-energy-use-drawer')?.textContent).toContain('Pump 00');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await settle(view);
    await view.router.navigateByUrl('/v1/workspace/facility/facility-b/data/energy-uses/groups/group-00'); await settle(view);
    expect(view.root.textContent).toContain('Energy-use group unavailable'); expect(view.root.querySelector('tbody')).toBeNull();
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
      const source = [...tile.querySelectorAll('dt')].find(label => label.textContent === 'Sources')!.nextElementSibling as HTMLElement;
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
