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

  it('allows one duplicate meter date when the other reading is explicitly excluded', async () => {
    const imported = request();
    imported.meterReadings = [
      { ...imported.meterReadings[0], id: 22, guid: 'shared-reading', totalEnergyUse: 10 },
      { ...imported.meterReadings[0], id: 22, guid: 'shared-reading', totalEnergyUse: 12 }
    ];
    imported.excludedMeterReadingIds = ['22:1'];
    imported.invalidMeterReadingsAcknowledged = true;
    const { service, writes } = setup();

    await service.commit(imported);

    expect(writes.filter(write => write.store === 'utilityMeterData').map(write => write.value.totalEnergyUse)).toEqual([10]);
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

  it('rejects incomplete Weather predictor mappings before writing', async () => {
    const imported = request();
    imported.predictors = [predictor({ predictorType: 'Weather' })];
    const { service, writes } = setup();

    await expect(service.commit(imported)).rejects.toMatchObject({ code: 'validation-failed' });
    expect(writes).toHaveLength(0);
  });

  it('requires imported Weather readings to be manual overrides', async () => {
    const imported = request();
    imported.predictors = [predictor({
      predictorType: 'Weather', weatherStationId: 'KORD', weatherStationName: 'Chicago O’Hare',
      weatherDataType: 'HDD', heatingBaseTemperature: 60
    })];
    imported.predictorReadings = [{
      guid: 'predictor-reading-a', predictorId: 'predictor-a', facilityId: 'facility-a', accountId: 'account-a',
      year: 2026, month: 1, amount: 12, weatherOverride: false
    } as any];
    const { service, writes } = setup(undefined, { predictors: [structuredClone(imported.predictors[0])] });

    await expect(service.commit(imported)).rejects.toMatchObject({ code: 'validation-failed' });
    expect(writes).toHaveLength(0);
  });

  it('rejects a new Weather predictor even when its station settings are complete', async () => {
    const imported = request();
    imported.predictors = [predictor({
      predictorType: 'Weather', weatherStationId: 'KORD', weatherStationName: 'Chicago O’Hare',
      weatherDataType: 'HDD', heatingBaseTemperature: 60
    })];
    const { service, writes } = setup();

    await expect(service.commit(imported)).rejects.toThrow('matched to an existing predictor');
    expect(writes).toHaveLength(0);
  });

  it('rejects a Weather predictor matched from another facility', async () => {
    const imported = request();
    imported.predictors = [predictor({
      predictorType: 'Weather', weatherStationId: 'KORD', weatherStationName: 'Chicago O’Hare',
      weatherDataType: 'HDD', heatingBaseTemperature: 60
    })];
    const persisted = predictor({ facilityId: 'facility-b' });
    const { service, writes } = setup(undefined, { predictors: [persisted] });

    await expect(service.commit(imported)).rejects.toThrow('same facility');
    expect(writes).toHaveLength(0);
  });

  it('persists an existing Weather match when imported readings are overrides', async () => {
    const imported = request();
    const weather = predictor({
      id: 7, predictorType: 'Weather', weatherStationId: 'KORD', weatherStationName: 'Chicago O’Hare',
      weatherDataType: 'HDD', heatingBaseTemperature: 60
    });
    imported.predictors = [weather];
    imported.predictorReadings = [{
      guid: 'predictor-reading-a', predictorId: 'predictor-a', facilityId: 'facility-a', accountId: 'account-a',
      year: 2026, month: 1, amount: 12, weatherOverride: true
    } as any];
    const { service, writes } = setup(undefined, { predictors: [structuredClone(weather)] });

    await service.commit(imported);

    expect(writes).toEqual(expect.arrayContaining([
      expect.objectContaining({ store: 'predictors' }),
      expect.objectContaining({ store: 'predictorData', value: expect.objectContaining({ weatherOverride: true }) })
    ]));
  });

  it('keeps same-month predictor readings while still importing new months', async () => {
    const imported = request();
    const selectedPredictor = predictor({ id: 7 });
    const overlap = predictorReading({ guid: 'overlap', amount: 12 });
    const added = predictorReading({ guid: 'new-month', month: 2, amount: 15 });
    imported.predictors = [selectedPredictor];
    imported.predictorReadings = [overlap, added];
    imported.skipExistingPredictorIds = [selectedPredictor.guid];
    const current = predictorReading({ id: 22, guid: 'current', amount: 10 });
    const { service, writes } = setup(undefined, { predictors: [selectedPredictor], predictorData: [current] });

    const summary = await service.commit(imported);

    expect(writes.filter(write => write.store === 'predictorData').map(write => write.value.guid)).toEqual(['new-month']);
    expect(summary.skippedPredictorReadings).toBe(1);
  });

  it('excludes acknowledged invalid predictor readings and rejects unresolved values', async () => {
    const imported = request();
    imported.predictors = [predictor()];
    imported.predictorReadings = [predictorReading({ month: 13 })];
    imported.excludedPredictorReadingIds = ['predictor-reading-a'];
    imported.invalidPredictorReadingsAcknowledged = true;
    const { service, writes } = setup();

    const summary = await service.commit(imported);

    expect(writes.filter(write => write.store === 'predictorData')).toHaveLength(0);
    expect(summary.excludedInvalidPredictorReadings).toBe(1);

    imported.excludedPredictorReadingIds = [];
    const unresolved = setup();
    await expect(unresolved.service.commit(imported)).rejects.toThrow('Invalid predictor readings');
    expect(unresolved.writes).toHaveLength(0);
  });

  it('allows one duplicate predictor month when the other reading is explicitly excluded', async () => {
    const imported = request();
    imported.predictors = [predictor()];
    imported.predictorReadings = [
      predictorReading({ id: 22, guid: 'shared-existing-reading', amount: 10 }),
      predictorReading({ id: 22, guid: 'shared-existing-reading', amount: 12 })
    ];
    imported.excludedPredictorReadingIds = ['22:1'];
    imported.invalidPredictorReadingsAcknowledged = true;
    const { service, writes } = setup();

    await service.commit(imported);

    expect(writes.filter(write => write.store === 'predictorData').map(write => write.value.guid)).toEqual(['shared-existing-reading']);
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
      skipExistingReadingsMeterIds: [], skipExistingPredictorIds: [],
      excludedMeterReadingIds: [], invalidMeterReadingsAcknowledged: false,
      excludedPredictorReadingIds: [], invalidPredictorReadingsAcknowledged: false
    };
  }

  function predictor(overrides: Record<string, unknown> = {}): any {
    return {
      guid: 'predictor-a', accountId: 'account-a', facilityId: 'facility-a', name: 'Production', unit: 'tons',
      predictorType: 'Standard', weatherDataType: 'HDD', weatherStationId: '', weatherStationName: '',
      ...overrides
    };
  }

  function predictorReading(overrides: Record<string, unknown> = {}): any {
    return {
      guid: 'predictor-reading-a', accountId: 'account-a', facilityId: 'facility-a', predictorId: 'predictor-a',
      year: 2026, month: 1, amount: 10, weatherOverride: false, weatherDataWarning: false,
      ...overrides
    };
  }
});
