import { BulkActionsComponent } from './bulk-actions/bulk-actions.component';
import { BrowseStateService } from '@app/v1/shared/navigation/browse-state/browse-state.service';
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
import type { EnergyUseBatchChange } from '@data/account-workspace/handlers/energy-use-command.models';
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
const groupUrl = (guid = 'group-00', facility = 'facility-a') => `/v1/workspace/facility/${facility}/data/energy-uses/groups/${guid}`;
const itemUrl = `${groupUrl()}/items/energy-00`;
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
  const actions = { updateSetup: vi.fn(async (_identity, value) => value), updateGroupSettings: vi.fn(async (identity, value) => {
    store.publish({ ...store.snapshot()!, energyUseGroups: store.energyUseGroups().map(group => group.guid === identity.energyUseGroupGuid ? { ...group, ...value } : group) }); return value;
  }) };
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
  it('shows distinct group type icons, makes Summary an item-link list, and opens a workbench directly', async () => {
    const view = setup();
    view.store.publish({ ...view.snapshot, energyUseGroups: [energyUseGroup(), energyUseGroup({ guid: 'empty', name: 'Unused group' })], energyUseEquipment: [
      energyUseItem(), energyUseItem({ guid: 'pump-b', name: 'Pump B' }), energyUseItem({ guid: 'fan', name: 'Fan A', equipmentType: 'Fan' }), energyUseItem({ guid: 'other', name: 'Other A', equipmentType: 'Other' })] });
    const before = structuredClone(view.store.snapshot());
    await view.router.navigateByUrl(inventoryUrl); await settle(view);
    const card = () => view.root.querySelector<HTMLElement>('.portfolio-inventory .portfolio-tile')!;
    expect(card().querySelectorAll('.portfolio-tile__equipment-types li')).toHaveLength(3);
    expect(card().querySelector('.portfolio-tile__status')).toBeNull();
    expect(card().querySelector('.energy-use-group-snapshot__items')).toBeNull();
    view.inventory().inventory.detailControl.setValue('summary'); await settle(view);
    expect(card().querySelector('dl')).toBeNull();
    const links = [...card().querySelectorAll<HTMLAnchorElement>('.energy-use-group-snapshot__items a')];
    expect(links.map(link => link.textContent?.trim())).toEqual(['Fan A', 'Other A', 'Pump A', 'Pump B']);
    expect(links.every(link => !!link.querySelector('app-ui-icon'))).toBe(true);
    for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
      await page.viewport(width, 850); view.root.className = `v1-root ${theme}`; await settle(view);
      expect(card().scrollWidth).toBeLessThanOrEqual(card().clientWidth + 1);
      expect(textContrast(links[0], card())).toBeGreaterThanOrEqual(4.5);
      await page.screenshot({ element: view.root, path: `../../../../../../tmp/energy-use-pivot/energy-use-group-summary-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
    }
    const pump = links.find(link => link.textContent?.trim() === 'Pump A')!; pump.focus(); await userEvent.keyboard('{Enter}'); await settle(view);
    expect(view.router.url).toBe(`${groupUrl('group-a')}/items/energy-a`);
    TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toBe(inventoryUrl)); await settle(view);
    expect(view.inventory().inventory.detail()).toBe('summary'); expect(view.store.snapshot()).toEqual(before); view.fixture.destroy();
  });

  it('puts Setup Group first, saves group metadata, and guards invalid group drafts when switching tabs', async () => {
    const view = setup();
    await view.router.navigateByUrl(itemUrl); await settle(view);
    const beforeItems = structuredClone(view.store.energyUseEquipment());
    expect([...view.root.querySelectorAll('[aria-label="Energy-use group sections"] button')].map(button => button.textContent?.trim())).toEqual(['Setup Group', 'Energy Use Items']);
    await page.getByRole('button', { name: 'Setup Group', exact: true }).click(); await settle(view);
    expect(view.router.url).toBe(`${groupUrl()}/setup`);
    expect(view.root.querySelector('[aria-label="Energy-use items"]')).toBeNull();
    expect(view.root.querySelector('app-energy-use-settings-fields')).toBeNull();
    const name = page.getByRole('textbox', { name: 'Group name', exact: true }), notes = page.getByRole('textbox', { name: 'Group notes', exact: true });
    await name.fill('Packaging'); await notes.fill('Shared packaging systems'); await settle(view);
    await vi.waitFor(() => expect(view.store.energyUseGroups().find(group => group.guid === 'group-00')?.name).toBe('Packaging')); await settle(view);
    expect(view.root.querySelector('.v1-data-workbench-header h1')?.textContent).toContain('Packaging');
    expect(view.store.energyUseEquipment()).toEqual(beforeItems);
    expect(view.root.querySelector('.v1-data-workbench-header [role=status]')).not.toBeNull();
    for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
      await page.viewport(width, 850); view.root.className = `v1-root ${theme}`; await settle(view);
      expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
      expect(view.root.querySelectorAll('[role=dialog]')).toHaveLength(0);
      await page.screenshot({ element: view.root, path: `../../../../../../tmp/energy-use-group-setup/setup-group-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
    }
    await name.fill(' '); await settle(view);
    const discard = vi.spyOn(TestBed.inject(UnsavedChangesService), 'confirmDiscard').mockReturnValue(false);
    await page.getByRole('button', { name: 'Energy Use Items', exact: true }).click(); await settle(view);
    expect(view.router.url).toBe(`${groupUrl()}/setup`); expect(discard).toHaveBeenCalled();
    await name.fill('Packaging'); await settle(view);
    await page.getByRole('button', { name: 'Energy Use Items', exact: true }).click(); await settle(view);
    expect(view.router.url).toBe(itemUrl);
    expect(view.root.querySelector('input[type=search]')).toBeNull();
    expect(view.root.querySelector('.energy-use-workbench__chips')).toBeNull();
    await page.getByRole('button', { name: 'Setup Group', exact: true }).click(); await settle(view);
    expect(page.getByRole('textbox', { name: 'Group notes', exact: true }).element()).toHaveProperty('value', 'Shared packaging systems');
    view.fixture.destroy();
  });

  it('uses the account-analysis sidebar pattern for all items and a compact top rail in narrow windows', async () => {
    const view = setup();
    view.store.publish({ ...view.snapshot, energyUseGroups: [energyUseGroup()],
      energyUseEquipment: Array.from({ length: 1000 }, (_, index) => energyUseItem({ guid: `item-${index}`, name: `Equipment ${String(index).padStart(4, '0')} with a long process description` })) });
    const before = structuredClone(view.store.snapshot());
    await view.router.navigateByUrl(`${groupUrl('group-a')}?search=no-match`); await settle(view);
    expect(view.root.querySelectorAll('[aria-label="Energy-use items"] button')).toHaveLength(1000);
    expect(view.root.querySelector('.portfolio-inventory')).toBeNull();
    for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
      await page.viewport(width, 850); view.root.className = `v1-root ${theme}`; await settle(view);
      expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
      const strip = view.root.querySelector<HTMLElement>('[aria-label="Energy-use items"]')!;
      expect(strip.closest('aside')).not.toBeNull();
      if (width > 850) {
        expect(strip.scrollHeight).toBeGreaterThan(strip.clientHeight);
        expect(strip.scrollWidth).toBeLessThanOrEqual(strip.clientWidth + 1);
      } else { expect(strip.scrollWidth).toBeGreaterThan(strip.clientWidth); }
      const active = strip.querySelector<HTMLElement>('[aria-current="page"]')!;
      expect(textContrast(active)).toBeGreaterThanOrEqual(4.5);
      await page.screenshot({ element: view.root, path: `../../../../../../tmp/energy-use-item-sidebar/energy-use-group-workbench-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
    }
    expect(view.root.querySelector('input[type=search]')).toBeNull();
    expect(view.root.querySelector('.energy-use-workbench__chips')).toBeNull();
    const last = view.root.querySelector<HTMLButtonElement>('[aria-label="Energy-use items"] button:last-child')!;
    last.focus(); await userEvent.keyboard('{Enter}'); await settle(view);
    expect(view.router.url).toBe(`${groupUrl('group-a')}/items/item-999`);
    const strip = view.root.querySelector<HTMLElement>('[aria-label="Energy-use items"]')!;
    expect(strip.scrollLeft).toBeGreaterThan(0);
    expect(view.store.snapshot()).toEqual(before); view.fixture.destroy();
  });

  it('matches the v0 group table columns and opens the clicked item tab through its name link', async () => {
    const view = setup();
    view.store.publish({ ...view.snapshot, energyUseGroups: [energyUseGroup()], energyUseEquipment: [
      energyUseItem({ guid: 'gas', name: 'Belt Roaster Burner Train', equipmentType: 'Process Heating', notes: 'Main process burner; recirculated hot air.', utilityData: [energyUseSource({ energySource: 'Natural Gas' })] }),
      energyUseItem({ guid: 'fan', name: 'Recirculation Fan', equipmentType: 'Fan', utilityMeterGroupIds: [], notes: 'Trimmed by damper', utilityData: [energyUseSource(), energyUseSource({ energySource: 'Other Energy' })] })
    ] });
    const before = structuredClone(view.store.snapshot());
    const setupUrl = `${groupUrl('group-a')}/setup`;
    await view.router.navigateByUrl(setupUrl); await settle(view);
    const table = view.root.querySelector('app-energy-use-bulk-actions table')!;
    expect([...table.querySelectorAll('thead th')].map(cell => cell.textContent?.trim())).toEqual(['', 'Name', 'Industrial System', 'Utility Types', 'Notes']);
    expect(table.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(table.querySelectorAll('tbody th app-ui-icon')).toHaveLength(2);
    const toolbar = view.root.querySelector<HTMLElement>('.bulk-actions')!, actions = toolbar.querySelector<HTMLElement>('.bulk-actions__buttons')!;
    const actionButtons = [...actions.querySelectorAll<HTMLButtonElement>('button')];
    expect(actionButtons.map(button => button.textContent?.trim())).toEqual(['Add energy use', 'Add year', 'Delete selected']);
    expect(actionButtons[0].disabled).toBe(false); expect(actionButtons.slice(1).every(button => button.disabled)).toBe(true);
    expect(view.root.querySelector('.v1-data-workbench-header')?.textContent).not.toContain('Add energy use');
    expect(actions.textContent).not.toContain('Copy year'); expect(actions.textContent).not.toContain('Remove year');

    expect(table.textContent).toContain('Process Heating'); expect(table.textContent).toContain('Natural Gas');
    expect(table.textContent).toContain('Main process burner; recirculated hot air.');
    const link = page.getByRole('link', { name: 'Recirculation Fan', exact: true });
    expect(link.element().getAttribute('href')).toBe(`${groupUrl('group-a')}/items/fan`);
    for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
      await page.viewport(width, 850); view.root.className = `v1-root ${theme}`; await settle(view);
      expect(view.root.scrollWidth).toBeLessThanOrEqual(view.root.clientWidth + 1);
      expect(Math.abs(actions.getBoundingClientRect().right - toolbar.getBoundingClientRect().right)).toBeLessThan(2);
      const region = view.root.querySelector<HTMLElement>('[aria-label="Energy use equipment table"]')!;
      expect(region.scrollWidth).toBeLessThanOrEqual(region.clientWidth + 1);
      expect([...table.querySelectorAll('tbody td, tbody th')].every(cell => getComputedStyle(cell).verticalAlign === 'middle')).toBe(true);
      expect(textContrast(link.element() as HTMLElement, table as HTMLElement)).toBeGreaterThanOrEqual(4.5);
      await page.screenshot({ element: view.root, path: `../../../../../../tmp/energy-use-group-table/group-table-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
    }
    (link.element() as HTMLElement).focus(); await userEvent.keyboard('{Enter}'); await settle(view);
    expect(view.router.url).toBe(`${groupUrl('group-a')}/items/fan`);
    expect(view.root.querySelector('[aria-label="Energy-use group sections"] [aria-current="page"]')?.textContent).toContain('Energy Use Items');
    expect(view.root.querySelector('[aria-label="Energy-use items"] [aria-current="page"]')?.textContent).toContain('Recirculation Fan');
    TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toBe(setupUrl)); await settle(view);
    expect(view.store.snapshot()).toEqual(before); view.fixture.destroy();
  });

  it('hosts inline management in Setup Group and contains confirmation focus before returning to selection', async () => {
    const view = setup();
    view.store.publish({ ...view.snapshot, energyUseGroups: [energyUseGroup()], energyUseEquipment: [energyUseItem(), energyUseItem({ guid: 'fan', name: 'Fan' })] });
    await view.router.navigateByUrl(`${groupUrl('group-a')}/setup`); await settle(view);
    expect(view.root.querySelector('[aria-label="Energy-use items"]')).toBeNull();
    expect(view.root.querySelector('[role=dialog]')).toBeNull();
    const checkbox = page.getByRole('checkbox', { name: 'Select Pump A', exact: true });
    (checkbox.element() as HTMLElement).focus(); await userEvent.keyboard(' '); await settle(view);
    const component = view.fixture.debugElement.query(By.directive(BulkActionsComponent)).componentInstance as BulkActionsComponent;
    expect(component.selection.selected()).toEqual(['energy-a']);
    expect(view.root.querySelector('input[type=search]')).toBeNull();
    const deleteButton = page.getByRole('button', { name: 'Delete selected', exact: true });
    await deleteButton.click(); await settle(view);
    const dialog = page.getByRole('dialog', { name: 'Update selected energy uses', exact: true });
    await userEvent.keyboard('{Tab}{Shift>}{Tab}{/Shift}');
    expect(dialog.element().contains(document.activeElement)).toBe(true);
    expect(await view.router.navigateByUrl(inventoryUrl)).toBe(false);
    await dialog.getByRole('button', { name: 'Cancel bulk action', exact: true }).click(); await settle(view);
    expect(document.activeElement).toBe(deleteButton.element());
    expect(view.actions.updateSetup).not.toHaveBeenCalled(); view.fixture.destroy();
  });

  it('guides selected equipment through annual drafts and saves one complete batch', async () => {
    const view = setup();
    const conditions = [{ year: 2024, hoursOfOperation: 2000, loadFactor: 50, dutyFactor: 100, efficiency: 100 }];
    view.store.publish({ ...view.snapshot, facilities: view.snapshot.facilities.map(facility => ({ ...facility, energyUnit: 'kWh' })),
      energyUseGroups: [energyUseGroup()], energyUseEquipment: [energyUseItem({ operatingConditionsData: conditions }),
        energyUseItem({ guid: 'fan', name: 'Fan', operatingConditionsData: conditions })] });
    const original = structuredClone(view.store.energyUseEquipment());
    const applyBatch = vi.fn(async (_accountGuid: string, changes: readonly EnergyUseBatchChange[]) => {
      const replacements = new Map(changes.map(row => [row.before.guid, row.after]));
      view.store.publish({ ...view.store.snapshot()!, energyUseEquipment: view.store.energyUseEquipment().map(item => replacements.get(item.guid) ?? item) });
    });
    Object.assign(view.actions, { applyBatch });
    await view.router.navigateByUrl(`${groupUrl('group-a')}/setup`); await settle(view);
    await page.getByRole('checkbox', { name: 'Select Pump A', exact: true }).click(); await settle(view);
    await page.getByRole('button', { name: 'Add year', exact: true }).click(); await settle(view);

    const dialog = page.getByRole('dialog', { name: 'Add year data', exact: true });
    expect(dialog.getByRole('button', { name: '2024', exact: true }).element()).toBeTruthy();
    expect(dialog.element().textContent).not.toContain('Save all');
    expect(applyBatch).not.toHaveBeenCalled();
    expect(view.store.energyUseEquipment()).toEqual(original);
    await dialog.getByRole('button', { name: 'Other', exact: true }).click(); await settle(view);
    await dialog.getByRole('spinbutton', { name: 'Fiscal year', exact: true }).fill('2025');
    await dialog.getByRole('button', { name: 'Next item', exact: true }).click(); await settle(view);
    expect(dialog.getByRole('heading', { name: 'Pump A', exact: true }).element()).toBeTruthy();
    expect(dialog.element().textContent).toContain('1 of 1');
    await dialog.getByRole('spinbutton', { name: 'Operating hours for 2025', exact: true }).fill('3000'); await settle(view);
    expect(applyBatch).not.toHaveBeenCalled();
    expect(view.store.energyUseEquipment()).toEqual(original);

    await dialog.getByRole('button', { name: 'Save all', exact: true }).click(); await settle(view);
    expect(applyBatch).toHaveBeenCalledTimes(1);
    expect(applyBatch.mock.calls[0][0]).toBe('account-a');
    expect(applyBatch.mock.calls[0][1]).toHaveLength(1);
    expect(applyBatch.mock.calls[0][1][0].before.guid).toBe('energy-a');
    const saved = view.store.energyUseEquipment().find(item => item.guid === 'energy-a')!;
    expect(saved.operatingConditionsData).toEqual([...original[0].operatingConditionsData, { ...conditions[0], year: 2025, hoursOfOperation: 3000 }]);
    expect(view.store.energyUseEquipment().find(item => item.guid === 'fan')).toEqual(original[1]);
    expect((page.getByRole('checkbox', { name: 'Select Pump A', exact: true }).element() as HTMLInputElement).checked).toBe(false);
    expect(view.root.querySelector('[role=dialog]')).toBeNull();
    expect(view.router.url).toBe(`${groupUrl('group-a')}/setup`);
    view.fixture.destroy();
  });

  it('shows every table row, reviews direct deletion, and retains the group in Setup Group', async () => {
    const view = setup();
    const snapshot = { ...view.snapshot, energyUseGroups: [energyUseGroup()], energyUseEquipment: Array.from({ length: 30 }, (_, index) => energyUseItem({ guid: `bulk-${index}`, name: `Pump ${index}` })) };
    view.store.publish(snapshot);
    const applyBatch = vi.fn(async (_account, changes) => { const deleted = new Set(changes.filter(row => !row.after).map(row => row.before.guid)); view.store.publish({ ...snapshot, energyUseEquipment: snapshot.energyUseEquipment.filter(item => !deleted.has(item.guid)) }); });
    Object.assign(view.actions, { applyBatch });
    await view.router.navigateByUrl(`${groupUrl('group-a')}/setup`); await settle(view);
    const controller = view.fixture.debugElement.query(By.directive(BulkActionsComponent)).componentInstance as BulkActionsComponent;
    expect(TestBed.inject(ModalPortalService).activePortal()).toBeNull();
    expect(view.root.querySelectorAll('app-energy-use-bulk-actions tbody tr')).toHaveLength(30);
    expect(view.root.querySelector('input[type=search]')).toBeNull();
    expect(view.root.textContent).not.toContain('Choose action');
    await page.getByRole('checkbox', { name: 'Select all energy uses', exact: true }).click(); await settle(view);
    expect(controller.selection.selected()).toHaveLength(30);
    await page.getByRole('button', { name: 'Delete selected', exact: true }).click(); await settle(view);
    expect(TestBed.inject(ModalPortalService).activePortal()).not.toBeNull();
    expect(controller.selection.affected()).toBe(30); expect(applyBatch).not.toHaveBeenCalled();
    const dialog = page.getByRole('dialog', { name: 'Update selected energy uses', exact: true });
    await page.viewport(390, 850); await page.screenshot({ element: dialog.element(), path: '../../../../../../tmp/energy-use-pivot/energy-use-manage-review.png' });
    await dialog.getByRole('button', { name: 'Confirm changes', exact: true }).click(); await settle(view);
    expect(applyBatch).toHaveBeenCalledTimes(1); expect(view.store.energyUseEquipment()).toHaveLength(0); expect(view.store.energyUseGroups()).toHaveLength(1);
    expect(view.router.url).toBe(`${groupUrl('group-a')}/setup`);
    expect(view.root.querySelector('app-setup-group')).not.toBeNull();
    view.fixture.destroy();
  });

  it('keeps the sidebar at group level while item navigation and browser history stay within the workbench', async () => {
    const view = setup(); view.fixture.componentInstance.showNav.set(true);
    view.store.publish({ ...view.snapshot, energyUseGroups: [energyUseGroup()], energyUseEquipment: view.snapshot.energyUseEquipment.map(item => ({ ...item, energyUseGroupId: 'group-a' })) });
    const first = `${groupUrl('group-a')}/items/energy-00`, second = `${groupUrl('group-a')}/items/energy-45`;
    await view.router.navigateByUrl(first); await settle(view);
    await view.router.navigateByUrl(second); await settle(view);
    const sidebar = view.root.querySelector('app-section-nav')!;
    expect(sidebar.querySelectorAll('.v1-nav__nested-items a')).toHaveLength(0);
    expect(sidebar.querySelector('[aria-current="page"]')?.textContent).toContain('Production');
    TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toBe(first)); await settle(view);
    expect(view.root.querySelector('[aria-label="Energy-use items"] [aria-current="page"]')?.textContent).toContain('Pump 00');
    TestBed.inject(Location).forward(); await vi.waitFor(() => expect(view.router.url).toBe(second)); await settle(view);
    expect(sidebar.querySelector('[aria-current="page"]')?.textContent).toContain('Production'); view.fixture.destroy();
  });

  it('preserves orphan access and rejects foreign group ownership', async () => {
    const view = setup();
    view.store.publish({ ...view.snapshot, energyUseGroups: [], energyUseEquipment: view.snapshot.energyUseEquipment.map(item => ({ ...item, energyUseGroupId: 'missing' })) });
    await view.router.navigateByUrl(groupUrl('unavailable')); await settle(view);
    expect(view.root.textContent).toContain('Their saved relationships are preserved');
    expect(view.root.querySelector('app-energy-use-settings-fields')).not.toBeNull();
    await page.getByRole('button', { name: 'Setup Group', exact: true }).click(); await settle(view);
    expect(page.getByRole('button', { name: 'Add energy use', exact: true }).element()).toHaveProperty('disabled', true);
    await view.router.navigateByUrl(groupUrl('group-00', 'facility-b')); await settle(view);
    expect(view.root.textContent).toContain('Energy-use group unavailable'); view.fixture.destroy();
  });

  it.each(['utilities', 'meter-groups'] as const)('closes the %s selection on browser Back between items with identical setup', async kind => {
    const view = setup();
    const group = getNewIdbUtilityMeterGroup('Energy', 'Gas supply', 'facility-a', 'account-a');
    const meter = { ...getNewIdbUtilityMeter('facility-a', 'account-a', true, 'kWh'), source: 'Natural Gas' as const, groupId: group.guid };
    view.store.publish({ ...view.snapshot, meterGroups: [group], meters: [meter], energyUseEquipment: view.snapshot.energyUseEquipment.map(item =>
      ['energy-01', 'energy-02'].includes(item.guid) ? { ...item, energyUseGroupId: 'group-00', utilityMeterGroupIds: [] } : item) });
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
  it('restores the outer inventory filters, page, scroll and focus without filtering workbench members', async () => {
    await page.viewport(1100, 850);
    const view = setup();
    view.store.publish({ ...view.snapshot,
      energyUseEquipment: view.snapshot.energyUseEquipment.filter(item => item.facilityId === 'facility-a').map(item => ({ ...item, energyUseGroupId: 'group-00' })),
      energyUseGroups: view.snapshot.energyUseGroups.map(group => ({ ...group, name: group.guid === 'group-00' ? 'Z Production' : group.name })) });
    const before = structuredClone(view.store.snapshot());
    const outer = `${inventoryUrl}?facility=facility-a`;
    await view.router.navigateByUrl(outer); await settle(view);
    view.inventory().inventory.selectPage(2); await settle(view);
    const groupLink = [...view.root.querySelectorAll<HTMLAnchorElement>('.portfolio-tile__name')].find(link => link.textContent === 'Z Production')!;
    const focusId = groupLink.dataset['browseId']; groupLink.focus(); view.root.scrollTop = 200;
    const scroll = view.root.scrollTop; groupLink.click(); await settle(view);
    expect(view.root.querySelectorAll('[aria-label="Energy-use items"] button')).toHaveLength(49);
    expect(view.root.querySelector('input[type=search]')).toBeNull();
    TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toBe(outer)); await settle(view);
    expect(view.inventory().inventory.page()).toBe(2);
    expect(document.activeElement?.getAttribute('data-browse-id')).toBe(focusId);
    expect(Math.abs(view.root.scrollTop - scroll)).toBeLessThan(5);
    view.inventory().filtersForm.controls.search.setValue('Pump 00'); await settle(view);
    view.root.querySelector<HTMLAnchorElement>('.portfolio-tile__name')!.click(); await settle(view);
    expect(view.root.querySelectorAll('[aria-label="Energy-use items"] button')).toHaveLength(49);
    await page.getByRole('button', { name: 'Setup Group', exact: true }).click(); await settle(view);
    await page.getByRole('button', { name: 'Add energy use', exact: true }).click(); await settle(view);
    expect(view.root.querySelector('app-create-energy-use-drawer #energy-use-name')).not.toBeNull();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await settle(view);
    TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toContain('/items/')); await settle(view);
    TestBed.inject(Location).back(); await vi.waitFor(() => expect(view.router.url).toBe(outer)); await settle(view);
    expect(view.inventory().filters().search).toBe('Pump 00');
    expect(view.store.snapshot()).toEqual(before); view.fixture.destroy();
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
      await page.screenshot({ element: view.root, path: `../../../../../../tmp/energy-use-pivot/energy-uses-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
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
    await page.screenshot({ element: view.root, path: '../../../../../../tmp/energy-use-pivot/energy-use-workbench-narrow-contrast.png' });
    view.fixture.destroy();
  });
});
