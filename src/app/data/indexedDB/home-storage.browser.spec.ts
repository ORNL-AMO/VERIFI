import { firstValueFrom } from 'rxjs';
import { IndexedDbTestHarness } from './testing/indexed-db-test-harness';
import { twoAccountPersistenceSeed } from './testing/indexed-db-test-fixtures';
import { IndexedDbTransactionService } from './indexed-db-transaction.service';
import { TestBed } from '@angular/core/testing';
import { getNewIdbHomeDashboard, getNewIdbHomeOwner, IdbHomeDashboard } from '@data/models/idbModels/homeDashboard';
import { homeAccountOwner, chartWidget, homeDefinition, homeOwnerState } from '@domain/home/testing/home-fixtures';
import { migrateVersion22, VERIFI_DB_VERSION } from './indexed-db-schema';

describe('Home schema and restart in Chromium', () => {
  let harness: IndexedDbTestHarness;
  afterEach(async () => { if (harness) await harness.destroy(); });
  it('upgrades a frozen version 21 schema, creates indexed empty stores and preserves previous data', async () => {
    harness = await IndexedDbTestHarness.createUpgradedFromVersion21('home-upgrade', twoAccountPersistenceSeed);
    expect(await firstValueFrom(harness.dbService.getDatabaseVersion())).toBe(VERIFI_DB_VERSION);
    const schema = await harness.getSchema();
    for (const name of ['homeOwners', 'homeDashboards']) {
      expect(await harness.getAll(name)).toEqual([]);
      expect(schema[name]).toEqual({ guid: { keyPath: 'guid', unique: false }, accountId: { keyPath: 'accountId', unique: false }, facilityId: { keyPath: 'facilityId', unique: false } });
    }
    await harness.reopen();
    for (const [name, records] of Object.entries(twoAccountPersistenceSeed)) expect(await harness.getAll(name)).toEqual(records);
    // Structural upgrade is independently idempotent in the same versionchange transaction.
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(`home-idempotence-${harness.databaseName}`, 1);
      request.onupgradeneeded = () => { migrateVersion22(request.result, request.transaction!); migrateVersion22(request.result, request.transaction!); };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => { request.result.close(); const removal = indexedDB.deleteDatabase(`home-idempotence-${harness.databaseName}`); removal.onsuccess = () => resolve(); removal.onerror = () => reject(removal.error); };
    });
  });
  it('saves a coherent owner/layout graph, rolls back failures and survives reopen with independent numeric keys', async () => {
    harness = await IndexedDbTestHarness.create('home-roundtrip');
    const tx = TestBed.inject(IndexedDbTransactionService);
    const dashboard = getNewIdbHomeDashboard('account-a', homeAccountOwner, homeDefinition([chartWidget()]));
    const owner = getNewIdbHomeOwner('account-a', homeAccountOwner, homeOwnerState([dashboard.guid]));
    await expect(tx.runTransaction(['homeOwners', 'homeDashboards'], 'readwrite', async context => {
      await context.add('homeOwners', owner); await context.add('homeDashboards', dashboard); throw new Error('forced rollback');
    })).rejects.toThrow('forced rollback');
    expect(await harness.getAll('homeOwners')).toEqual([]);
    expect(await harness.getAll('homeDashboards')).toEqual([]);
    await tx.runTransaction(['homeOwners', 'homeDashboards'], 'readwrite', async context => {
      await context.add('homeOwners', owner); await context.add('homeDashboards', dashboard);
    });
    const stored = await harness.getAll('homeDashboards');
    expect(stored[0].id).toEqual(expect.any(Number));
    expect((stored[0] as unknown as IdbHomeDashboard).definition).toEqual(dashboard.definition);
    await harness.reopen();
    expect(await harness.getAll('homeDashboards')).toEqual(stored);
    expect((await harness.getAll('homeOwners'))[0]['state']).toEqual(owner.state);
  });
});
