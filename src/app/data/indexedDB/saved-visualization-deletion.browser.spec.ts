import { vi } from 'vitest';
import { IdbAccount } from '@data/models/idbModels/account';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbSavedVisualization } from '@data/models/idbModels/savedVisualization';
import { createVisualizationDefinition } from '@domain/visualizations/visualization-definition';
import { utilityVisualizationFixture } from '@domain/visualizations/testing/visualization-fixtures';
import { dbConfig } from './_dbConfig';
import { IndexedDbCascadeDeleteService } from './indexed-db-cascade-delete.service';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from './indexed-db-transaction.service';
import { IndexedDbTestHarness } from './testing/indexed-db-test-harness';
import { accountAFixture, accountBFixture, twoAccountPersistenceSeed } from './testing/indexed-db-test-fixtures';

describe('saved visualization owner deletion in Chromium', () => {
  let harness: IndexedDbTestHarness;
  let deletion: IndexedDbCascadeDeleteService;
  const records: IdbSavedVisualization[] = [
    saved('portfolio-a', 'account-a'), saved('facility-chart-a', 'account-a', 'facility-a'),
    saved('portfolio-b', 'account-b'), saved('facility-chart-b', 'account-b', 'facility-b')
  ];

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('saved-visualization-owner-delete');
    await harness.seed({ ...twoAccountPersistenceSeed, savedVisualizations: records.map(item => ({ ...item })) });
    deletion = new IndexedDbCascadeDeleteService(new IndexedDbTransactionService(indexedDB,
      { [harness.databaseName]: { ...dbConfig, name: harness.databaseName } }));
  });
  afterEach(async () => { vi.restoreAllMocks(); await harness.destroy(); });

  it('deletes only facility-owned charts and preserves exact portfolio references across reopen', async () => {
    await deletion.deleteFacility(accountAFixture.facility as unknown as IdbFacility, 'account-a');
    await harness.reopen();
    const restored = await harness.getAll('savedVisualizations');
    expect(restored.map(item => item.guid)).toEqual(['portfolio-a', 'portfolio-b', 'facility-chart-b']);
    expect(restored[0].definition).toEqual(records[0].definition);
    expect(await harness.getAll('facilities')).toEqual([accountBFixture.facility]);
  });

  it('derives live All ownership from the pre-delete catalog instead of stale envelope metadata', async () => {
    const single = { ...saved('live-all', 'account-a'), facilityId: 'facility-b', definition: { ...utilityVisualizationFixture(), facilitySelection: { kind: 'all' as const } } };
    await harness.seed({ savedVisualizations: [single] });
    await deletion.deleteFacility(accountAFixture.facility as unknown as IdbFacility, 'account-a');
    expect((await harness.getAll('savedVisualizations')).some(item => item.guid === 'live-all')).toBe(false);
  });

  it('deletes all account-owned charts without touching another account', async () => {
    await deletion.deleteAccount(accountAFixture.account as unknown as IdbAccount);
    await harness.reopen();
    expect((await harness.getAll('savedVisualizations')).map(item => item.guid)).toEqual(['portfolio-b', 'facility-chart-b']);
    expect(await harness.getAll('accounts')).toEqual([accountBFixture.account]);
  });

  it.each(['account', 'facility'] as const)('rolls back visualization deletion with a failed %s cascade', async kind => {
    const before = await harness.getAll('savedVisualizations');
    const original = IndexedDbTransactionContext.prototype.deleteAllByIndex;
    vi.spyOn(IndexedDbTransactionContext.prototype, 'deleteAllByIndex').mockImplementation(function (store, index, query) {
      if (store === 'utilityMeter') return Promise.reject(new Error('Injected owner deletion failure'));
      return original.call(this, store, index, query);
    });
    const operation = kind === 'account' ? deletion.deleteAccount(accountAFixture.account as unknown as IdbAccount)
      : deletion.deleteFacility(accountAFixture.facility as unknown as IdbFacility, 'account-a');
    await expect(operation).rejects.toThrow('Injected owner deletion failure');
    await harness.reopen();
    expect(await harness.getAll('savedVisualizations')).toEqual(before);
    expect(await harness.getAll('accounts')).toHaveLength(2);
    expect(await harness.getAll('facilities')).toHaveLength(2);
  });
});

function saved(guid: string, accountId: string, facilityId?: string): IdbSavedVisualization {
  return { guid, accountId, ...(facilityId ? { facilityId } : {}), recordVersion: 1, revision: 1,
    createdDate: new Date('2026-11-11T00:00:00.000Z'), modifiedDate: new Date('2026-11-11T00:00:00.000Z'),
    definition: facilityId ? createVisualizationDefinition(guid, accountId, { kind: 'fixed', facilityGuids: [facilityId] }, 'utility')
      : { ...utilityVisualizationFixture(), accountGuid: accountId, facilitySelection: { kind: 'fixed', facilityGuids: [accountId === 'account-a' ? 'facility-a' : 'facility-b', 'missing-second-facility'] } } };
}
