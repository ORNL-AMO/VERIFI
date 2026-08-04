import { firstValueFrom } from 'rxjs';
import { vi } from 'vitest';
import { IdbAccount } from '../models/idbModels/account';
import { dbConfig } from './_dbConfig';
import { AccountdbService } from './account-db.service';
import { ACCOUNT_DELETION_STORES, GLOBAL_PERSISTENCE_STORES } from './account-deletion.config';
import { DeleteDataService } from './delete-data.service';
import { IndexedDbCascadeDeleteService } from './indexed-db-cascade-delete.service';
import {
  IndexedDbTransactionContext,
  IndexedDbTransactionService
} from './indexed-db-transaction.service';
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
    vi.restoreAllMocks();
    await harness.destroy();
  });

  it('removes one complete account graph while preserving the other account and global data', async () => {
    const accountA = await markAccountAForDeletion();
    const deleteDataService = createDeleteDataService();

    await deleteDataService.setAccountToDelete([accountA]);

    await expectAccountBAndGlobalsOnly();
    await harness.reopen();
    await expectAccountBAndGlobalsOnly();
  });

  it('rolls back every participating store when a later store request fails', async () => {
    const accountA = await markAccountAForDeletion();
    const deleteDataService = createDeleteDataService();
    const originalDeleteAllByIndex = IndexedDbTransactionContext.prototype.deleteAllByIndex;
    vi.spyOn(IndexedDbTransactionContext.prototype, 'deleteAllByIndex')
      .mockImplementation(function (storeName, indexName, query) {
        if (storeName === 'utilityMeter') {
          return Promise.reject(new Error('Injected utility meter failure'));
        }
        return originalDeleteAllByIndex.call(this, storeName, indexName, query);
      });

    await deleteDataService.setAccountToDelete([accountA]);

    expect(deleteDataService.deletionError.getValue()).toMatchObject({
      accountGuid: accountA.guid,
      storeName: 'utilityMeter'
    });
    await expectBothAccountsRemain(accountA);
    await harness.reopen();
    await expectBothAccountsRemain(accountA);
  });

  async function markAccountAForDeletion(): Promise<IdbAccount> {
    const accountA = {
      ...accountAFixture.account,
      deleteAccount: true
    } as unknown as IdbAccount;
    await firstValueFrom(harness.dbService.update('accounts', accountA));
    return accountA;
  }

  function createDeleteDataService(): DeleteDataService {
    const accountDbService = new AccountdbService(
      harness.dbService,
      {
        retrieve: vi.fn(),
        store: vi.fn(),
        clear: vi.fn()
      } as any,
      { isElectron: false } as any
    );
    accountDbService.allAccounts.next([
      accountAFixture.account as unknown as IdbAccount,
      accountBFixture.account as unknown as IdbAccount
    ]);
    const transactionService = new IndexedDbTransactionService(indexedDB, {
      [harness.databaseName]: {
        ...dbConfig,
        name: harness.databaseName
      }
    });
    const cascadeDeleteService = new IndexedDbCascadeDeleteService(transactionService);
    return new DeleteDataService(accountDbService, cascadeDeleteService);
  }

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

  async function expectBothAccountsRemain(markedAccountA: IdbAccount): Promise<void> {
    expect(await harness.getAll('accounts')).toEqual([
      markedAccountA,
      accountBFixture.account
    ]);
    for (const { storeName } of ACCOUNT_DELETION_STORES) {
      expect(await harness.getAll(storeName)).toEqual(twoAccountPersistenceSeed[storeName]);
    }
    for (const storeName of GLOBAL_PERSISTENCE_STORES) {
      expect(await harness.getAll(storeName)).toEqual(globalPersistenceSeed[storeName]);
    }
  }
});
