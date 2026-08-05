import { emptyMigrationData } from './data-migration.models';
import { VERSION_ZERO_TO_ONE_MIGRATION } from './version-zero-to-one.migration';

describe('version zero to one migration', () => {
  it('normalizes representative legacy records without mutating the input', () => {
    const input = emptyMigrationData();
    input.accounts.push({ guid: 'account', name: 'Legacy', volumeGasUnit: 'MCF', unknown: 'keep' } as any);
    input.facilities.push({ guid: 'facility', accountId: 'account', volumeGasUnit: 'MCF' } as any);
    input.meterGroups.push({ guid: 'group', accountId: 'account', facilityId: 'facility' } as any);
    input.meters.push({ guid: 'meter', accountId: 'account', facilityId: 'facility', source: 'Water' } as any);
    input.meterData.push({
      guid: 'reading', accountId: 'account', facilityId: 'facility', meterId: 'meter',
      readDate: '2024-01-31T00:00:00.000Z', commodityCharge: 12
    } as any);
    input.predictorData.push({
      guid: 'predictor-reading', accountId: 'account', facilityId: 'facility',
      predictorId: 'predictor', date: '2024-02-01T00:00:00.000Z'
    } as any);
    input.customGWPs.push({ guid: 'gwp', accountId: 'account', gwp: 25 } as any);

    const result = VERSION_ZERO_TO_ONE_MIGRATION.migrate(input);

    expect(input.accounts[0].electricityUnit).toBeUndefined();
    expect((result.data.accounts[0] as any).unknown).toBe('keep');
    expect(result.data.accounts[0]).toMatchObject({ electricityUnit: 'kWh', volumeGasUnit: 'kSCF' });
    expect(result.data.facilities[0]).toMatchObject({ electricityUnit: 'kWh', classification: 'Manufacturing' });
    expect(result.data.meters[0]).toMatchObject({ source: 'Water Intake', demandUnit: 'kW' });
    expect(result.data.meterData[0]).toMatchObject({ year: 2024, month: 1, day: 31, migratedDates: true });
    expect(result.data.predictorData[0]).toMatchObject({ year: 2024, month: 2, migratedDates: true });
    expect(result.data.customGWPs[0]).toMatchObject({ gwp_ar4: 25, gwp_ar5: 25, gwp_ar6: 25 });
  });

  it('converts legacy predictor rows and is idempotent', () => {
    const input = emptyMigrationData();
    input.deprecatedPredictorData.push({
      id: 1, guid: 'old-row', accountId: 'account', facilityId: 'facility',
      date: new Date(2024, 2, 1), predictors: [{ id: 'old-predictor', name: 'Production', amount: 10, predictorType: 'Standard' }]
    });

    const first = VERSION_ZERO_TO_ONE_MIGRATION.migrate(input);
    const second = VERSION_ZERO_TO_ONE_MIGRATION.migrate(first.data);

    expect(first.data.deprecatedPredictorData).toEqual([]);
    expect(first.data.predictors).toHaveLength(1);
    expect(first.data.predictorData[0]).toMatchObject({ predictorId: 'old-predictor', year: 2024, month: 3, amount: 10 });
    expect(second.changedCollections).toEqual([]);
    expect(second.data).toEqual(first.data);
  });
});
