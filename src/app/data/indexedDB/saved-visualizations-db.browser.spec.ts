import { firstValueFrom } from 'rxjs';
import { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { IndexedDbAccessService } from './indexed-db-access.service';
import { SavedVisualizationsDbService } from './saved-visualizations-db.service';
import { IndexedDbTestHarness } from './testing/indexed-db-test-harness';
import { twoAccountPersistenceSeed } from './testing/indexed-db-test-fixtures';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { readSavedVisualization } from '@data/visualizations/saved-visualization-record';
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

  it('reads historical definitions without writes and preserves version2 overrides across native reopen', async () => {
    harness = await IndexedDbTestHarness.create('saved-visualizations-v2');
    const repository = () => new SavedVisualizationsDbService(harness.dbService, new IndexedDbAccessService(harness.dbService));
    const current = utilityVisualizationFixture();
    const { resourceGuid, ...wildcard } = current.series[0];
    const definitions = [{ ...current, version: 1 }, { ...current, series: [{ ...wildcard, overrides: [
      { resourceGuid: 'meter-a', visible: false, order: 0 }, { resourceGuid: 'absent-meter', color: '#123456', order: 2 },
      { seriesId: 'utility:source:Electricity', label: 'Category appearance', order: 1 }
    ] }] }];
    for (const [index, definition] of definitions.entries()) await firstValueFrom(repository().addWithObservable({
      guid: `version-${index}`, accountId: current.accountGuid, recordVersion: 1, revision: 4,
      createdDate: new Date('2026-11-11T00:00:00Z'), modifiedDate: new Date('2026-11-11T00:00:00Z'), definition
    }));
    const stored = await repository().getAllAccountVisualizations(current.accountGuid);
    for (const record of stored) {
      const decoded = readSavedVisualization(record);
      expect(decoded.state).toBe('valid');
      expect('definition' in decoded && decoded.definition.version).toBe(2);
    }
    await harness.reopen();
    expect(await repository().getAllAccountVisualizations(current.accountGuid)).toEqual(stored);
    expect((await repository().getStoredByGuid('version-0'))?.definition).toEqual(definitions[0]);
    expect((await repository().getStoredByGuid('version-1'))?.definition).toEqual(definitions[1]);
  });

  it('keeps account queries isolated and preserves opaque payloads and local keys after reopen', async () => {
    harness = await IndexedDbTestHarness.create('saved-visualizations-reopen');
    let repository = new SavedVisualizationsDbService(harness.dbService, new IndexedDbAccessService(harness.dbService));
    const definition = { version: 90, provider: { unknown: ['retain', 0, null] } };
    const records: IdbSavedVisualization[] = ['a', 'b'].map(account => ({
      guid: `chart-${account}`, accountId: `account-${account}`, recordVersion: 1, revision: 1,
      createdDate: new Date('2026-11-11T00:00:00Z'), modifiedDate: new Date('2026-11-11T00:00:00Z'), definition
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
