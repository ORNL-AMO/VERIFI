import { firstValueFrom } from 'rxjs';
import { dbConfig } from '../_dbConfig';
import { IndexedDbTransactionService } from '../indexed-db-transaction.service';
import { IndexedDbTestHarness } from '../testing/indexed-db-test-harness';
import { DataMigrationRunnerService } from './data-migration-runner.service';

describe('data migration runner in Chromium', () => {
  let harness: IndexedDbTestHarness;
  let runner: DataMigrationRunnerService;

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('data-migrations');
    runner = new DataMigrationRunnerService(new IndexedDbTransactionService(indexedDB, {
      [harness.databaseName]: { ...dbConfig, name: harness.databaseName }
    }));
  });

  afterEach(async () => harness.destroy());

  it('initializes an empty database at the current version', async () => {
    await runner.runMigrations();
    const metadata = await harness.getAll('application');
    expect(metadata).toHaveLength(1);
    expect(metadata[0].dataVersion).toBe(1);
    expect(await harness.getAll('accounts')).toEqual([]);
  });

  it('migrates legacy records atomically and preserves relationships after reopen', async () => {
    await harness.seed({
      application: [{ id: 1, guid: 'application', appOpenCount: 0 }],
      accounts: [{ id: 1, guid: 'account', name: 'Legacy' }],
      facilities: [{ id: 2, guid: 'facility', accountId: 'account', name: 'Plant' }],
      utilityMeter: [{ id: 3, guid: 'meter', accountId: 'account', facilityId: 'facility', source: 'Water' }],
      utilityMeterData: [{
        id: 4, guid: 'reading', accountId: 'account', facilityId: 'facility', meterId: 'meter',
        readDate: '2024-01-31T00:00:00.000Z'
      }]
    });

    await Promise.all([runner.runMigrations(), runner.runMigrations()]);
    await harness.reopen();

    expect((await harness.getAll('application'))[0].dataVersion).toBe(1);
    expect((await harness.getAll('accounts'))[0]).toMatchObject({ id: 1, guid: 'account', electricityUnit: 'kWh' });
    expect((await harness.getAll('utilityMeter'))[0]).toMatchObject({ id: 3, facilityId: 'facility', source: 'Water Intake' });
    expect((await harness.getAll('utilityMeterData'))[0]).toMatchObject({ id: 4, meterId: 'meter', year: 2024, month: 1, day: 31 });
  });

  it('does not rewrite current-version domain records', async () => {
    const account = { id: 1, guid: 'account', name: 'Current', unknown: 'preserved' };
    await harness.seed({
      application: [{ id: 1, guid: 'application', dataVersion: 1 }],
      accounts: [account]
    });
    await runner.runMigrations();
    expect(await firstValueFrom(harness.dbService.getByKey('accounts', 1))).toEqual(account);
  });

  it('rolls back a failed transaction and allows a later retry', async () => {
    await harness.seed({
      application: [{ id: 1, guid: 'application', dataVersion: 0 }],
      accounts: [{ id: 1, guid: 'account', name: 'Legacy' }],
      facilities: [{ id: 2, guid: 'facility', accountId: 'account', name: 'Plant' }]
    });

    const objectStorePrototype = IDBObjectStore.prototype as any;
    const originalPut = objectStorePrototype.put;
    let putCount = 0;
    objectStorePrototype.put = function (...args: unknown[]) {
      putCount++;
      if (putCount === 2) { throw new Error('forced migration write failure'); }
      return originalPut.apply(this, args);
    };

    try {
      await expect(runner.runMigrations()).rejects.toThrow('forced migration write failure');
    } finally {
      objectStorePrototype.put = originalPut;
    }

    expect((await harness.getAll('application'))[0].dataVersion).toBe(0);
    expect((await harness.getAll('accounts'))[0].electricityUnit).toBeUndefined();
    expect((await harness.getAll('facilities'))[0].electricityUnit).toBeUndefined();

    await runner.runMigrations();
    expect((await harness.getAll('application'))[0].dataVersion).toBe(1);
    expect((await harness.getAll('accounts'))[0].electricityUnit).toBe('kWh');
    expect((await harness.getAll('facilities'))[0].electricityUnit).toBe('kWh');
  });

  it('migrates a large meter-reading dataset without losing GUID relationships', async () => {
    const readings = Array.from({ length: 500 }, (_, index) => ({
      id: index + 10,
      guid: `reading-${index}`,
      accountId: 'account',
      facilityId: 'facility',
      meterId: 'meter',
      readDate: `2024-${String((index % 12) + 1).padStart(2, '0')}-01T00:00:00.000Z`
    }));
    await harness.seed({
      application: [{ id: 1, guid: 'application', dataVersion: 0 }],
      accounts: [{ id: 1, guid: 'account', name: 'Legacy' }],
      facilities: [{ id: 2, guid: 'facility', accountId: 'account', name: 'Plant' }],
      utilityMeter: [{ id: 3, guid: 'meter', accountId: 'account', facilityId: 'facility', source: 'Electricity' }],
      utilityMeterData: readings
    });

    await runner.runMigrations();

    const migratedReadings = await harness.getAll('utilityMeterData');
    expect(migratedReadings).toHaveLength(500);
    expect(migratedReadings.every(reading => reading.meterId === 'meter' && reading.facilityId === 'facility')).toBe(true);
    expect(migratedReadings.every(reading => reading.migratedDates === true)).toBe(true);
  });
});
