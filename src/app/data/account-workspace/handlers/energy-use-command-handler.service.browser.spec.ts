import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { IndexedDbTransactionContext } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { getNewIdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { EnergyUseCommandHandler } from './energy-use-command-handler.service';

describe('Energy Uses native commands', () => {
  let harness: IndexedDbTestHarness;
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a' };
  const facility = { ...getNewIdbFacility(account), id: 2, guid: 'facility-a' };
  const owner = { accountGuid: account.guid, facilityGuid: facility.guid };
  const group = { ...getNewIdbFacilityEnergyUseGroup(account.guid, facility.guid), guid: 'group-a', name: 'Production' };
  const item = { ...getNewIdbFacilityEnergyUseEquipment(group, 2025), guid: 'energy-a', name: 'Pump' };
  const identity = { ...owner, energyUseGuid: item.guid };
  beforeEach(async () => { harness = await IndexedDbTestHarness.create('energy-use-commands'); await harness.seed({ accounts: [account], facilities: [facility] }); });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });
  it('creates a group and its first item together and survives reopening', async () => {
    const saved = await TestBed.inject(EnergyUseCommandHandler).createItem(owner, item, group);
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([saved]);
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual([expect.objectContaining(group)]);
  });
  it('reuses a matching completed creation on retry without duplicating its group or history', async () => {
    const handler = TestBed.inject(EnergyUseCommandHandler), saved = await handler.createItem(owner, item, group);
    expect(await handler.createItem(owner, item, group)).toEqual(saved);
    expect(await harness.getAll('facilityEnergyUseGroups')).toHaveLength(1);
    expect(await harness.getAll('facilityEnergyUseEquipment')).toHaveLength(1);
    await expect(handler.createItem(owner, { ...item, name: 'Changed retry' }, group)).rejects.toThrow('already created');
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
});
