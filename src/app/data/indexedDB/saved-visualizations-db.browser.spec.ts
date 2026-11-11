import { firstValueFrom } from 'rxjs';
import { IdbSavedVisualization } from '@data/models/idbModels/saved-visualization';
import { IndexedDbAccessService } from './indexed-db-access.service';
import { SavedVisualizationsDbService } from './saved-visualizations-db.service';
import { IndexedDbTestHarness } from './testing/indexed-db-test-harness';
import { twoAccountPersistenceSeed } from './testing/indexed-db-test-fixtures';
import { VERIFI_DB_VERSION } from './indexed-db-schema';

describe('saved visualization storage in Chromium', () => {
  let harness: IndexedDbTestHarness;

  afterEach(async () => { if (harness) await harness.destroy(); });

  it('upgrades a genuine version 20 database, retains all records, and reopens with an empty definition store', async () => {
    harness = await IndexedDbTestHarness.createUpgradedFromVersion20('saved-visualizations-upgrade', twoAccountPersistenceSeed);
    expect(await firstValueFrom(harness.dbService.getDatabaseVersion())).toBe(VERIFI_DB_VERSION);
    expect(await harness.getAll('savedVisualizations')).toEqual([]);
    expect((await harness.getSchema()).savedVisualizations).toEqual({
      guid: { keyPath: 'guid', unique: false },
      accountId: { keyPath: 'accountId', unique: false },
      facilityId: { keyPath: 'facilityId', unique: false }
    });
    await harness.reopen();
    for (const [storeName, records] of Object.entries(twoAccountPersistenceSeed)) {
      expect(await harness.getAll(storeName)).toEqual(records);
    }
    expect(await harness.getAll('savedVisualizations')).toEqual([]);
  });

  it('keeps account queries isolated and preserves opaque payloads and local keys after reopen', async () => {
    harness = await IndexedDbTestHarness.create('saved-visualizations-reopen');
    let repository = new SavedVisualizationsDbService(harness.dbService, new IndexedDbAccessService(harness.dbService));
    const definition = { version: 90, provider: { unknown: ['retain', 0, null] } };
    const records: IdbSavedVisualization[] = ['a', 'b'].map(account => ({
      guid: `chart-${account}`, accountId: `account-${account}`, recordVersion: 1, revision: 1,
      createdDate: '2026-11-11T00:00:00Z', modifiedDate: '2026-11-11T00:00:00Z', definition
    }));
    for (const record of records) await firstValueFrom(repository.addWithObservable(record));
    const saved = await repository.getStoredByGuid('chart-a');
    expect(saved?.id).toBeDefined();
    expect((await repository.getAllAccountVisualizations('account-a')).map(record => record.guid)).toEqual(['chart-a']);
    await harness.reopen();
    repository = new SavedVisualizationsDbService(harness.dbService, new IndexedDbAccessService(harness.dbService));
    expect(await repository.getStoredByGuid('chart-a')).toEqual(saved);
    expect((await repository.getStoredByGuid('chart-b'))?.definition).toEqual(definition);
  });
});
