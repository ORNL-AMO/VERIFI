import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IndexedDbTransactionContext } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { EnergyUseActionsService } from './energy-use-actions.service';
import { addEnergyUseYear, energyUseSetup, reconcileEnergyUseSetup, removeEnergyUseYear, reviewEnergyUseYear } from './models/energy-use-setup.models';

describe('Combined Energy Use setup persistence', () => {
  let harness: IndexedDbTestHarness;
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a', energyUnit: 'kWh' };
  const facility = { ...getNewIdbFacility(account), id: 2, guid: 'facility-a', energyUnit: 'kWh' };
  const identity = { accountGuid: account.guid, facilityGuid: facility.guid, energyUseGuid: '' };
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    harness = await IndexedDbTestHarness.create('energy-use-setup'); await harness.seed({ accounts: [account], facilities: [facility] });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
    const item = await TestBed.inject(EnergyUseActionsService).create({ initialYear: 2024, group: { kind: 'new', name: 'Production' },
      settings: { name: 'Pump', notes: '', equipmentType: 'Pump', utilityMeterGroupIds: [], sources: [{ energySource: 'Electricity', size: 5, numberOfEquipment: 1, units: 'kW' }] } }, account.guid, facility.guid);
    identity.energyUseGuid = item.guid;
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });
  const current = () => TestBed.inject(AccountWorkspaceStore).energyUseEquipment()[0];
  it('commits setup and complete added/copied years once, and preserves values after reopening', async () => {
    const actions = TestBed.inject(EnergyUseActionsService), base = energyUseSetup(current());
    const added = addEnergyUseYear(base, 2025, facility);
    const value = { ...added, sources: added.sources.map(row => ({ ...row, size: 10 })), conditions: added.conditions.map(row => ({ ...row, hoursOfOperation: 1000 })) };
    const committed = vi.fn(), subscription = TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    try {
      await actions.updateSetup(identity, value, base, 'setup-test');
      expect(committed).toHaveBeenCalledTimes(1);
      expect(current().utilityData[0].energyUse.map(row => row.energyUse)).toEqual([10000, 10000]);
      const copyBase = energyUseSetup(current());
      await actions.updateSetup(identity, addEnergyUseYear(copyBase, 2026, facility, { year: 2025, item: current() }), copyBase, 'setup-test');
      const saved = structuredClone(current());
      await harness.reopen(); expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([saved]);
      expect(saved.utilityData[0].energyUse[2].energyUse).toBe(10000);
    } finally { subscription.unsubscribe(); }
  });
  it('atomically persists pending setup edits and their copied annual calculation before reopening', async () => {
    const actions = TestBed.inject(EnergyUseActionsService), before = current(), base = energyUseSetup(before);
    const pending = { ...base, sources: base.sources.map(row => ({ ...row, size: 10 })), conditions: base.conditions.map(row => ({ ...row, hoursOfOperation: 1000 })) };
    const copied = addEnergyUseYear(pending, 2025, facility, { year: 2024, item: before });
    const committed = vi.fn(), subscription = TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    try {
      await actions.updateSetup(identity, copied, base, 'setup-test');
      expect(committed).toHaveBeenCalledTimes(1);
      const saved = structuredClone(current());
      expect(saved.operatingConditionsData.map(row => row.hoursOfOperation)).toEqual([1000, 1000]);
      expect(saved.utilityData[0].energyUse.map(row => row.energyUse)).toEqual([10000, 10000]);
      await harness.reopen(); expect(await harness.getAll('facilityEnergyUseEquipment')).toStrictEqual([saved]);
    } finally { subscription.unsubscribe(); }
  });
  it('rolls back a failed complete year write without publishing and permits retry', async () => {
    const actions = TestBed.inject(EnergyUseActionsService), before = structuredClone(current()), base = energyUseSetup(before), value = addEnergyUseYear(base, 2025, facility);
    const original = IndexedDbTransactionContext.prototype.put;
    const fail = vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockImplementation(function (store, item) {
      return store === 'facilityEnergyUseEquipment' ? Promise.reject(new Error('Injected write failure')) : original.call(this, store, item);
    });
    const committed = vi.fn(), subscription = TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    try {
      await expect(actions.updateSetup(identity, value, base, 'setup-test')).rejects.toThrow('Persistence failed');
      expect(committed).not.toHaveBeenCalled();
      await harness.reopen(); expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([before]);
      fail.mockRestore(); await actions.updateSetup(identity, value, base, 'setup-test');
      expect((await harness.getAll<any>('facilityEnergyUseEquipment'))[0].operatingConditionsData).toHaveLength(2);
    } finally { subscription.unsubscribe(); }
  });
  it('rejects stale year-removal review and leaves every saved source intact', async () => {
    const actions = TestBed.inject(EnergyUseActionsService), before = current(), base = energyUseSetup(before), reviewed = reviewEnergyUseYear(before, 2024);
    const changed = { ...base, conditions: base.conditions.map(row => ({ ...row, hoursOfOperation: 1234 })) };
    await actions.updateSetup(identity, changed, base, 'other-editor');
    const latest = energyUseSetup(current()), saved = structuredClone(current());
    await expect(actions.updateSetup(identity, removeEnergyUseYear(latest, 2024), latest, 'setup-test', { years: [reviewed] })).rejects.toThrow('changed');
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual([saved]);
  });
  it.each(['conditions', 'consumption'] as const)('rejects a stale partial %s deletion without publishing or changing durable history', async field => {
    const actions = TestBed.inject(EnergyUseActionsService), initial = energyUseSetup(current());
    await actions.updateSetup(identity, { ...initial, consumption: initial.consumption.map(source => ({ ...source,
      entries: source.entries.map(row => ({ ...row, overrideEnergyUse: true, energyUse: 17 })) })) }, initial, 'setup-test');
    const base = energyUseSetup(current()), stale = reviewEnergyUseYear(current(), 2024);
    await actions.updateSetup(identity, { ...base, conditions: base.conditions.map(row => ({ ...row, hoursOfOperation: 1234 })) }, base, 'other-editor');
    const latest = energyUseSetup(current()), saved = structuredClone(current());
    const partial = field === 'conditions' ? { ...latest, conditions: [] } : { ...latest, consumption: latest.consumption.map(source => ({ ...source, entries: [] })) };
    const committed = vi.fn(), subscription = TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    try {
      await expect(actions.updateSetup(identity, partial, latest, 'setup-test', { years: [stale] })).rejects.toThrow('Review its removal again');
      expect(committed).not.toHaveBeenCalled(); await harness.reopen();
      expect(await harness.getAll('facilityEnergyUseEquipment')).toStrictEqual([saved]);
    } finally { subscription.unsubscribe(); }
  });
  it.each(['year', 'source'] as const)('retains complete saved history after a queued %s-removal conflict is resolved', async kind => {
    const actions = TestBed.inject(EnergyUseActionsService), initial = energyUseSetup(current());
    await actions.updateSetup(identity, { ...initial, consumption: initial.consumption.map(source => ({ ...source,
      entries: source.entries.map(row => ({ ...row, overrideEnergyUse: true, energyUse: 17 })) })) }, initial, 'setup-test');
    const before = current(), base = energyUseSetup(before), local = { ...(kind === 'year' ? removeEnergyUseYear(base, 2024)
      : { ...base, sources: [], consumption: [] }), name: 'Independent local name' };
    const remote = kind === 'year' ? { ...base, conditions: base.conditions.map(row => ({ ...row, hoursOfOperation: 1234 })) }
      : { ...base, consumption: base.consumption.map(source => ({ ...source, entries: source.entries.map(row => ({ ...row, energyUse: 42 })) })) };
    await actions.updateSetup(identity, remote, base, 'other-editor');
    const saved = structuredClone(current()), latest = energyUseSetup(saved);
    const committed = vi.fn(), subscription = TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    try {
      await expect(actions.updateSetup(identity, local, base, 'setup-test', { years: [reviewEnergyUseYear(before, 2024)], sources: before.utilityData })).rejects.toThrow();
      expect(committed).not.toHaveBeenCalled();
      const pending = reconcileEnergyUseSetup(base, local, latest), choices = Object.fromEntries(pending.conflicts.map(conflict => [conflict.id, 'saved' as const]));
      const resolved = reconcileEnergyUseSetup(pending.baseline!, pending.value, latest, choices);
      expect(resolved.conflicts).toEqual([]);
      await actions.updateSetup(identity, resolved.value, latest, 'setup-test');
      expect(committed).toHaveBeenCalledTimes(1);
      const retained = structuredClone(current());
      expect(retained.name).toBe('Independent local name'); expect(retained.utilityData).toStrictEqual(saved.utilityData);
      expect(retained.operatingConditionsData).toStrictEqual(saved.operatingConditionsData);
      await harness.reopen(); expect(await harness.getAll('facilityEnergyUseEquipment')).toStrictEqual([retained]);
    } finally { subscription.unsubscribe(); }
  });
});
