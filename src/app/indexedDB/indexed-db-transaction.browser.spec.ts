import { firstValueFrom } from 'rxjs';
import { dbConfig } from './_dbConfig';
import { IndexedDbTransactionService } from './indexed-db-transaction.service';
import { accountAFixture, accountBFixture, twoAccountPersistenceSeed } from './testing/indexed-db-test-fixtures';
import { IndexedDbTestHarness } from './testing/indexed-db-test-harness';

describe('native multi-store IndexedDB transactions in Chromium', () => {
  let harness: IndexedDbTestHarness;
  let transactionService: IndexedDbTransactionService;

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('native-transactions');
    await harness.seed(twoAccountPersistenceSeed);
    transactionService = new IndexedDbTransactionService(indexedDB, {
      [harness.databaseName]: {
        ...dbConfig,
        name: harness.databaseName
      }
    });
  });

  afterEach(async () => {
    await harness.destroy();
  });

  it('supports read-only access across declared stores', async () => {
    const result = await transactionService.runTransaction(
      ['accounts', 'facilities'],
      'readonly',
      async transaction => {
        return {
          account: await transaction.get('accounts', accountAFixture.account.id as number),
          facilities: await transaction.getAllByIndex(
            'facilities',
            'accountId',
            accountAFixture.account.guid as string
          )
        };
      }
    );

    expect(result).toEqual({
      account: accountAFixture.account,
      facilities: [accountAFixture.facility]
    });
  });

  it('commits writes to every participating store before resolving', async () => {
    const updatedAccount = { ...accountAFixture.account, name: 'Updated Account A' };

    await transactionService.runTransaction(
      ['accounts', 'facilities'],
      'readwrite',
      async transaction => {
        await transaction.put('accounts', updatedAccount);
        await transaction.deleteByKey('facilities', accountAFixture.facility.id as number);
      }
    );

    expect(await harness.getAll('accounts')).toEqual([updatedAccount, accountBFixture.account]);
    expect(await harness.getAll('facilities')).toEqual([accountBFixture.facility]);
    await harness.reopen();
    expect(await harness.getAll('accounts')).toEqual([updatedAccount, accountBFixture.account]);
    expect(await harness.getAll('facilities')).toEqual([accountBFixture.facility]);
  });

  it('rolls back earlier writes when a later request fails', async () => {
    const updatedAccount = { ...accountAFixture.account, name: 'Must Roll Back' };

    await expect(transactionService.runTransaction(
      ['accounts', 'facilities'],
      'readwrite',
      async transaction => {
        await transaction.put('accounts', updatedAccount);
        await transaction.add('facilities', accountBFixture.facility);
      }
    )).rejects.toBeDefined();

    await harness.reopen();
    expect(await harness.getAll('accounts')).toEqual([
      accountAFixture.account,
      accountBFixture.account
    ]);
    expect(await harness.getAll('facilities')).toEqual([
      accountAFixture.facility,
      accountBFixture.facility
    ]);
  });

  it('aborts when an operation accesses an undeclared store', async () => {
    await expect(transactionService.runTransaction(
      ['accounts'],
      'readwrite',
      async transaction => {
        await transaction.put('accounts', { ...accountAFixture.account, name: 'Must Roll Back' });
        await transaction.getAll('facilities');
      }
    )).rejects.toThrow('is not part of the active transaction');

    expect(await firstValueFrom(harness.dbService.getByKey('accounts', 1)))
      .toEqual(accountAFixture.account);
  });
});
