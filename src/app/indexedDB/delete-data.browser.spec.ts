import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { IdbAccount } from '../models/idbModels/account';
import { AccountdbService } from './account-db.service';
import { ACCOUNT_DELETION_STORES, GLOBAL_PERSISTENCE_STORES } from './account-deletion.config';
import { DeleteDataService } from './delete-data.service';
import {
  accountAFixture,
  accountBFixture,
  globalPersistenceSeed,
  twoAccountPersistenceSeed
} from './testing/indexed-db-test-fixtures';
import { IndexedDbTestHarness } from './testing/indexed-db-test-harness';

describe('account deletion in Chromium', () => {
  let harness: IndexedDbTestHarness;

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('account-deletion');
    await harness.seed(twoAccountPersistenceSeed);
  });

  afterEach(async () => {
    await harness.destroy();
  });

  it('removes one complete account graph while preserving the other account and global data', async () => {
    const accountA = {
      ...accountAFixture.account,
      deleteAccount: true
    } as unknown as IdbAccount;
    await firstValueFrom(harness.dbService.update('accounts', accountA));

    const accountDbService = new AccountdbService(
      harness.dbService,
      {
        retrieve: vi.fn(),
        store: vi.fn(),
        clear: vi.fn()
      } as any,
      { isElectron: false } as any
    );
    const deleteDataService = new DeleteDataService(accountDbService, harness.dbService);

    await deleteDataService.setAccountToDelete([accountA]);

    await expectAccountBAndGlobalsOnly();
    await harness.reopen();
    await expectAccountBAndGlobalsOnly();
  });

  async function expectAccountBAndGlobalsOnly(): Promise<void> {
    expect(await harness.getAll('accounts')).toEqual([accountBFixture.account]);

    for (const { storeName } of ACCOUNT_DELETION_STORES) {
      const records = await harness.getAll(storeName);
      expect(records).toEqual(accountBFixture.seed[storeName]);
      expect(records.some(record => record.accountId === accountAFixture.account.guid)).toBe(false);
    }

    for (const storeName of GLOBAL_PERSISTENCE_STORES) {
      expect(await harness.getAll(storeName)).toEqual(globalPersistenceSeed[storeName]);
    }
  }
});
