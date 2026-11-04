import { TestBed } from '@angular/core/testing';
import { LocalStorageService } from 'ngx-webstorage';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { readMeterSettings } from '@app/v1/shared/meter-settings/meter-settings-values';
import { account, facility, group, meter, reading } from './facility-meters.testing';
import { MeterSettingsActionsService } from './meter-settings-actions.service';

describe('queued meter settings with native IndexedDB', () => {
  let harness: IndexedDbTestHarness;
  const currentMeter = meter({ id: 3, accountNumber: '00123', notes: 'Before', charges: [{
    guid: 'charge-a', name: 'Usage', chargeType: 'consumption', displayChargeInTable: true, displayUsageInTable: true
  }] });
  const currentReading = reading({ id: 4, charges: [{ chargeGuid: 'charge-a', chargeAmount: 5, chargeUsage: 10 }] });
  const identity = { accountGuid: 'account-a', facilityGuid: 'facility-a', meterGuid: 'meter-a' };
  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: LocalStorageService, useValue: { retrieve: () => null, store: () => {}, clear: () => {} } }] });
    harness = await IndexedDbTestHarness.create('meter-settings-actions');
    await harness.seed({ accounts: [{ ...account(), id: 1 }], facilities: [{ ...facility(), id: 2 }],
      utilityMeter: [{ ...currentMeter }], utilityMeterData: [{ ...currentReading }] });
    await TestBed.inject(AccountWorkspaceService).selectAccount('account-a');
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });

  it('reads records and readings after an earlier queued write, updates charges atomically, and survives reopening', async () => {
    const boundary = TestBed.inject(WorkspaceCommandBoundary);
    const transactions = TestBed.inject(IndexedDbTransactionService);
    const settings = TestBed.inject(MeterSettingsActionsService);
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const firstStarted = new Promise<void>(resolve => { started = resolve; });
    const previous = boundary.execute({ entityKind: 'meter', changeKind: 'update', entityGuid: 'meter-a',
      label: 'Editing saved records', publication: { mode: 'reload' }
    }, async () => {
      started(); await gate;
      await transactions.runTransaction(['utilityMeter', 'utilityMeterData'], 'readwrite', async transaction => {
        await transaction.put('utilityMeter', { ...currentMeter, notes: 'Saved note', displayEnergyUnit: 'GJ' });
        await transaction.put('utilityMeterData', { ...currentReading, totalCost: 90,
          charges: [{ chargeGuid: 'charge-a', chargeAmount: 30, chargeUsage: 40 }] });
      });
    });
    await firstStarted;
    const baseline = readMeterSettings(currentMeter);
    const pending = settings.updateSettings(identity, { ...baseline, name: 'Renamed', chargesArray: [
      ...baseline.chargesArray, { guid: 'charge-b', name: 'New charge', chargeType: 'other', displayChargeInTable: true, displayUsageInTable: false }
    ] }, baseline, 'settings-editor');
    release(); await previous; await pending;
    await harness.reopen();
    expect(await harness.getAll('utilityMeter')).toEqual([expect.objectContaining({
      name: 'Renamed', notes: 'Saved note', displayEnergyUnit: 'GJ', accountNumber: '00123',
      charges: [expect.objectContaining({ guid: 'charge-a' }), expect.objectContaining({ guid: 'charge-b' })]
    })]);
    expect(await harness.getAll('utilityMeterData')).toEqual([expect.objectContaining({ totalCost: 90, charges: [
      { chargeGuid: 'charge-a', chargeAmount: 30, chargeUsage: 40 },
      { chargeGuid: 'charge-b', chargeAmount: 0, chargeUsage: 0 }
    ] })]);
  });

  it('rolls back the meter and reading changes when a dependent reading write fails', async () => {
    const settings = TestBed.inject(MeterSettingsActionsService);
    const baseline = readMeterSettings(currentMeter);
    const original = IndexedDbTransactionContext.prototype.put;
    vi.spyOn(IndexedDbTransactionContext.prototype, 'put').mockImplementation(function (store, value) {
      return store === 'utilityMeterData' ? Promise.reject(new Error('Reading write failed')) : original.call(this, store, value);
    });
    await expect(settings.updateSettings(identity, { ...baseline, name: 'Do not commit', chargesArray: [
      ...baseline.chargesArray, { guid: 'charge-b', name: 'New charge', chargeType: 'other', displayChargeInTable: true, displayUsageInTable: false }
    ] }, baseline, 'settings-editor')).rejects.toMatchObject({ code: 'persistence-failed' });
    await harness.reopen();
    expect(await harness.getAll('utilityMeter')).toEqual([currentMeter]);
    expect(await harness.getAll('utilityMeterData')).toEqual([currentReading]);
  });

  it('persists a source change and compatible group reassignment together through reopening', async () => {
    const gasMeter = { ...currentMeter, source: 'Natural Gas' as const, scope: 1, startingUnit: 'SCF',
      energyUnit: 'MMBtu', heatCapacity: 1000, groupId: 'energy-group' };
    await harness.seed({ utilityMeterGroups: [
      { ...group({ id: 5, guid: 'energy-group', groupType: 'Energy' }) },
      { ...group({ id: 6, guid: 'water-group', groupType: 'Water' }) }
    ] });
    await TestBed.inject(IndexedDbTransactionService).runTransaction(['utilityMeter'], 'readwrite', transaction => transaction.put('utilityMeter', gasMeter));
    await TestBed.inject(AccountWorkspaceService).reloadActiveWorkspace();
    const baseline = readMeterSettings(gasMeter);
    await TestBed.inject(MeterSettingsActionsService).updateSettings(identity, { ...baseline,
      source: 'Water Intake', scope: null, startingUnit: 'gal', waterIntakeType: 'Municipal (Potable)', groupId: 'water-group'
    }, baseline, 'settings-editor');
    await harness.reopen();
    expect(await harness.getAll('utilityMeter')).toEqual([expect.objectContaining({
      guid: 'meter-a', source: 'Water Intake', groupId: 'water-group', startingUnit: 'gal', accountNumber: '00123'
    })]);
    expect(await harness.getAll('utilityMeterGroups')).toEqual(expect.arrayContaining([
      expect.objectContaining({ guid: 'energy-group', groupType: 'Energy' }),
      expect.objectContaining({ guid: 'water-group', groupType: 'Water' })
    ]));
    expect(await harness.getAll('utilityMeterData')).toEqual([expect.objectContaining({ guid: 'reading-a', meterId: 'meter-a' })]);
  });
});
