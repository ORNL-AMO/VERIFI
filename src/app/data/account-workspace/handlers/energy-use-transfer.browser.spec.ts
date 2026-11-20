import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { getNewIdbAccount } from '@data/models/idbModels/account';
import { getNewIdbFacility } from '@data/models/idbModels/facility';
import { getNewIdbFacilityEnergyUseGroup } from '@data/models/idbModels/facilityEnergyUseGroups';
import { getNewIdbFacilityEnergyUseEquipment } from '@data/models/idbModels/facilityEnergyUseEquipment';
import { getNewIdbEntry } from '@data/models/idbModels/idbEntry';
import { EnergyUseActionsService } from '@app/v1/data/energy-uses/energy-use-actions.service';
import { AccountWorkspaceService } from '../account-workspace.service';
import { AccountWorkspaceStore } from '../account-workspace.store';
import { WorkspaceCommandBoundary } from '../workspace-command-boundary.service';
import { EnergyUseCommandHandler } from './energy-use-command-handler.service';
import { EnergyUseTransferRequest } from './energy-use-command.models';

describe('Atomic energy-use transfer and copy', () => {
  let harness: IndexedDbTestHarness;
  const account = { ...getNewIdbAccount(), id: 1, guid: 'account-a' };
  const facility = { ...getNewIdbFacility(account), id: 2, guid: 'facility-a', fiscalYear: 'calendarYear' as const, energyUnit: 'kWh' };
  const other = { ...facility, id: 3, guid: 'facility-b', fiscalYear: 'nonCalendarYear' as const, fiscalYearMonth: 6, fiscalYearCalendarEnd: true, energyUnit: 'MMBtu' };
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    harness = await IndexedDbTestHarness.create('energy-use-transfer');
    await harness.seed({ accounts: [account], facilities: [facility, other] });
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });
  async function prepare(mode: 'move' | 'copy', crossFacility = true, newGroup = false): Promise<EnergyUseTransferRequest> {
    const sourceGroup = { ...getNewIdbFacilityEnergyUseGroup(account.guid, facility.guid), guid: 'source', name: 'Source' };
    const destination = { ...getNewIdbFacilityEnergyUseGroup(account.guid, crossFacility ? other.guid : facility.guid), guid: 'destination', name: 'Destination' };
    const handler = TestBed.inject(EnergyUseCommandHandler);
    const item = { ...getNewIdbFacilityEnergyUseEquipment(sourceGroup, 2024), notes: 'Keep notes', utilityMeterGroupIds: ['meter-group'], color: '#123456',
      noLongerInUse: { isNoLongerInUse: true, year: 2025 }, utilityData: [{ energySource: 'Electricity' as const, size: 15, units: 'kW', numberOfEquipment: 3,
        energyUse: [{ year: 2024, energyUse: 0, energyUseUnit: 'kWh', overrideEnergyUse: true }, { year: 2025, energyUse: 123.456789, energyUseUnit: 'MWh', overrideEnergyUse: false }] }] };
    await handler.createItem({ accountGuid: account.guid, facilityGuid: facility.guid }, { ...item, guid: 'first', name: 'First' }, sourceGroup, false);
    await handler.createItem({ accountGuid: account.guid, facilityGuid: facility.guid }, { ...item, guid: 'second', name: 'Second' }, undefined, false);
    if (!newGroup) await harness.seed({ facilityEnergyUseGroups: [destination] });
    await TestBed.inject(AccountWorkspaceService).selectAccount(account.guid);
    const store = TestBed.inject(AccountWorkspaceStore);
    return structuredClone({ accountGuid: account.guid, mode, sources: store.energyUseEquipment().map(item => ({ item, facility: store.facilities().find(row => row.guid === item.facilityId)! })),
      destinationFacility: store.facilities().find(row => row.guid === destination.facilityId)!,
      destinationGroup: { kind: newGroup ? 'new' : 'existing', group: newGroup ? destination : store.energyUseGroups().find(row => row.guid === destination.guid)! },
      copyIdentities: mode === 'copy' ? store.energyUseEquipment().map(() => getNewIdbEntry()) : [] });
  }
  it.each([
    ['move', false, false], ['copy', false, false], ['move', true, false], ['copy', true, false],
    ['move', false, true], ['copy', false, true], ['move', true, true], ['copy', true, true]
  ] as const)('%s preserves every saved field (cross-facility %s, new group %s), publishing once', async (mode, crossFacility, newGroup) => {
    const request = await prepare(mode, crossFacility, newGroup);
    const committed = vi.fn(), sub = TestBed.inject(WorkspaceCommandBoundary).committedChange$.subscribe(committed);
    try {
      const result = await TestBed.inject(EnergyUseActionsService).transferItems(request);
      expect(result.items).toHaveLength(2); expect(committed).toHaveBeenCalledTimes(1);
      for (const [i, saved] of result.items.entries()) {
        const original = request.sources[i].item;
        expect(saved).toEqual({ ...original, ...(mode === 'copy' ? { ...request.copyIdentities[i], id: expect.any(Number), name: `${original.name} (copy)`, selected: false } : {}),
          modifiedDate: expect.any(Date), facilityId: request.destinationFacility.guid, energyUseGroupId: result.group.guid,
          utilityMeterGroupIds: crossFacility ? [] : original.utilityMeterGroupIds });
        if (mode === 'copy') { expect(saved.guid).not.toBe(original.guid); expect(saved.id).not.toBe(original.id); }
      }
      await harness.reopen();
      const persisted = await harness.getAll('facilityEnergyUseEquipment');
      expect(persisted).toHaveLength(mode === 'copy' ? 4 : 2);
      expect(persisted).toEqual(expect.arrayContaining([...result.items]));
      if (mode === 'copy') expect(persisted).toEqual(expect.arrayContaining(request.sources.map(row => row.item)));
      expect((await harness.getAll<any>('facilityEnergyUseGroups')).map(row => row.guid).sort()).toEqual(['destination', 'source']);
    } finally { sub.unsubscribe(); }
  });
  it.each(['move', 'copy'] as const)('rolls back the new group and earlier %s writes on a second-item failure, then retries with stable identities', async mode => {
    const request = await prepare(mode, true, true);
    const method = mode === 'copy' ? 'add' : 'put';
    const original = IndexedDbTransactionContext.prototype[method];
    let writes = 0;
    const fail = vi.spyOn(IndexedDbTransactionContext.prototype, method).mockImplementation(function(store, value) {
      if (store === 'facilityEnergyUseEquipment' && ++writes === 2) return Promise.reject(new Error('Second write failed'));
      return original.call(this, store, value);
    });
    await expect(TestBed.inject(EnergyUseActionsService).transferItems(request)).rejects.toMatchObject({ code: 'persistence-failed', persistenceCommitted: false });
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(request.sources.map(row => row.item));
    expect((await harness.getAll<any>('facilityEnergyUseGroups')).map(row => row.guid)).toEqual(['source']);
    fail.mockRestore();
    const result = await TestBed.inject(EnergyUseActionsService).transferItems(request);
    expect(result.items.map(row => row.guid)).toEqual(mode === 'copy' ? request.copyIdentities.map(row => row.guid) : request.sources.map(row => row.item.guid));
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(expect.arrayContaining([...result.items]));
  });
  it.each(['source changed', 'source deleted', 'source facility', 'destination facility', 'destination changed', 'destination deleted', 'foreign group', 'copy collision', 'duplicate source', 'same group'] as const)('rejects %s without changing any reviewed records', async change => {
    const request = await prepare(change === 'copy collision' ? 'copy' : 'move');
    const handler = TestBed.inject(EnergyUseCommandHandler), row = request.sources[0];
    if (change === 'source changed') await handler.saveItem({ accountGuid: account.guid, facilityGuid: facility.guid, energyUseGuid: row.item.guid }, row.item, { ...row.item, name: 'Edited' }, false);
    if (change === 'source deleted') await handler.deleteItem({ accountGuid: account.guid, facilityGuid: facility.guid, energyUseGuid: row.item.guid }, row.item);
    if (change === 'destination changed') await handler.saveGroupSettings({ accountGuid: account.guid, facilityGuid: other.guid, energyUseGroupGuid: 'destination' }, request.destinationGroup.group, { name: 'Changed', notes: '' });
    if (change === 'destination deleted') await TestBed.inject(IndexedDbTransactionService).runTransaction(['facilityEnergyUseGroups'], 'readwrite', tx => tx.deleteByKey('facilityEnergyUseGroups', request.destinationGroup.group.id!));
    if (change === 'source facility' || change === 'destination facility') await TestBed.inject(IndexedDbTransactionService).runTransaction(['facilities'], 'readwrite', tx => tx.put('facilities', { ...(change === 'source facility' ? facility : other), name: 'Edited' }));
    if (change === 'foreign group') request.destinationGroup.group.accountId = 'foreign';
    if (change === 'copy collision') request.copyIdentities[0].guid = row.item.guid;
    if (change === 'duplicate source') (request.sources as unknown[])[1] = row;
    if (change === 'same group') {
      const sourceGroup = TestBed.inject(AccountWorkspaceStore).energyUseGroups().find(row => row.guid === 'source')!;
      Object.assign(request, { destinationFacility: facility, destinationGroup: { kind: 'existing', group: sourceGroup } });
    }
    const beforeItems = await harness.getAll('facilityEnergyUseEquipment'), beforeGroups = await harness.getAll('facilityEnergyUseGroups');
    await expect(handler.transferItems(request)).rejects.toThrow();
    await harness.reopen();
    expect(await harness.getAll('facilityEnergyUseEquipment')).toEqual(beforeItems);
    expect(await harness.getAll('facilityEnergyUseGroups')).toEqual(beforeGroups);
  });
  it('recovers committed cross-facility copies and their new group without replaying persistence', async () => {
    const request = await prepare('copy', true, true);
    const workspace = TestBed.inject(AccountWorkspaceService), handler = TestBed.inject(EnergyUseCommandHandler), actions = TestBed.inject(EnergyUseActionsService);
    const write = vi.spyOn(handler, 'transferItems');
    vi.spyOn(workspace, 'reloadActiveWorkspace').mockRejectedValueOnce(new Error('Refresh failed'));
    await expect(actions.transferItems(request)).rejects.toMatchObject({ persistenceCommitted: true });
    await actions.recoverPublication(account.guid);
    expect(write).toHaveBeenCalledTimes(1);
    const store = TestBed.inject(AccountWorkspaceStore);
    expect(store.energyUseEquipment()).toHaveLength(4);
    expect(store.energyUseGroups()).toHaveLength(2);
    for (const id of request.copyIdentities) expect(store.energyUseEquipment().find(row => row.guid === id.guid)).toMatchObject({ facilityId: other.guid, energyUseGroupId: 'destination' });
  });
});
