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
});
