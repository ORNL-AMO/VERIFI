import { vi } from 'vitest';
import { SpreadsheetImportCommandService } from './spreadsheet-import-command.service';
import { ImportCommitRequest } from './spreadsheet-import.models';

describe('SpreadsheetImportCommandService', () => {
  function setup(failStore?: string, existingByStore: Record<string, any[]> = {}) {
    const writes: Array<{ store: string; value: any }> = [];
    const context = {
      getAll: vi.fn(async (store: string) => structuredClone(existingByStore[store] ?? [])),
      add: vi.fn(async (store: string, value: any) => {
        if (store === failStore) throw new Error('forced write failure');
        writes.push({ store, value });
        return 1;
      }),
      put: vi.fn(async (store: string, value: any) => {
        writes.push({ store, value });
        return 1;
      })
    };
    const transactions = {
      runTransaction: vi.fn(async (_stores, _mode, operation) => operation(context))
    };
    const boundary = {
      execute: vi.fn(async (options, persist) => ({ value: await persist(), change: options }))
    };
    const store = { account: () => ({ guid: 'account-a' }) };
    return {
      service: new SpreadsheetImportCommandService(boundary as any, store as any, transactions as any),
      writes, transactions, boundary
    };
  }

  it('persists related spreadsheet records in one account-level transaction', async () => {
    const { service, writes, transactions, boundary } = setup();
    const summary = await service.commit(request());

    expect(transactions.runTransaction).toHaveBeenCalledOnce();
    expect(boundary.execute).toHaveBeenCalledOnce();
    expect(writes.map(write => write.store)).toEqual(['facilities', 'utilityMeter', 'utilityMeterData']);
    expect(summary.added.facilities).toBe(1);
    expect(summary.added.meters).toBe(1);
    expect(summary.added.meterReadings).toBe(1);
  });

  it('rejects the complete command when any transaction write fails', async () => {
    const { service } = setup('utilityMeterData');
    await expect(service.commit(request())).rejects.toThrow('forced write failure');
  });

  it('rejects records belonging to another account before writing', async () => {
    const { service, writes } = setup();
    const invalid = request();
    invalid.meters[0].accountId = 'account-b';
    await expect(service.commit(invalid)).rejects.toMatchObject({ code: 'cross-account-entity' });
    expect(writes).toHaveLength(0);
  });

  it('rejects duplicate reading periods before writing', async () => {
    const { service, writes } = setup();
    const invalid = request();
    invalid.meterReadings.push({ ...invalid.meterReadings[0], guid: 'reading-b' });
    await expect(service.commit(invalid)).rejects.toMatchObject({ code: 'validation-failed' });
    expect(writes).toHaveLength(0);
  });

  it('keeps same-date workspace readings while still importing new dates', async () => {
    const imported = request();
    const current = { ...structuredClone(imported.meterReadings[0]), guid: 'current-reading', id: 12 };
    imported.meterReadings.push({
      ...structuredClone(imported.meterReadings[0]),
      guid: 'new-date',
      id: undefined,
      month: 2
    });
    imported.skipExistingReadingsMeterIds = ['meter-a'];
    const { service, writes } = setup(undefined, { utilityMeterData: [current] });

    const summary = await service.commit(imported);

    const readingWrites = writes.filter(write => write.store === 'utilityMeterData');
    expect(readingWrites.map(write => write.value.guid)).toEqual(['new-date']);
    expect(summary.skippedMeterReadings).toBe(1);
  });

  it('excludes an acknowledged invalid reading using the shared validation contract', async () => {
    const imported = request();
    imported.meterReadings[0].month = 13;
    imported.excludedMeterReadingIds = [imported.meterReadings[0].guid];
    imported.invalidMeterReadingsAcknowledged = true;
    const { service, writes } = setup();

    const summary = await service.commit(imported);

    expect(writes.filter(write => write.store === 'utilityMeterData')).toHaveLength(0);
    expect(summary.excludedInvalidMeterReadings).toBe(1);
  });

  it('rejects an invalid reading that has not been excluded and acknowledged', async () => {
    const imported = request();
    imported.meterReadings[0].month = 13;
    const { service, writes } = setup();

    await expect(service.commit(imported)).rejects.toMatchObject({ code: 'validation-failed' });
    expect(writes).toHaveLength(0);
  });

  function request(): ImportCommitRequest {
    const timestamp = new Date('2025-01-01T00:00:00Z');
    return {
      accountGuid: 'account-a', draftId: 'draft-a', kind: 'verifi-v3',
      facilities: [{ id: undefined, guid: 'facility-a', accountId: 'account-a', name: 'Plant', createdDate: timestamp, modifiedDate: timestamp } as any],
      meterGroups: [],
      meters: [{ id: undefined, guid: 'meter-a', facilityId: 'facility-a', accountId: 'account-a', name: 'Electricity', createdDate: timestamp, modifiedDate: timestamp } as any],
      meterReadings: [{ id: undefined, guid: 'reading-a', meterId: 'meter-a', facilityId: 'facility-a', accountId: 'account-a', year: 2025, month: 1, day: 1, totalEnergyUse: 10, createdDate: timestamp, modifiedDate: timestamp } as any],
      predictors: [], predictorReadings: [], energyUseGroups: [], energyUseEquipment: [],
      skipExistingReadingsMeterIds: [], skipExistingPredictorFacilityIds: [],
      excludedMeterReadingIds: [], invalidMeterReadingsAcknowledged: false
    };
  }
});
