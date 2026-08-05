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
});
