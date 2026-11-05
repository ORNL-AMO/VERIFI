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

  it('keeps the creation draft mounted and restores focus after a nested utility selection', async () => {
    const host = mount(EnergyUseCreationPortalHost); await settle(host); host.componentInstance.open(); await settle(host);
    const creation = page.getByRole('dialog', { name: 'Add energy use', exact: true });
    await creation.getByRole('textbox', { name: 'Name', exact: true }).fill('Draft pump');
    await creation.getByRole('button', { name: 'Select Utilities', exact: true }).click(); await settle(host);
    const utilities = page.getByRole('dialog', { name: 'Select Utilities', exact: true });
    const dialogs = [...root.querySelectorAll('[role="dialog"]')];
    expect(dialogs).toHaveLength(2);
    expect(new Set(dialogs.map(dialog => dialog.getAttribute('aria-labelledby'))).size).toBe(2);
    await utilities.getByRole('checkbox', { name: 'Natural Gas', exact: true }).click();
    await utilities.getByRole('button', { name: 'Cancel', exact: true }).click(); await settle(host);
    expect(document.activeElement?.textContent).toContain('Select Utilities');
    expect((creation.getByRole('textbox', { name: 'Name', exact: true }).element() as HTMLInputElement).value).toBe('Draft pump');
    expect(root.querySelectorAll('fieldset')).toHaveLength(1);
    await creation.getByRole('button', { name: 'Select Utilities', exact: true }).click(); await settle(host);
    await utilities.getByRole('checkbox', { name: 'Natural Gas', exact: true }).click();
    await utilities.getByRole('button', { name: 'Confirm', exact: true }).click(); await settle(host);
    expect(root.querySelectorAll('fieldset')).toHaveLength(2);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([]);
    expect((creation.getByRole('textbox', { name: 'Name', exact: true }).element() as HTMLInputElement).value).toBe('Draft pump');
    await creation.getByRole('button', { name: 'Select Utilities', exact: true }).click(); await settle(host);
    await userEvent.keyboard('{Escape}'); await settle(host);
    expect(root.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(document.activeElement?.textContent).toContain('Select Utilities');
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
    expect(page.getByRole('button', { name: 'Select Utilities', exact: true }).element()).toHaveProperty('disabled', true);
    expect(await harness.getAll('utilityMeterData')).toEqual([]);
    const saved = await harness.getAll('facilityEnergyUseEquipment'); await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(saved);
  });

  it('creates without readings, autosaves calculated values, copies full history, and deletes only the confirmed item', async () => {
    const boundary = TestBed.inject(WorkspaceCommandBoundary), committed = vi.fn(); boundary.committedChange$.subscribe(committed);
    const drawer = mount(CreateEnergyUseDrawerComponent); drawer.componentRef.setInput('initialFacilityGuid', facility.guid); drawer.componentRef.setInput('singleFacility', true);
    await settle(drawer);
    let created!: IdbFacilityEnergyUseEquipment; drawer.componentInstance.created.subscribe(item => created = item);
    await page.getByRole('textbox', { name: 'New group name', exact: true }).fill('Production');
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Pump');
    await page.getByRole('button', { name: 'Add energy use', exact: true }).click(); await settle(drawer);
    await vi.waitFor(() => expect(created?.guid).toBeTruthy());
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

  it('preserves imported extra sources, overrides, retirement, and group links through Settings and account/facility backup restoration', async () => {
    const created = await TestBed.inject(EnergyUseActionsService).create({ initialYear: 2025, group: { kind: 'new', name: 'Imported equipment' },
      settings: { name: 'Imported', notes: '', equipmentType: 'Other', sources: [{ energySource: 'Electricity', size: 1, units: 'kW', numberOfEquipment: 1 }], utilityMeterGroupIds: [] } }, account.guid, facility.guid);
    const linked = getNewIdbUtilityMeterGroup('Energy', 'Associated group', facility.guid, account.guid);
    await harness.seed({ utilityMeterGroups: [{ ...linked }] });
    const imported: IdbFacilityEnergyUseEquipment = { ...structuredClone(created), noLongerInUse: { isNoLongerInUse: true, year: 2024 },
      utilityMeterGroupIds: [linked.guid], utilityData: ['Electricity', 'Natural Gas', 'Other Energy'].map((source, index) => ({
        energySource: source as 'Electricity' | 'Natural Gas' | 'Other Energy', units: index === 2 ? 'legacy-unit' : 'kW', size: index, numberOfEquipment: 1,
        energyUse: [{ year: 2021, energyUse: 0, overrideEnergyUse: true, energyUseUnit: 'GJ' }, { year: 2025, energyUse: 123 + index, overrideEnergyUse: false, energyUseUnit: 'GJ' }]
      })) };
    await TestBed.inject(EnergyUseCommandHandler).saveItem({ accountGuid: account.guid, facilityGuid: facility.guid, energyUseGuid: created.guid }, created, imported, false);
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace();
    guid.set(created.guid); const fixture = mount(EnergyUseSettingsComponent); await settle(fixture);
    expect(fixture.componentInstance.form()!.controls.sources.length).toBe(3);
    fixture.componentInstance.form()!.controls.name.setValue('Compatible imported item');
    expect(await fixture.componentInstance.editor.saveNow()).toBe(true); await settle(fixture);
    const store = TestBed.inject(AccountWorkspaceStore), snapshot = store.snapshot()!;
    expect(store.energyUseEquipment()[0].utilityData).toEqual(imported.utilityData);
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
      expect(item.utilityData).toEqual(imported.utilityData); expect(item.noLongerInUse).toEqual(imported.noLongerInUse);
      expect(item.utilityMeterGroupIds).toHaveLength(1);
      expect(groups.find(group => group.guid === item.energyUseGroupId)).toMatchObject({ accountId: item.accountId, facilityId: item.facilityId });
      expect(links.find(group => group.guid === item.utilityMeterGroupIds[0])).toMatchObject({ accountId: item.accountId, facilityId: item.facilityId });
    }
  });
});
