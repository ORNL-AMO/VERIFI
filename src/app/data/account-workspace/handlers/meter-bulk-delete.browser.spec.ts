import { TestBed } from '@angular/core/testing';
import { IndexedDbTransactionContext } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from '@data/models/idbModels/utilityMeterData';
import { MeterCommandHandler } from './meter-command-handler.service';

// Minimal persisted records exercise the actual shared database without UI or production data.
describe('atomic bulk meter deletion in Chromium', () => {
  let harness: IndexedDbTestHarness;
  const meters = [1, 2, 3, 4].map(id => ({ id, guid: `meter-${id}`, name: `Meter ${id}`, accountId: id === 4 ? 'other-account' : 'account', facilityId: id >= 3 ? 'other-facility' : 'facility' }));
  const readings = meters.map(item => ({ id: item.id + 10, guid: `reading-${item.id}`, accountId: item.accountId, facilityId: item.facilityId, meterId: item.guid }));
  const changes = () => meters.slice(0, 2).map(item => ({ meter: item as IdbUtilityMeter, meterData: readings.filter(data => data.meterId === item.guid) as IdbUtilityMeterData[] }));
  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('meter-bulk-delete');
    await harness.seed({ utilityMeter: meters, utilityMeterData: readings, utilityMeterGroups: [{ id: 1, guid: 'group', accountId: 'account', facilityId: 'facility' }] });
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });

  it('deletes selected meters and readings, retains all other records and survives reopening', async () => {
    const result = await TestBed.inject(MeterCommandHandler).deleteMetersWithData(changes(), 'account');
    expect(result).toBe(2);
    await harness.reopen();
    expect(await harness.getAll('utilityMeter')).toEqual(meters.slice(2));
    expect(await harness.getAll('utilityMeterData')).toEqual(readings.slice(2));
    expect(await harness.getAll('utilityMeterGroups')).toHaveLength(1);
  });
  it('retains unselected meters and readings in the same facility after reopening', async () => {
    await TestBed.inject(MeterCommandHandler).deleteMetersWithData(changes().slice(0, 1), 'account');
    await harness.reopen();
    expect(await harness.getAll('utilityMeter')).toEqual(meters.slice(1));
    expect(await harness.getAll('utilityMeterData')).toEqual(readings.slice(1));
  });
  it('rolls back every deletion when a later write fails and supports retry', async () => {
    const original = IndexedDbTransactionContext.prototype.deleteByKey;
    const spy = vi.spyOn(IndexedDbTransactionContext.prototype, 'deleteByKey').mockImplementation(function (store, key) {
      if (store === 'utilityMeter' && key === 2) return Promise.reject(new Error('Injected deletion failure'));
      return original.call(this, store, key);
    });
    await expect(TestBed.inject(MeterCommandHandler).deleteMetersWithData(changes(), 'account')).rejects.toThrow('Injected deletion failure');
    await harness.reopen();
    expect(await harness.getAll('utilityMeter')).toEqual(meters);
    expect(await harness.getAll('utilityMeterData')).toEqual(readings);
    spy.mockRestore();
    await TestBed.inject(MeterCommandHandler).deleteMetersWithData(changes(), 'account');
    expect(await harness.getAll('utilityMeter')).toHaveLength(2);
  });
  it('rejects cross-account, cross-facility, duplicate, invalid-ID and unrelated-reading requests', async () => {
    const handler = TestBed.inject(MeterCommandHandler);
    const valid = changes();
    for (const request of [
      [{ meter: meters[3] as IdbUtilityMeter, meterData: [] }],
      [...valid, { meter: meters[2] as IdbUtilityMeter, meterData: [] }],
      [valid[0], valid[0]],
      [{ meter: { ...valid[0].meter, id: undefined }, meterData: [] }],
      [{ meter: valid[0].meter, meterData: [readings[1] as IdbUtilityMeterData] }]
    ]) await expect(handler.deleteMetersWithData(request, 'account')).rejects.toBeDefined();
    expect(await harness.getAll('utilityMeter')).toEqual(meters);
    expect(await harness.getAll('utilityMeterData')).toEqual(readings);
  });
  it('rejects incomplete or stale snapshots before deleting anything', async () => {
    const handler = TestBed.inject(MeterCommandHandler);
    const valid = changes();
    await expect(handler.deleteMetersWithData([{ ...valid[0], meterData: [] }], 'account')).rejects.toMatchObject({ code: 'validation-failed' });
    await expect(handler.deleteMetersWithData([{ ...valid[0], meter: { ...valid[0].meter, guid: 'stale' } }], 'account')).rejects.toBeDefined();
    expect(await harness.getAll('utilityMeter')).toEqual(meters);
  });
});
