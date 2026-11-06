import { PortalModule, TemplatePortal } from '@angular/cdk/portal';
import { NgComponentOutlet } from '@angular/common';
import { Component, inject, signal, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';
import { page, userEvent } from 'vitest/browser';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { EnergyUseCommandHandler } from '@data/account-workspace/handlers/energy-use-command-handler.service';
import { WorkspaceBackupSnapshotBuilder } from '@data/backup/backup-snapshot-builder.service';
import { JsonBackupSerializer } from '@data/backup/backup-serializer.service';
import { BackupPreparationService } from '@data/backup/backup-preparation.service';
import { BackupImportCommandService } from '@data/backup/backup-import-command.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { IdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { getNewIdbUtilityMeterGroup } from '@data/models/idbModels/utilityMeterGroup';
import { getNewIdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { ModalPortalService } from '@app/v1/shell/modal-portal.service';
import { WorkspaceNavigationService } from '@app/v1/shell/workspace-navigation.service';
import { EnergyUsesModule } from '../../energy-uses.module';
import { EnergyUseActionsService } from '../../energy-use-actions.service';
import { CreateEnergyUseDrawerComponent } from '../../create-energy-use-drawer/create-energy-use-drawer.component';
import { EnergyUseWorkbenchContextService } from '../energy-use-workbench-context.service';
import { EnergyUseSettingsComponent } from './energy-use-settings.component';

@Component({ standalone: true, imports: [PortalModule], template: '<ng-template [cdkPortalOutlet]="modal.activePortal()"/>' })
class EnergyUsePortalHost { readonly modal = inject(ModalPortalService); }

@Component({ standalone: true, imports: [PortalModule, NgComponentOutlet], template: `
  <ng-template #creation><ng-container [ngComponentOutlet]="drawerType" [ngComponentOutletInputs]="drawerInputs"/></ng-template>
  <ng-template [cdkPortalOutlet]="modal.activePortal()"/>` })
class EnergyUseCreationPortalHost {
  readonly drawerType = CreateEnergyUseDrawerComponent;
  readonly drawerInputs = { initialFacilityGuid: 'facility-a', singleFacility: true };
  readonly modal = inject(ModalPortalService);
  private readonly view = inject(ViewContainerRef);
  @ViewChild('creation', { static: true }) creation!: TemplateRef<unknown>;
  open(): void { this.modal.show(new TemplatePortal(this.creation, this.view)); }
}

describe('Energy Uses creation and saved Settings in Chromium', () => {
  let harness: IndexedDbTestHarness;
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a', energyUnit: 'kWh', isSingleFacilityCompany: true };
  const facility = { ...getNewIdbFacility(account), id: 2, guid: 'facility-a', name: 'North plant', fiscalYear: 'calendarYear' as const };
  const guid = signal('');
  let root: HTMLElement;
  let fixtures: ComponentFixture<unknown>[];
  beforeEach(async () => {
    fixtures = []; guid.set('');
    TestBed.configureTestingModule({ imports: [EnergyUsesModule, EnergyUsePortalHost, EnergyUseCreationPortalHost], providers: [provideRouter([]),
      { provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } },
      { provide: WorkspaceNavigationService, useValue: { openFacilityInventory: vi.fn(async () => true) } },
      { provide: EnergyUseWorkbenchContextService, useValue: { energyUseGuid: guid, facilityGuid: signal('facility-a') } }] });
    harness = await IndexedDbTestHarness.create('energy-use-creation-settings');
    await harness.seed({ accounts: [account], facilities: [facility] });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
    root = document.createElement('main'); root.className = 'v1-root'; root.style.overflow = 'auto'; document.body.append(root);
  });
  afterEach(async () => { fixtures.forEach(fixture => fixture.destroy()); root.remove(); vi.restoreAllMocks(); await harness.destroy(); });
  function mount<T>(type: import('@angular/core').Type<T>): ComponentFixture<T> {
    const fixture = TestBed.createComponent(type); fixtures.push(fixture);
    // The browser TestBed renderer otherwise removes earlier fixture roots when mounting the portal host.
    fixture.nativeElement.removeAttribute('id'); root.append(fixture.nativeElement); return fixture;
  }
  async function settle(fixture: ComponentFixture<unknown>): Promise<void> { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); }

  it('keeps simple creation mounted and restores focus after discard review without saving a group early', async () => {
    const host = mount(EnergyUseCreationPortalHost); await settle(host); host.componentInstance.open(); await settle(host);
    const creation = page.getByRole('dialog', { name: 'Add energy use', exact: true });
    await creation.getByRole('button', { name: 'Create energy-use group', exact: true }).click(); await settle(host);
    await creation.getByRole('textbox', { name: 'Group name', exact: true }).fill('Roasting');
    await creation.getByRole('button', { name: 'Use group', exact: true }).click(); await settle(host);
    await creation.getByRole('textbox', { name: 'Energy use name', exact: true }).fill('Draft pump');
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual([]);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([]);
    expect(root.querySelector('app-energy-use-settings-fields')).toBeNull();
    await userEvent.keyboard('{Escape}'); await settle(host);
    const discard = page.getByRole('dialog', { name: 'Discard energy use?', exact: true });
    const dialogs = [...root.querySelectorAll('[role="dialog"]')];
    expect(dialogs).toHaveLength(2);
    expect(new Set(dialogs.map(dialog => dialog.getAttribute('aria-labelledby'))).size).toBe(2);
    await userEvent.keyboard('{Tab}{Shift>}{Tab}{/Shift}');
    expect(discard.element().contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}'); await settle(host);
    expect(root.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(document.activeElement?.id).toBe('energy-use-name');
    expect((creation.getByRole('textbox', { name: 'Energy use name', exact: true }).element() as HTMLInputElement).value).toBe('Draft pump');
    expect(root.querySelector('.creation-selections')?.textContent).toContain('Roasting');
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual([]);
    await creation.getByRole('button', { name: 'Create energy use', exact: true }).click(); await settle(host);
    await vi.waitFor(() => expect(TestBed.inject(AccountWorkspaceStore).energyUseEquipment()).toHaveLength(1));
    expect(TestBed.inject(AccountWorkspaceStore).energyUseEquipment()[0].name).toBe('Draft pump');
    expect(await harness.getAll('facilityEnergyUseGroups')).toHaveLength(1);
  });

  it('derives utilities from confirmed meter groups and preserves saved history when review is cancelled', async () => {
    const groups = ['Electric main', 'Electric duplicate', 'Gas main'].map(name => getNewIdbUtilityMeterGroup('Energy', name, facility.guid, account.guid));
    const meters = groups.map((group, index) => ({ ...getNewIdbUtilityMeter(facility.guid, account.guid, true, 'kWh'),
      groupId: group.guid, source: index === 2 ? 'Natural Gas' as const : 'Electricity' as const }));
    await harness.seed({ utilityMeterGroups: groups.map(group => ({ ...group })), utilityMeter: meters });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace();
    const created = await TestBed.inject(EnergyUseActionsService).create({ initialYear: 2025, group: { kind: 'new', name: 'Equipment' },
      settings: { name: 'Pump', notes: '', equipmentType: 'Pump', sources: [{ energySource: 'Electricity', size: 10, units: 'kW', numberOfEquipment: 1 }], utilityMeterGroupIds: [] } }, account.guid, facility.guid);
    const committed = vi.fn(); TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    guid.set(created.guid); const settings = mount(EnergyUseSettingsComponent), portal = mount(EnergyUsePortalHost); await settle(settings); await settle(portal);
    await page.getByRole('button', { name: 'Select Meter Groups', exact: true }).click(); await settle(portal);
    const selection = page.getByRole('dialog', { name: 'Select Meter Groups', exact: true });
    for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
      await page.viewport(width, 850); root.className = `v1-root ${theme}`; await settle(portal);
      const dialog = selection.element() as HTMLElement;
      expect(dialog.scrollWidth).toBeLessThanOrEqual(dialog.clientWidth + 1);
      await page.screenshot({ element: root, path: `./__screenshots__/meter-groups-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
    }
    await userEvent.keyboard('{Tab}{Shift>}{Tab}{/Shift}');
    expect(selection.element().contains(document.activeElement)).toBe(true);
    await selection.getByRole('checkbox', { name: 'Electric main', exact: true }).click(); await settle(portal);
    expect(selection.getByRole('checkbox', { name: 'Electric duplicate', exact: true }).element()).toHaveProperty('disabled', true);
    await selection.getByRole('checkbox', { name: 'Electric main', exact: true }).click();
    await selection.getByRole('checkbox', { name: 'Gas main', exact: true }).click(); await settle(portal);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([created]);
    await selection.getByRole('button', { name: 'Confirm', exact: true }).click(); await settle(settings); await settle(portal);
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain('2025');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click(); await settle(settings);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([created]); expect(committed).not.toHaveBeenCalled();
    await page.getByRole('button', { name: 'Select Meter Groups', exact: true }).click(); await settle(portal);
    expect(selection.getByRole('checkbox', { name: 'Gas main', exact: true }).element()).toHaveProperty('checked', false);
    await selection.getByRole('checkbox', { name: 'Gas main', exact: true }).click();
    await selection.getByRole('button', { name: 'Confirm', exact: true }).click(); await settle(settings); await settle(portal);
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm utility changes', exact: true }).click(); await settle(settings);
    const store = TestBed.inject(AccountWorkspaceStore);
    await vi.waitFor(() => expect(store.energyUseEquipment()[0].utilityMeterGroupIds).toEqual([groups[2].guid]));
    expect(store.energyUseEquipment()[0].utilityData.map(source => source.energySource)).toEqual(['Natural Gas']);
    expect(store.energyUseEquipment()[0].operatingConditionsData).toEqual(created.operatingConditionsData);
    expect(committed).toHaveBeenCalledTimes(1);
    expect(page.getByRole('button', { name: 'Select Utilities', exact: true }).element()).toHaveProperty('disabled', false);
    const savedLinked = structuredClone(store.energyUseEquipment()[0]);
    for (const confirm of [false, true]) {
      await page.getByRole('button', { name: 'Select Utilities', exact: true }).click(); await settle(portal);
      const utilities = page.getByRole('dialog', { name: 'Select Utilities', exact: true });
      await utilities.getByRole('checkbox', { name: 'Electricity', exact: true }).click();
      await utilities.getByRole('button', { name: 'Confirm', exact: true }).click(); await settle(settings); await settle(portal);
      const review = page.getByRole('dialog', { name: 'Confirm utility changes?', exact: true });
      expect(review.element().textContent).toContain('Gas main');
      if (!confirm) {
        await review.getByRole('button', { name: 'Cancel', exact: true }).click(); await settle(settings);
        expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([savedLinked]);
      } else {
        await review.getByRole('button', { name: 'Confirm utility changes', exact: true }).click(); await settle(settings);
        await vi.waitFor(() => expect(store.energyUseEquipment()[0].utilityMeterGroupIds).toEqual([]));
        expect(store.energyUseEquipment()[0].utilityData.map(source => source.energySource).sort()).toEqual(['Electricity', 'Natural Gas']);
        expect(store.energyUseEquipment()[0].utilityData.find(source => source.energySource === 'Natural Gas')?.energyUse).toEqual(savedLinked.utilityData[0].energyUse);
        expect(await harness.getAll('utilityMeterGroups')).toHaveLength(3);
      }
    }
    expect(await harness.getAll('utilityMeterData')).toEqual([]);
    const saved = await harness.getAll('facilityEnergyUseEquipment'); await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(saved);
  });

  it('creates without readings, autosaves calculated values, copies full history, and deletes only the confirmed item', async () => {
    const existingGroup = { ...getNewIdbFacilityEnergyUseGroup(account.guid, facility.guid), name: 'Production' };
    await harness.seed({ facilityEnergyUseGroups: [existingGroup] });
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace();
    const boundary = TestBed.inject(WorkspaceCommandBoundary), committed = vi.fn(); boundary.committedChange$.subscribe(committed);
    const drawer = mount(CreateEnergyUseDrawerComponent); drawer.componentRef.setInput('initialFacilityGuid', facility.guid); drawer.componentRef.setInput('singleFacility', true);
    await settle(drawer);
    let created!: IdbFacilityEnergyUseEquipment; drawer.componentInstance.created.subscribe(item => created = item);
    await page.getByRole('button', { name: 'Production', exact: true }).click(); await settle(drawer);
    await page.getByRole('textbox', { name: 'Energy use name', exact: true }).fill('Pump');
    await page.getByRole('button', { name: 'Create energy use', exact: true }).click(); await settle(drawer);
    await vi.waitFor(() => expect(created?.guid).toBeTruthy());
    expect(created.energyUseGroupId).toBe(existingGroup.guid);
    expect(created.guid).toBeTruthy(); expect(committed).toHaveBeenCalledTimes(1);
    expect(await harness.getAll('utilityMeterData')).toEqual([]);
    const before = await harness.getAll('facilityEnergyUseEquipment');
    drawer.destroy(); drawer.nativeElement.remove(); guid.set(created.guid);
    const settings = mount(EnergyUseSettingsComponent); await settle(settings);
    expect(settings.componentInstance.editor.dirty()).toBe(false); expect(committed).toHaveBeenCalledTimes(1);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(before);
    await page.getByRole('spinbutton', { name: 'Rated capacity', exact: true }).fill('10');
    await vi.waitFor(() => expect(settings.componentInstance.editor.state()).toBe('saved'), { timeout: 5000 }); await settle(settings);
    const store = TestBed.inject(AccountWorkspaceStore), saved = store.energyUseEquipment()[0];
    expect(saved.utilityData[0].energyUse[0].energyUse).toBe(87600); expect(committed).toHaveBeenCalledTimes(2);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    await settings.componentInstance.copy(); await settle(settings);
    const copy = store.energyUseEquipment().find(item => item.guid !== created.guid)!;
    expect(copy.utilityData).toEqual(saved.utilityData); expect(copy.operatingConditionsData).toEqual(saved.operatingConditionsData);
    expect(copy.energyUseGroupId).toBe(saved.energyUseGroupId); expect(committed).toHaveBeenCalledTimes(3);
    const portal = mount(EnergyUsePortalHost); await settle(portal);
    await page.getByRole('button', { name: 'Delete energy use', exact: true }).click(); await settle(portal);
    expect(root.querySelector('[role="dialog"]')).not.toBeNull();
    await page.getByRole('dialog').getByRole('button', { name: 'Delete energy use', exact: true }).click(); await settle(settings);
    await vi.waitFor(() => expect(store.energyUseEquipment().map(item => item.guid)).toEqual([copy.guid]));
    expect(store.energyUseEquipment().map(item => item.guid)).toEqual([copy.guid]); expect(committed).toHaveBeenCalledTimes(4);
    const persisted = await harness.getAll('facilityEnergyUseEquipment');
    fixtures.forEach(fixture => fixture.destroy()); fixtures = [];
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(persisted);
    expect(await harness.getAll('facilityEnergyUseGroups')).toHaveLength(1);
  });

  it('keeps source-removal review above the workspace, contains focus, and restores the opener on cancel', async () => {
    const created = await TestBed.inject(EnergyUseActionsService).create({ initialYear: 2025, group: { kind: 'new', name: 'Equipment' },
      settings: { name: 'Pump', notes: '', equipmentType: 'Pump', sources: [{ energySource: 'Electricity', size: 10, units: 'kW', numberOfEquipment: 1 }], utilityMeterGroupIds: [] } }, account.guid, facility.guid);
    guid.set(created.guid); const settings = mount(EnergyUseSettingsComponent), portal = mount(EnergyUsePortalHost); await settle(settings); await settle(portal);
    for (const [width, theme] of [[1200, ''], [390, 'v1-theme-dark'], [390, 'v1-theme-dark v1-contrast-strong']] as const) {
      await page.viewport(width, 850); root.className = `v1-root ${theme}`; await settle(settings);
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth + 1);
      expect(root.querySelectorAll('select:not(.v1-select)')).toHaveLength(0);
      await page.screenshot({ element: root, path: `./__screenshots__/settings-${width}-${theme.includes('contrast') ? 'contrast' : theme ? 'dark' : 'light'}.png` });
    }
    await page.getByRole('button', { name: 'Select Utilities', exact: true }).click(); await settle(settings); await settle(portal);
    const utilities = page.getByRole('dialog', { name: 'Select Utilities', exact: true });
    await utilities.getByRole('checkbox', { name: 'Electricity', exact: true }).click(); await settle(portal);
    expect(TestBed.inject(AccountWorkspaceStore).energyUseEquipment()[0].utilityData).toHaveLength(1);
    await utilities.getByRole('button', { name: 'Confirm', exact: true }).click(); await settle(settings); await settle(portal);
    expect(root.querySelector('[role="dialog"]')?.textContent).toContain('2025');
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm utility changes', exact: true }).click(); await settle(settings);
    await vi.waitFor(() => expect(TestBed.inject(AccountWorkspaceStore).energyUseEquipment()[0].utilityData).toEqual([]));
    expect(TestBed.inject(AccountWorkspaceStore).energyUseEquipment()[0].operatingConditionsData).toHaveLength(1);
    settings.componentInstance.editor.discard(); await settle(settings);
    settings.componentInstance.requestDelete(); await settle(portal);
    const cancel = page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }); await cancel.click(); await settle(portal);
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    settings.componentInstance.requestDelete(); await settle(portal);
    await userEvent.keyboard('{Tab}{Shift>}{Tab}{/Shift}');
    expect(root.querySelector('[role="dialog"]')!.contains(document.activeElement)).toBe(true);
    await userEvent.keyboard('{Escape}'); await settle(portal); expect(root.querySelector('[role="dialog"]')).toBeNull();
  });

  it('edits annual assumptions and manual zeroes, adds and copies complete years, and reviews removal through rendered controls', async () => {
    const actions = TestBed.inject(EnergyUseActionsService);
    const created = await actions.create({ initialYear: 2024, group: { kind: 'new', name: 'Production' }, settings: {
      name: 'Annual test pump', notes: '', equipmentType: 'Pump', utilityMeterGroupIds: [],
      sources: [{ energySource: 'Electricity', size: 5, units: 'kW', numberOfEquipment: 1 }] } }, account.guid, facility.guid);
    guid.set(created.guid);
    const fixture = mount(EnergyUseSettingsComponent), portal = mount(EnergyUsePortalHost); await settle(fixture); await settle(portal);
    const store = TestBed.inject(AccountWorkspaceStore), current = () => store.energyUseEquipment().find(item => item.guid === created.guid)!;
    await page.getByRole('spinbutton', { name: 'Operating hours for 2024', exact: true }).fill('1000');
    await vi.waitFor(() => expect(current().operatingConditionsData[0].hoursOfOperation).toBe(1000));
    await page.getByRole('button', { name: 'Use manual consumption for Electricity in 2024', exact: true }).click();
    await vi.waitFor(() => expect(current().utilityData[0].energyUse[0].overrideEnergyUse).toBe(true));
    await page.getByRole('spinbutton', { name: 'Electricity consumption for 2024', exact: true }).fill('0');
    await vi.waitFor(() => expect(current().utilityData[0].energyUse[0].energyUse).toBe(0));
    await page.getByRole('button', { name: 'Add year', exact: true }).click(); await settle(portal);
    const add = page.getByRole('dialog', { name: 'Add fiscal year', exact: true });
    await add.getByRole('spinbutton', { name: 'Fiscal year', exact: true }).fill('2025');
    await add.getByRole('button', { name: 'Add year', exact: true }).click();
    await vi.waitFor(() => expect(current().operatingConditionsData).toHaveLength(2)); await settle(fixture);
    await page.getByRole('region', { name: '2024', exact: true }).getByRole('button', { name: 'Copy year', exact: true }).click(); await settle(portal);
    const copy = page.getByRole('dialog', { name: 'Copy fiscal year', exact: true });
    await copy.getByRole('spinbutton', { name: 'Fiscal year', exact: true }).fill('2026');
    await copy.getByRole('button', { name: 'Copy year', exact: true }).click();
    await vi.waitFor(() => expect(current().operatingConditionsData).toHaveLength(3)); await settle(fixture);
    expect(current().utilityData[0].energyUse.find(row => row.year === 2026)).toMatchObject({ energyUse: 0, overrideEnergyUse: true, energyUseUnit: 'kWh' });
    await page.getByRole('region', { name: '2025', exact: true }).getByRole('button', { name: 'Remove year', exact: true }).click(); await settle(portal);
    await userEvent.keyboard('{Escape}'); await settle(portal); expect(current().operatingConditionsData).toHaveLength(3);
    await page.getByRole('region', { name: '2025', exact: true }).getByRole('button', { name: 'Remove year', exact: true }).click(); await settle(portal);
    await page.getByRole('dialog', { name: 'Remove fiscal year?', exact: true }).getByRole('button', { name: 'Remove year', exact: true }).click();
    await vi.waitFor(() => expect(current().operatingConditionsData.map(row => row.year)).toEqual([2024, 2026]));
    expect(current().utilityData[0].energyUse.map(row => row.year)).toEqual([2024, 2026]);
    const saved = structuredClone(current());
    fixtures.forEach(fixture => fixture.destroy()); fixtures = []; await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([saved]);
  });

  it('saves combined annual edits and preserves imported history and relationships through account/facility backup restoration', async () => {
    const created = await TestBed.inject(EnergyUseActionsService).create({ initialYear: 2025, group: { kind: 'new', name: 'Imported equipment' },
      settings: { name: 'Imported', notes: '', equipmentType: 'Other', sources: [{ energySource: 'Electricity', size: 1, units: 'kW', numberOfEquipment: 1 }], utilityMeterGroupIds: [] } }, account.guid, facility.guid);
    const linked = getNewIdbUtilityMeterGroup('Energy', 'Associated group', facility.guid, account.guid);
    await harness.seed({ utilityMeterGroups: [{ ...linked }] });
    const imported: IdbFacilityEnergyUseEquipment = { ...structuredClone(created), noLongerInUse: { isNoLongerInUse: true, year: 2024 },
      utilityMeterGroupIds: [linked.guid], operatingConditionsData: created.operatingConditionsData.map(row => ({ ...row, hoursPerDay: 8, daysPerWeek: 5, weeksPerYear: 50 })),
      utilityData: ['Electricity', 'Natural Gas', 'Other Energy'].map((source, index) => ({
        energySource: source as 'Electricity' | 'Natural Gas' | 'Other Energy', units: index === 2 ? 'legacy-unit' : 'kW', size: index, numberOfEquipment: 1,
        energyUse: [{ year: 2021, energyUse: 0, overrideEnergyUse: true, energyUseUnit: 'GJ' }, { year: 2025, energyUse: 123 + index, overrideEnergyUse: false, energyUseUnit: 'GJ' }]
      })) };
    await TestBed.inject(EnergyUseCommandHandler).saveItem({ accountGuid: account.guid, facilityGuid: facility.guid, energyUseGuid: created.guid }, created, imported, false);
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace();
    guid.set(created.guid); const fixture = mount(EnergyUseSettingsComponent); await settle(fixture);
    expect(fixture.componentInstance.form()!.controls.settings.controls.sources.length).toBe(3);
    fixture.componentInstance.form()!.controls.settings.controls.name.setValue('Compatible imported item');
    expect(await fixture.componentInstance.editor.saveNow()).toBe(true); await settle(fixture);
    const store = TestBed.inject(AccountWorkspaceStore);
    expect(store.energyUseEquipment()[0].utilityData).toEqual(imported.utilityData);
    const form = fixture.componentInstance.form()!;
    form.patchValue({ settings: { name: 'Combined imported setup' },
      conditions: form.controls.conditions.getRawValue().map(row => ({ ...row, hoursOfOperation: 2000 })),
      consumption: form.controls.consumption.getRawValue().map((source, index) => ({ ...source,
        entries: source.entries.map(row => row.year === 2025 ? { ...row, overrideEnergyUse: true, energyUse: index * 10 } : row) })) });
    expect(await fixture.componentInstance.editor.saveNow()).toBe(true); await settle(fixture);
    const saved = structuredClone(store.energyUseEquipment()[0]), snapshot = store.snapshot()!;
    expect(saved.name).toBe('Combined imported setup');
    expect(saved.operatingConditionsData[0]).toMatchObject({ hoursOfOperation: 2000, hoursPerDay: 8, daysPerWeek: 5, weeksPerYear: 50 });
    expect(saved.utilityData.map(source => source.energyUse[0])).toEqual(imported.utilityData.map(source => source.energyUse[0]));
    expect(saved.utilityData.map(source => source.energyUse[1])).toEqual([0, 10, 20].map(energyUse => ({ year: 2025, energyUse, overrideEnergyUse: true, energyUseUnit: 'GJ' })));
    const builder = TestBed.inject(WorkspaceBackupSnapshotBuilder), serializer = TestBed.inject(JsonBackupSerializer), prepare = TestBed.inject(BackupPreparationService);
    const accountBackup = prepare.prepare(JSON.parse(serializer.serialize(builder.buildAccountBackup(snapshot))));
    const facilityBackup = prepare.prepare(JSON.parse(serializer.serialize(builder.buildFacilityBackup(snapshot, facility.guid))));
    const importer = TestBed.inject(BackupImportCommandService);
    const restoredAccount = await importer.importAccountBackupFile(accountBackup, 0);
    await importer.importFacilityBackupFile(facilityBackup, account.guid, 0);
    fixtures.forEach(fixture => fixture.destroy()); fixtures = []; await harness.reopen();
    const items = await harness.getAll<any>('facilityEnergyUseEquipment'), groups = await harness.getAll<any>('facilityEnergyUseGroups'), links = await harness.getAll<any>('utilityMeterGroups');
    const restored = items.filter(item => item.guid !== created.guid);
    expect(restored).toHaveLength(2); expect(restored.some(item => item.accountId === restoredAccount.guid)).toBe(true);
    for (const item of restored) {
      expect(item.name).toBe(saved.name); expect(item.operatingConditionsData).toEqual(saved.operatingConditionsData);
      expect(item.utilityData).toEqual(saved.utilityData); expect(item.noLongerInUse).toEqual(imported.noLongerInUse);
      expect(item.utilityMeterGroupIds).toHaveLength(1);
      expect(groups.find(group => group.guid === item.energyUseGroupId)).toMatchObject({ accountId: item.accountId, facilityId: item.facilityId });
      expect(links.find(group => group.guid === item.utilityMeterGroupIds[0])).toMatchObject({ accountId: item.accountId, facilityId: item.facilityId });
    }
  });
});
