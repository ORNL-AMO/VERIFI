import { energyUseYearChange, seedEnergyUseYear } from '@app/v1/data/energy-uses/models/energy-use-year-draft.models';
import { reviewEnergyUseBatch } from '@app/v1/data/energy-uses/models/energy-use-batch.models';
import { AccountWorkspaceStore } from '../account-workspace.store';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { LocalStorageService } from 'ngx-webstorage';
import { IndexedDbTransactionContext } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { getNewIdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { EnergyUseCommandHandler } from './energy-use-command-handler.service';
import { AccountWorkspaceService } from '../account-workspace.service';
import { WorkspaceCommandBoundary } from '../workspace-command-boundary.service';
import { EnergyUseActionsService } from '@app/v1/data/energy-uses/energy-use-actions.service';

describe('Energy Uses native commands', () => {
  let harness: IndexedDbTestHarness;
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a' };
  const facility = { ...getNewIdbFacility(account), id: 2, guid: 'facility-a' };
  const owner = { accountGuid: account.guid, facilityGuid: facility.guid };
  const group = { ...getNewIdbFacilityEnergyUseGroup(account.guid, facility.guid), guid: 'group-a', name: 'Production' };
  const item = { ...getNewIdbFacilityEnergyUseEquipment(group, 2025), guid: 'energy-a', name: 'Pump' };
  const identity = { ...owner, energyUseGuid: item.guid };
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    harness = await IndexedDbTestHarness.create('energy-use-commands'); await harness.seed({ accounts: [account], facilities: [facility] });
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });
  it.each([false, true])('deletes an entire reviewed group atomically, including an empty group=%s', async empty => {
    const handler = TestBed.inject(EnergyUseCommandHandler);
    if (empty) await harness.seed({ facilityEnergyUseGroups: [group] });
    else {
      await handler.createItem(owner, item, group);
      await handler.createItem(owner, { ...item, guid: 'second-item' });
    }
    const otherGroup = { ...group, guid: 'other-group', name: 'Other' };
    const otherItem = await handler.createItem(owner, { ...item, guid: 'other-item', energyUseGroupId: otherGroup.guid }, otherGroup);
    const service = TestBed.inject(AccountWorkspaceService); await service.selectAccount(account.guid);
    const store = TestBed.inject(AccountWorkspaceStore), actions = TestBed.inject(EnergyUseActionsService);
    const reviewed = store.energyUseGroups().find(row => row.guid === group.guid)!;
    const members = store.energyUseEquipment().filter(row => row.energyUseGroupId === group.guid);
    const committed = vi.fn(), subscription = TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    try {
      await actions.deleteGroup({ ...owner, energyUseGroupGuid: group.guid }, reviewed, members);
      expect(committed).toHaveBeenCalledTimes(1);
      expect(store.energyUseGroups().map(row => row.guid)).toEqual([otherGroup.guid]);
      expect(store.energyUseEquipment()).toEqual([otherItem]);
      await harness.reopen();
      expect((await harness.getAll<any>('facilityEnergyUseGroups')).map(row => row.guid)).toEqual([otherGroup.guid]);
      expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([otherItem]);
      expect(await harness.getAll('facilities')).toEqual([facility]);
    } finally { subscription.unsubscribe(); }
  });
  it.each(['group', 'item', 'membership', 'foreign'] as const)('rejects a group deletion when its %s review is stale or invalid', async change => {
    const handler = TestBed.inject(EnergyUseCommandHandler), saved = await handler.createItem(owner, item, group);
    const reviewed = (await harness.getAll<any>('facilityEnergyUseGroups'))[0];
    if (change === 'group') await handler.saveGroupSettings({ ...owner, energyUseGroupGuid: group.guid }, reviewed, { name: 'Updated', notes: '' });
    if (change === 'item') await handler.saveItem(identity, saved, { ...saved, notes: 'Updated' }, false);
    if (change === 'membership') await handler.createItem(owner, { ...item, guid: 'added-later' });
    const groups = await harness.getAll('facilityEnergyUseGroups'), items = await harness.getAll('facilityEnergyUseEquipment');
    await expect(handler.deleteGroupWithItems({ ...owner, accountGuid: change === 'foreign' ? 'wrong-account' : owner.accountGuid, energyUseGroupGuid: group.guid }, reviewed, [saved])).rejects.toThrow();
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual(groups);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(items);
  });
  it('rolls back member deletions when the final group delete fails', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler), saved = await handler.createItem(owner, item, group);
    const groups = await harness.getAll<any>('facilityEnergyUseGroups');
    const original = IndexedDbTransactionContext.prototype.deleteByKey;
    vi.spyOn(IndexedDbTransactionContext.prototype, 'deleteByKey').mockImplementation(function(store, key) {
      return store === 'facilityEnergyUseGroups' ? Promise.reject(new Error('Group delete failed')) : original.call(this, store, key);
    });
    await expect(handler.deleteGroupWithItems({ ...owner, energyUseGroupGuid: group.guid }, groups[0], [saved])).rejects.toThrow('Group delete failed');
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual(groups);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([saved]);
  });
  it('recovers a committed group deletion without repeating persistence', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler); await handler.createItem(owner, item, group);
    const workspace = TestBed.inject(AccountWorkspaceService); await workspace.selectAccount(account.guid);
    const store = TestBed.inject(AccountWorkspaceStore), actions = TestBed.inject(EnergyUseActionsService);
    const reload = vi.spyOn(workspace, 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Publication failed'));
    const write = vi.spyOn(handler, 'deleteGroupWithItems');
    await expect(actions.deleteGroup({ ...owner, energyUseGroupGuid: group.guid }, store.energyUseGroups()[0], store.energyUseEquipment())).rejects.toMatchObject({ persistenceCommitted: true });
    await actions.recoverPublication(account.guid);
    expect(write).toHaveBeenCalledTimes(1); expect(reload).toHaveBeenCalledTimes(2);
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual([]);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([]);
  });
  it('creates a group and its first item together and survives reopening', async () => {
    const saved = await TestBed.inject(EnergyUseCommandHandler).createItem(owner, item, group);
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([saved]);
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual([expect.objectContaining(group)]);
  });
  it('saves group metadata once, preserving all other fields, item history, and relationships after reopening', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler), savedItem = await handler.createItem(owner, item, group);
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
    const before = (await harness.getAll<any>('facilityEnergyUseGroups'))[0];
    const committed = vi.fn(), subscription = TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    try {
      await TestBed.inject(EnergyUseActionsService).updateGroupSettings({ ...owner, energyUseGroupGuid: group.guid },
        { name: ' Packaging ', notes: ' Group notes ' }, { name: group.name, notes: group.notes }, 'group-editor');
      expect(committed).toHaveBeenCalledTimes(1);
      expect(TestBed.inject(AccountWorkspaceStore).energyUseGroups()[0].name).toBe('Packaging');
      await harness.reopen();
      const [saved] = await harness.getAll<any>('facilityEnergyUseGroups');
      expect(saved).toMatchObject({ ...before, name: 'Packaging', notes: 'Group notes', modifiedDate: expect.anything() });
      expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([savedItem]);
    } finally { subscription.unsubscribe(); }
  });
  it('rejects stale or foreign group edits and leaves durable records intact', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler); await handler.createItem(owner, item, group);
    const before = (await harness.getAll<any>('facilityEnergyUseGroups'))[0], identity = { ...owner, energyUseGroupGuid: group.guid };
    const saved = await handler.saveGroupSettings(identity, before, { name: 'Current group', notes: 'Keep notes' });
    await expect(handler.saveGroupSettings(identity, before, { name: 'Stale group', notes: '' })).rejects.toThrow('changed');
    await expect(handler.saveGroupSettings({ ...identity, facilityGuid: 'missing' }, saved, { name: 'Foreign group', notes: '' })).rejects.toThrow('owning facility');
    await expect(handler.saveGroupSettings(identity, saved, { name: ' ', notes: '' })).rejects.toThrow('name');
    await harness.reopen(); expect(await harness.getAll('facilityEnergyUseGroups')).toEqual([saved]);
  });
  it('retains the last saved group after a failed metadata write', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler); await handler.createItem(owner, item, group);
    const before = (await harness.getAll<any>('facilityEnergyUseGroups'))[0];
    const original = IndexedDbTransactionContext.prototype.put;
    vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockImplementation(function(store, value) {
      return store === 'facilityEnergyUseGroups' ? Promise.reject(new Error('Group write failed')) : original.call(this, store, value);
    });
    await expect(handler.saveGroupSettings({ ...owner, energyUseGroupGuid: group.guid }, before, { name: 'Rejected', notes: '' })).rejects.toThrow('Group write failed');
    await harness.reopen(); expect(await harness.getAll('facilityEnergyUseGroups')).toEqual([before]);
  });
  it('reuses a matching completed creation on retry without duplicating its group or history', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler), saved = await handler.createItem(owner, item, group);
    expect(await handler.createItem(owner, item, group)).toEqual(saved);
    expect(await harness.getAll('facilityEnergyUseGroups')).toHaveLength(1);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toHaveLength(1);
    await expect(handler.createItem(owner, { ...item, name: 'Changed retry' }, group)).rejects.toThrow('already created');
  });
  it('rejects a retry that changes only the new group name without changing saved records', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler), saved = await handler.createItem(owner, item, group);
    const groups = await harness.getAll('facilityEnergyUseGroups');
    await expect(handler.createItem(owner, item, { ...group, name: 'Changed group' })).rejects.toThrow();
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual(groups);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([saved]);
  });
  it.each(['missing', 'foreign'] as const)('rejects a matching creation retry when its durable group is %s', async state => {
    const handler = TestBed.inject(EnergyUseCommandHandler), saved = await handler.createItem(owner, item, group);
    const savedGroup = (await harness.getAll<any>('facilityEnergyUseGroups'))[0];
    if (state === 'missing') await handler.deleteGroup(savedGroup, account.guid);
    else await handler.updateGroup({ ...savedGroup, facilityId: 'another-facility' }, account.guid);
    const beforeGroups = await harness.getAll('facilityEnergyUseGroups');
    await expect(handler.createItem(owner, item, group)).rejects.toThrow('group');
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual(beforeGroups);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([saved]);
  });
  it.each(['changed', 'deleted'] as const)('rejects copying a %s durable source even when the workspace still has its old snapshot', async state => {
    const handler = TestBed.inject(EnergyUseCommandHandler);
    const source = { ...item, utilityData: [{ energySource: 'Electricity' as const, size: 1, units: 'kW', numberOfEquipment: 1,
      energyUse: [{ year: 2025, energyUse: 0, overrideEnergyUse: true, energyUseUnit: 'kWh' }] }] };
    const saved = await handler.createItem(owner, source, group);
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
    if (state === 'changed') {
      const updated = structuredClone(saved); updated.utilityData[0].energyUse[0].energyUse = 999;
      await handler.saveItem(identity, saved, updated, false);
    }
    else await handler.deleteItem(identity, saved);
    const before = await harness.getAll('facilityEnergyUseEquipment');
    const committed = vi.fn(), subscription = TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    try {
      await expect(TestBed.inject(EnergyUseActionsService).copy(identity)).rejects.toThrow('changed');
      expect(committed).not.toHaveBeenCalled();
      await harness.reopen();
      expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(before);
      expect(await harness.getAll('facilityEnergyUseGroups')).toHaveLength(1);
    } finally { subscription.unsubscribe(); }
  });
  it('copies a current source and accepts a matching retry without duplicating its history', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler), saved = await handler.createItem(owner, item, group);
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
    const actions = TestBed.inject(EnergyUseActionsService), request = getNewIdbEntry();
    const copy = await actions.copy(identity, request);
    expect(await actions.copy(identity, request)).toEqual(copy);
    expect(copy).toMatchObject({ name: 'Pump (copy)', selected: false, operatingConditionsData: saved.operatingConditionsData });
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([saved, copy]);
    expect(await harness.getAll('facilityEnergyUseGroups')).toHaveLength(1);
  });
  it('rolls back the new group when its item fails, then permits retry', async () => {
    const original = IndexedDbTransactionContext.prototype.add;
    const spy = vi.spyOn(IndexedDbTransactionContext.prototype, 'add').mockImplementation(function (store, value) {
      return store === 'facilityEnergyUseEquipment' ? Promise.reject(new Error('Injected failure')) : original.call(this, store, value);
    });
    await expect(TestBed.inject(EnergyUseCommandHandler).createItem(owner, item, group)).rejects.toThrow('Injected failure');
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual([]);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([]);
    spy.mockRestore();
    await TestBed.inject(EnergyUseCommandHandler).createItem(owner, item, group);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toHaveLength(1);
  });
  it('rejects wrong owners and missing existing groups without writes', async () => {
    await expect(TestBed.inject(EnergyUseCommandHandler).createItem({ ...owner, accountGuid: 'other' }, item, group)).rejects.toThrow('owning facility');
    await expect(TestBed.inject(EnergyUseCommandHandler).createItem(owner, item)).rejects.toThrow('group is no longer');
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([]);
  });
  it('rejects a stale reviewed update and deletion, leaving current data intact', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler), saved = await handler.createItem(owner, item, group);
    const updated = await handler.saveItem(identity, saved, { ...saved, notes: 'New notes' }, false);
    await expect(handler.saveItem(identity, saved, { ...saved, name: 'Stale' }, false)).rejects.toThrow('changed');
    await expect(handler.deleteItem(identity, saved)).rejects.toThrow('changed');
    await harness.reopen(); expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([updated]);
  });
  it('deletes only the reviewed item and retains its group', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler), saved = await handler.createItem(owner, item, group);
    await handler.deleteItem(identity, saved); await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([]);
    expect(await harness.getAll('facilityEnergyUseGroups')).toHaveLength(1);
  });
  it('commits a reviewed batch once and reopens it with all groups and ownership intact', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler);
    const first = await handler.createItem(owner, item, group);
    const second = await handler.createItem(owner, { ...item, guid: 'energy-b', name: 'Fan' });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
    const rows = reviewEnergyUseBatch([first, second], [facility], { kind: 'add', year: 2026 });
    const committed = vi.fn(), sub = TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    try {
      await TestBed.inject(EnergyUseActionsService).applyBatch(account.guid, rows.map(row => row.change!));
      expect(committed).toHaveBeenCalledTimes(1); await harness.reopen();
      const saved = await harness.getAll<any>('facilityEnergyUseEquipment');
      expect(saved).toHaveLength(2); expect(saved.every(row => row.operatingConditionsData.some(annual => annual.year === 2026))).toBe(true);
      expect(saved.every(row => row.energyUseGroupId === group.guid && row.facilityId === facility.guid)).toBe(true);
      expect(await harness.getAll('facilityEnergyUseGroups')).toHaveLength(1);
    } finally { sub.unsubscribe(); }
  });
  it('commits edited existing years and newly entered years together without changing other history', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler);
    const configured = { ...item, utilityData: [{ energySource: 'Electricity' as const, size: 1, units: 'kW', numberOfEquipment: 1,
      energyUse: [{ year: 2025, energyUse: 123, overrideEnergyUse: true, energyUseUnit: 'kWh' }] }] };
    const original = await handler.createItem(owner, configured, group);
    const second = await handler.createItem(owner, { ...configured, guid: 'energy-b' });
    await handler.applyBatch(account.guid, [energyUseYearChange(original, facility, seedEnergyUseYear(original, facility, 2026).value, 2026)]);
    const first = (await harness.getAll<any>('facilityEnergyUseEquipment')).find(row => row.guid === original.guid);
    const rows = [first, second].map(saved => {
      const draft = seedEnergyUseYear(saved, facility, 2026);
      return energyUseYearChange(saved, facility, { ...draft.value, conditions: draft.value.conditions.map(row => row.year === 2026 ? { ...row, hoursOfOperation: 1000 } : row) }, 2026);
    });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
    const committed = vi.fn(), sub = TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    try {
      await TestBed.inject(EnergyUseActionsService).applyBatch(account.guid, rows);
      expect(committed).toHaveBeenCalledTimes(1); await harness.reopen();
      const saved = await harness.getAll<any>('facilityEnergyUseEquipment');
      for (const equipment of saved) {
        expect(equipment.operatingConditionsData.find(row => row.year === 2026).hoursOfOperation).toBe(1000);
        expect(equipment.operatingConditionsData.find(row => row.year === 2025)).toEqual(original.operatingConditionsData[0]);
        expect(equipment.utilityData[0].energyUse.filter(row => row.year === 2025)).toEqual(original.utilityData[0].energyUse);
        expect(equipment.energyUseGroupId).toBe(group.guid);
      }
    } finally { sub.unsubscribe(); }
  });
  it('rolls back every batch write when the second equipment update fails', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler);
    const first = await handler.createItem(owner, item, group), second = await handler.createItem(owner, { ...item, guid: 'energy-b' });
    const changes = reviewEnergyUseBatch([first, second], [facility], { kind: 'add', year: 2026 }).map(row => row.change!);
    const original = IndexedDbTransactionContext.prototype.put; let writes = 0;
    vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockImplementation(function(store, value) {
      if (store === 'facilityEnergyUseEquipment' && ++writes === 2) return Promise.reject(new Error('Second write failed'));
      return original.call(this, store, value);
    });
    await expect(handler.applyBatch(account.guid, changes)).rejects.toThrow('Second write failed');
    await harness.reopen(); expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([first, second]);
  });
  it('rejects stale skipped records, wrong owners, and changed facilities inside the batch transaction', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler), saved = await handler.createItem(owner, item, group);
    const changed = await handler.saveItem(identity, saved, { ...saved, notes: 'Updated elsewhere' }, false);
    await expect(handler.applyBatch(account.guid, [{ facility, before: saved, after: saved }])).rejects.toThrow('changed');
    await expect(handler.applyBatch('foreign-account', [{ facility, before: changed }])).rejects.toThrow('owning facility');
    await expect(handler.applyBatch(account.guid, [{ facility: { ...facility, energyUnit: 'GJ' }, before: changed }])).rejects.toThrow('Facility settings changed');
    await harness.reopen(); expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([changed]);
  });
  it('preserves annual history through retirement and reinstatement and recovers a saved batch without rewriting', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler), saved = await handler.createItem(owner, item, group);
    const service = TestBed.inject(AccountWorkspaceService), actions = TestBed.inject(EnergyUseActionsService);
    await service.selectAccount(account.guid);
    await actions.setLifecycle(identity, saved, 2025);
    const retired = TestBed.inject(AccountWorkspaceStore).energyUseEquipment()[0];
    expect(retired.noLongerInUse).toEqual({ isNoLongerInUse: true, year: 2025 }); expect(retired.operatingConditionsData).toEqual(saved.operatingConditionsData);
    await actions.setLifecycle(identity, retired, null);
    const current = TestBed.inject(AccountWorkspaceStore).energyUseEquipment()[0];
    const changes = reviewEnergyUseBatch([current], [facility], { kind: 'add', year: 2026 }).map(row => row.change!);
    const reload = vi.spyOn(service, 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Publication failed'));
    const write = vi.spyOn(handler, 'applyBatch');
    await expect(actions.applyBatch(account.guid, changes)).rejects.toMatchObject({ persistenceCommitted: true });
    await actions.recoverPublication(account.guid);
    expect(write).toHaveBeenCalledTimes(1); expect(reload).toHaveBeenCalledTimes(2);
    await harness.reopen(); expect((await harness.getAll<any>('facilityEnergyUseEquipment'))[0].operatingConditionsData).toHaveLength(2);
  });

});
