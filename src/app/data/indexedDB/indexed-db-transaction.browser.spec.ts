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

  it('rejects indexed deletion from a read-only transaction with the native error', async () => {
    await expect(transactionService.runTransaction(
      ['facilities'],
      'readonly',
      transaction => transaction.deleteAllByIndex(
        'facilities',
        'accountId',
        accountAFixture.account.guid as string
      )
    )).rejects.toMatchObject({ name: 'ReadOnlyError' });

    expect(await harness.getAll('facilities')).toEqual([
      accountAFixture.facility,
      accountBFixture.facility
    ]);
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

  it('commits a grid-factor rename with its account and facility references in one transaction', async () => {
    const renamedSubregion = 'Renamed Custom Region';
    const updatedGridFactor = {
      ...accountAFixture.customEmissions,
      subregion: renamedSubregion
    };
    const updatedAccount = {
      ...accountAFixture.account,
      eGridSubregion: renamedSubregion
    };
    const updatedFacility = {
      ...accountAFixture.facility,
      eGridSubregion: renamedSubregion
    };

    await transactionService.runTransaction(
      ['customEmissionsItems', 'accounts', 'facilities'],
      'readwrite',
      async transaction => {
        await transaction.put('customEmissionsItems', updatedGridFactor);
        await transaction.put('accounts', updatedAccount);
        await transaction.put('facilities', updatedFacility);
      }
    );

    await harness.reopen();
    expect(await harness.getAll('customEmissionsItems')).toContainEqual(updatedGridFactor);
    expect(await harness.getAll('accounts')).toContainEqual(updatedAccount);
    expect(await harness.getAll('facilities')).toContainEqual(updatedFacility);
  });

  it('commits weather station membership, readings, and analysis references together', async () => {
    const newPredictor = {
      guid: 'weather-new', accountId: accountAFixture.account.guid,
      facilityId: accountAFixture.facility.guid, predictorType: 'Weather', weatherStationId: 'station-a'
    };
    const newReading = {
      guid: 'weather-reading-new', accountId: accountAFixture.account.guid,
      facilityId: accountAFixture.facility.guid, predictorId: 'weather-new', year: 2026, month: 1, amount: 10
    };
    const updatedAnalysis = { ...accountAFixture.facilityAnalysis, name: 'Weather membership updated' };

    await transactionService.runTransaction(
      ['predictor', 'predictorData', 'analysisItems'],
      'readwrite',
      async transaction => {
        await transaction.deleteByKey('predictorData', accountAFixture.predictorData.id as number);
        await transaction.deleteByKey('predictor', accountAFixture.predictor.id as number);
        await transaction.add('predictor', newPredictor);
        await transaction.add('predictorData', newReading);
        await transaction.put('analysisItems', updatedAnalysis);
      }
    );

    await harness.reopen();
    expect(await harness.getAll('predictor')).toContainEqual(expect.objectContaining({ guid: 'weather-new' }));
    expect(await harness.getAll('predictor')).not.toContainEqual(expect.objectContaining({ guid: accountAFixture.predictor.guid }));
    expect(await harness.getAll('predictorData')).toContainEqual(expect.objectContaining({ predictorId: 'weather-new' }));
    expect(await harness.getAll('analysisItems')).toContainEqual(updatedAnalysis);
  });

  it('rolls back a weather station membership change when a later write fails', async () => {
    await expect(transactionService.runTransaction(
      ['predictor', 'predictorData', 'analysisItems'],
      'readwrite',
      async transaction => {
        await transaction.deleteByKey('predictorData', accountAFixture.predictorData.id as number);
        await transaction.deleteByKey('predictor', accountAFixture.predictor.id as number);
        await transaction.put('analysisItems', { ...accountAFixture.facilityAnalysis, name: 'Must roll back' });
        await transaction.add('predictor', accountBFixture.predictor);
      }
    )).rejects.toBeDefined();

    await harness.reopen();
    expect(await harness.getAll('predictor')).toContainEqual(accountAFixture.predictor);
    expect(await harness.getAll('predictorData')).toContainEqual(accountAFixture.predictorData);
    expect(await harness.getAll('analysisItems')).toContainEqual(accountAFixture.facilityAnalysis);
  });

  it('commits or rolls back every output in a weather station month together', async () => {
    const first = {
      ...accountAFixture.predictorData, id: undefined, guid: 'station-month-hdd',
      predictorId: 'weather-hdd', year: 2026, month: 4, amount: 12
    };
    const second = {
      ...accountAFixture.predictorData, id: undefined, guid: 'station-month-humidity',
      predictorId: 'weather-humidity', year: 2026, month: 4, amount: 55
    };
    await transactionService.runTransaction(['predictorData'], 'readwrite', async transaction => {
      await transaction.add('predictorData', first);
      await transaction.add('predictorData', second);
    });
    const committed = (await harness.getAll('predictorData')).filter((item: any) => item.year === 2026 && item.month === 4);
    expect(committed).toHaveLength(2);

    await expect(transactionService.runTransaction(['predictorData'], 'readwrite', async transaction => {
      await transaction.put('predictorData', { ...committed[0], amount: 99 });
      await transaction.deleteByKey('predictorData', committed[1].id as number);
      await transaction.add('predictorData', { ...first, id: committed[0].id });
    })).rejects.toBeDefined();

    await harness.reopen();
    const afterRollback = (await harness.getAll('predictorData')).filter((item: any) => item.year === 2026 && item.month === 4);
    expect(afterRollback).toEqual(committed);
  });

  it('rolls back all grid-factor rename records when a later write fails', async () => {
    const updatedGridFactor = { ...accountAFixture.customEmissions, subregion: 'Must Roll Back' };
    const updatedAccount = { ...accountAFixture.account, eGridSubregion: 'Must Roll Back' };
    const updatedFacility = { ...accountAFixture.facility, eGridSubregion: 'Must Roll Back' };

    await expect(transactionService.runTransaction(
      ['customEmissionsItems', 'accounts', 'facilities'],
      'readwrite',
      async transaction => {
        await transaction.put('customEmissionsItems', updatedGridFactor);
        await transaction.put('accounts', updatedAccount);
        await transaction.put('facilities', updatedFacility);
        await transaction.add('facilities', accountBFixture.facility);
      }
    )).rejects.toBeDefined();

    await harness.reopen();
    expect(await harness.getAll('customEmissionsItems')).toContainEqual(accountAFixture.customEmissions);
    expect(await harness.getAll('accounts')).toContainEqual(accountAFixture.account);
    expect(await harness.getAll('facilities')).toContainEqual(accountAFixture.facility);
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
