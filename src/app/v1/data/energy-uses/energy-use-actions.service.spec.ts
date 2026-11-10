import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { EnergyUseCommandHandler } from '@data/account-workspace/handlers/energy-use-command-handler.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { EditorConflictError } from '@app/v1/data/editing/draft-reconciliation';
import { energyUseFacility, energyUseGroup, energyUseItem } from './energy-uses.testing';
import { energyUseSetup } from './models/energy-use-setup.models';
import { EnergyUseActionsService } from './energy-use-actions.service';

describe('Energy Use actions', () => {
  const identity = { accountGuid: 'account-a', facilityGuid: 'facility-a', energyUseGuid: 'energy-a' };
  function setup() {
    const store = { account: signal({ guid: 'account-a' }), canWrite: signal(true), facilities: signal([{ ...energyUseFacility(), energyUnit: 'kWh' }]),
      energyUseEquipment: signal([energyUseItem({ id: 1, utilityMeterGroupIds: [] })]), energyUseGroups: signal([energyUseGroup()]),
      meterGroups: signal([]), meters: signal([]) };
    const handler = { createItem: vi.fn(async (_owner, item) => item), copyItem: vi.fn(async (_identity, _before, copy) => copy),
      saveItem: vi.fn(async (_identity, _before, updated) => updated),
      saveGroupSettings: vi.fn(async (_identity, before, value) => ({ ...before, ...value })), deleteItem: vi.fn(async () => {}), deleteGroupWithItems: vi.fn(async () => {}) };
    let prepare = () => {};
    const boundary = { execute: vi.fn(async (_options, persist) => { prepare(); return { value: await persist() }; }) };
    TestBed.configureTestingModule({ providers: [{ provide: AccountWorkspaceStore, useValue: store },
      { provide: EnergyUseCommandHandler, useValue: handler }, { provide: WorkspaceCommandBoundary, useValue: boundary }] });
    return { service: TestBed.inject(EnergyUseActionsService), store, handler, boundary, beforePersist: (callback: () => void) => prepare = callback };
  }
  it('queues one reviewed group deletion and rejects a group changed before execution', async () => {
    const { service, store, handler, boundary, beforePersist } = setup();
    const groupIdentity = { ...identity, energyUseGroupGuid: 'group-a' };
    const group = structuredClone(store.energyUseGroups()[0]), members = structuredClone(store.energyUseEquipment());
    await service.deleteGroup(groupIdentity, group, members);
    expect(handler.deleteGroupWithItems).toHaveBeenCalledWith(groupIdentity, group, members);
    expect(boundary.execute).toHaveBeenCalledWith(expect.objectContaining({ entityKind: 'energyUseGroup', changeKind: 'delete' }), expect.any(Function));
    handler.deleteGroupWithItems.mockClear();
    beforePersist(() => store.energyUseGroups.set([{ ...group, notes: 'Changed since review' }]));
    await expect(service.deleteGroup(groupIdentity, group, members)).rejects.toThrow('Review its deletion');
    expect(handler.deleteGroupWithItems).not.toHaveBeenCalled();
  });
  it('merges group metadata into the queued latest group while preserving non-editor fields', async () => {
    const { service, store, handler, boundary, beforePersist } = setup();
    beforePersist(() => store.energyUseGroups.set([{ ...store.energyUseGroups()[0], notes: 'Elsewhere', color: '#abc' }]));
    await service.updateGroupSettings({ accountGuid: 'account-a', facilityGuid: 'facility-a', energyUseGroupGuid: 'group-a' },
      { name: ' Packaging ', notes: '' }, { name: 'Production', notes: '' }, 'group-editor');
    expect(handler.saveGroupSettings).toHaveBeenCalledWith(expect.objectContaining({ energyUseGroupGuid: 'group-a' }),
      expect.objectContaining({ color: '#abc', notes: 'Elsewhere' }), { name: 'Packaging', notes: 'Elsewhere' });
    expect(boundary.execute).toHaveBeenCalledWith(expect.objectContaining({ entityKind: 'energyUseGroup', ownerId: 'group-editor' }), expect.any(Function));
    expect(handler.saveItem).not.toHaveBeenCalled();
  });
  it('rejects conflicting group names and foreign group ownership without writing', async () => {
    const { service, store, handler } = setup();
    const identity = { accountGuid: 'account-a', facilityGuid: 'facility-a', energyUseGroupGuid: 'group-a' };
    store.energyUseGroups.set([{ ...store.energyUseGroups()[0], name: 'Saved' }]);
    await expect(service.updateGroupSettings(identity, { name: 'Local', notes: '' }, { name: 'Production', notes: '' }, 'group-editor')).rejects.toBeInstanceOf(EditorConflictError);
    store.energyUseGroups.set([{ ...store.energyUseGroups()[0], facilityId: 'other' }]);
    await expect(service.updateGroupSettings(identity, { name: 'Local', notes: '' }, { name: 'Saved', notes: '' }, 'group-editor')).rejects.toThrow('no longer available');
    expect(handler.saveGroupSettings).not.toHaveBeenCalled();
  });
  it('merges into the queued latest record and retains its new annual values', async () => {
    const { service, store, handler, beforePersist } = setup(), base = energyUseSetup(store.energyUseEquipment()[0]);
    beforePersist(() => { const item = structuredClone(store.energyUseEquipment()[0]); item.utilityData[0].energyUse[0].energyUse = 456; item.notes = 'Elsewhere'; store.energyUseEquipment.set([item]); });
    await service.updateSetup(identity, { ...base, name: 'New' }, base, 'editor-a');
    expect(handler.saveItem.mock.calls[0][2]).toMatchObject({ name: 'New', notes: 'Elsewhere', utilityData: [expect.objectContaining({ energyUse: [expect.objectContaining({ energyUse: 456 })] })] });
  });
  it('rejects overlapping metadata changes without writing', async () => {
    const { service, store, handler, beforePersist } = setup(), base = energyUseSetup(store.energyUseEquipment()[0]);
    beforePersist(() => store.energyUseEquipment.set([{ ...store.energyUseEquipment()[0], name: 'Saved' }]));
    await expect(service.updateSetup(identity, { ...base, name: 'Local' }, base, 'editor-a')).rejects.toBeInstanceOf(EditorConflictError);
    expect(handler.saveItem).not.toHaveBeenCalled();
  });
  it('rejects account switches and missing targets inside queued commands', async () => {
    const { service, store, handler, beforePersist } = setup(), base = energyUseSetup(store.energyUseEquipment()[0]);
    beforePersist(() => store.account.set({ guid: 'account-b' }));
    await expect(service.updateSetup(identity, { ...base, name: 'Local' }, base, 'editor-a')).rejects.toThrow('no longer available');
    expect(handler.saveItem).not.toHaveBeenCalled();
  });
  it('copies the complete item with fresh identity and independent nested records', async () => {
    const { service, store, handler } = setup(), original = store.energyUseEquipment()[0];
    original.noLongerInUse = { isNoLongerInUse: true, year: 2023 };
    const copy = await service.copy(identity);
    expect(handler.copyItem).toHaveBeenCalledWith(identity, original, copy);
    expect(handler.createItem).not.toHaveBeenCalled();
    expect(copy).toMatchObject({ name: 'Pump A (copy)', energyUseGroupId: original.energyUseGroupId, utilityData: original.utilityData, noLongerInUse: original.noLongerInUse });
    expect(copy.guid).not.toBe(original.guid); expect(copy.id).toBeUndefined();
    copy.utilityData[0].energyUse[0].energyUse = 99; copy.noLongerInUse.year = 2024;
    expect(original.utilityData[0].energyUse[0].energyUse).toBe(0); expect(original.noLongerInUse.year).toBe(2023);
  });
  it('revalidates reviewed deletion after a queued edit', async () => {
    const { service, store, handler, beforePersist } = setup(), reviewed = store.energyUseEquipment()[0];
    beforePersist(() => store.energyUseEquipment.set([{ ...reviewed, notes: 'Changed' }]));
    await expect(service.delete(identity, reviewed)).rejects.toThrow('Review its deletion');
    expect(handler.deleteItem).not.toHaveBeenCalled();
  });
  it('creates both records through one command with explicit facility ownership', async () => {
    const { service, handler, boundary } = setup();
    await service.create({ settings: { name: 'New', notes: '', equipmentType: 'Other', sources: [{ energySource: 'Natural Gas', size: 1, units: 'kW', numberOfEquipment: 1 }], utilityMeterGroupIds: [] },
      initialYear: 2025, group: { kind: 'new', name: ' New group ' } }, 'account-a', 'facility-a');
    expect(boundary.execute).toHaveBeenCalledTimes(1);
    expect(handler.createItem).toHaveBeenCalledWith(expect.objectContaining({ facilityGuid: 'facility-a' }), expect.objectContaining({ facilityId: 'facility-a' }), expect.objectContaining({ name: 'New group' }));
  });
});
