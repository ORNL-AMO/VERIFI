import { firstValueFrom } from 'rxjs';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { dbConfig } from './_dbConfig';
import { AnalysisDbService } from './analysis-db.service';
import { accountAFixture, accountBFixture, twoAccountPersistenceSeed } from './testing/indexed-db-test-fixtures';
import { IndexedDbTestHarness } from './testing/indexed-db-test-harness';
import { REQUIRED_INDEXES, VERIFI_DB_VERSION, VERIFI_STORE_NAMES } from './indexed-db-schema';
import { IndexedDbAccessService } from './indexed-db-access.service';
import { IdbAccount } from '../models/idbModels/account';
import { UtilityMeterDatadbService } from './utilityMeterData-db.service';
import { PredictorDataDbService } from './predictor-data-db.service';

describe('IndexedDB in Chromium', () => {
  let harness: IndexedDbTestHarness;
  let analysisDbService: AnalysisDbService;

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('indexed-db');
    analysisDbService = new AnalysisDbService(
      harness.dbService,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
  });

  afterEach(async () => {
    await harness.destroy();
  });

  it('initializes every configured object store in an empty database', async () => {
    const expectedStoreNames = dbConfig.objectStoresMeta
      .map(storeMeta => storeMeta.store)
      .sort();
    const objectStoreNames = (await firstValueFrom(
      harness.dbService.getAllObjectStoreNames()
    )).sort();

    expect(objectStoreNames).toEqual(expectedStoreNames);
    for (const storeName of expectedStoreNames) {
      expect(await harness.getAll(storeName)).toEqual([]);
    }
  });

  it('creates every required non-unique index in a fresh database', async () => {
    const schema = await harness.getSchema();

    expect(await firstValueFrom(harness.dbService.getDatabaseVersion())).toBe(VERIFI_DB_VERSION);
    for (const storeName of VERIFI_STORE_NAMES) {
      for (const requiredIndex of REQUIRED_INDEXES[storeName]) {
        expect(schema[storeName][requiredIndex.name]).toEqual({
          keyPath: requiredIndex.keypath,
          unique: false
        });
      }
    }
  });

  it('upgrades version 19 records without changing values or GUID relationships', async () => {
    await harness.destroy();
    const duplicateGuidAccount = {
      id: 3,
      guid: accountAFixture.account.guid,
      name: 'Duplicate GUID account',
      unknownLegacyField: 'preserve me'
    };
    harness = await IndexedDbTestHarness.createUpgradedFromVersion19(
      'version-19-upgrade',
      {
        ...twoAccountPersistenceSeed,
        accounts: [
          ...twoAccountPersistenceSeed.accounts,
          duplicateGuidAccount
        ]
      }
    );

    expect(await firstValueFrom(harness.dbService.getDatabaseVersion())).toBe(VERIFI_DB_VERSION);
    expect(await harness.getAll('accounts')).toEqual([
      accountAFixture.account,
      accountBFixture.account,
      duplicateGuidAccount
    ]);
    for (const [storeName, expectedRecords] of Object.entries(twoAccountPersistenceSeed)) {
      if (storeName !== 'accounts') {
        expect(await harness.getAll(storeName)).toEqual(expectedRecords);
      }
    }

    const schema = await harness.getSchema();
    expect(schema.utilityMeter.location).toEqual({ keyPath: 'location', unique: false });
    expect(schema.accounts.guid).toEqual({ keyPath: 'guid', unique: false });
  });

  it('produces the same required schema for fresh and upgraded databases', async () => {
    const freshSchema = await harness.getSchema();
    await harness.destroy();
    harness = await IndexedDbTestHarness.createUpgradedFromVersion19(
      'schema-parity',
      twoAccountPersistenceSeed
    );
    const upgradedSchema = await harness.getSchema();

    expect(upgradedSchema).toEqual(freshSchema);
  });

  it('reopens a representative two-account database without changing keys or GUID relationships', async () => {
    await harness.seed(twoAccountPersistenceSeed);
    await harness.reopen();

    expect(await harness.getAll('accounts')).toEqual([
      accountAFixture.account,
      accountBFixture.account
    ]);

    for (const [storeName, expectedRecords] of Object.entries(twoAccountPersistenceSeed)) {
      expect(await harness.getAll(storeName)).toEqual(expectedRecords);
    }

    const accountBMeterData = (await harness.getAll('utilityMeterData'))
      .find(record => record.accountId === accountBFixture.account.guid);
    const accountBPredictorData = (await harness.getAll('predictorData'))
      .find(record => record.accountId === accountBFixture.account.guid);
    const accountBEquipment = (await harness.getAll('facilityEnergyUseEquipment'))
      .find(record => record.accountId === accountBFixture.account.guid);

    expect(accountBMeterData).toMatchObject({
      facilityId: accountBFixture.facility.guid,
      meterId: accountBFixture.meter.guid
    });
    expect(accountBPredictorData).toMatchObject({
      facilityId: accountBFixture.facility.guid,
      predictorId: accountBFixture.predictor.guid
    });
    expect(accountBEquipment).toMatchObject({
      facilityId: accountBFixture.facility.guid,
      energyUseGroupId: accountBFixture.energyUseGroup.guid
    });
  });

  it('isolates indexed account queries and deterministically resolves duplicate GUIDs', async () => {
    await harness.seed(twoAccountPersistenceSeed);
    await firstValueFrom(harness.dbService.add('accounts', {
      id: 3,
      guid: accountAFixture.account.guid,
      name: 'Later duplicate GUID'
    }));
    const indexedDbAccess = new IndexedDbAccessService(harness.dbService);

    await expect(indexedDbAccess.getAllByIndex(
      'facilities',
      'accountId',
      accountAFixture.account.guid as string
    )).resolves.toEqual([accountAFixture.facility]);
    await expect(indexedDbAccess.getByGuid<IdbAccount>(
      'accounts',
      accountAFixture.account.guid as string
    )).resolves.toEqual(accountAFixture.account);

    await indexedDbAccess.deleteAllByIndex(
      'facilityReports',
      'facilityId',
      accountAFixture.facility.guid as string
    );
    expect(await harness.getAll('facilityReports')).toEqual([accountBFixture.facilityReport]);
  });

  it('isolates indexed meter and predictor data relationships', async () => {
    await harness.seed(twoAccountPersistenceSeed);
    await firstValueFrom(harness.dbService.add('utilityMeterData', {
      id: 102,
      guid: 'other-meter-data-a',
      accountId: accountAFixture.account.guid,
      facilityId: accountAFixture.facility.guid,
      meterId: 'other-meter-a'
    }));
    await firstValueFrom(harness.dbService.add('predictorData', {
      id: 102,
      guid: 'other-predictor-data-a',
      accountId: accountAFixture.account.guid,
      facilityId: accountAFixture.facility.guid,
      predictorId: 'other-predictor-a'
    }));
    const loadingService = { setLoadingMessage: () => undefined };
    const meterDataService = new UtilityMeterDatadbService(
      harness.dbService,
      loadingService as any
    );
    const predictorDataService = new PredictorDataDbService(
      harness.dbService,
      loadingService as any
    );

    await expect(meterDataService.getStoredMeterData(accountAFixture.meter.guid as string))
      .resolves.toEqual([accountAFixture.meterData]);
    await expect(predictorDataService.getStoredPredictorData(accountAFixture.predictor.guid as string))
      .resolves.toEqual([accountAFixture.predictorData]);

    await meterDataService.deleteAllFacilityMeterData(accountAFixture.facility.guid as string);
    await predictorDataService.deleteAllFacilityPredictorData(accountAFixture.facility.guid as string);
    expect(await harness.getAll('utilityMeterData')).toEqual([accountBFixture.meterData]);
    expect(await harness.getAll('predictorData')).toEqual([accountBFixture.predictorData]);
  });

  it('round-trips an analysis item without persisting transient fields', async () => {
    const analysisItem = {
      guid: 'analysis-guid',
      accountId: 'account-guid',
      facilityId: 'facility-guid',
      calculatedReportYear: 2024
    } as unknown as IdbAnalysisItem;

    const addedItem = await firstValueFrom(
      analysisDbService.addWithObservable(analysisItem)
    );
    const persistedItem = await firstValueFrom(
      analysisDbService.getById(addedItem.id)
    ) as IdbAnalysisItem & { calculatedReportYear?: number };

    expect(persistedItem).toMatchObject({
      id: addedItem.id,
      guid: analysisItem.guid,
      accountId: analysisItem.accountId,
      facilityId: analysisItem.facilityId
    });
    expect(persistedItem.calculatedReportYear).toBeUndefined();
    expect((analysisItem as IdbAnalysisItem & { calculatedReportYear?: number }).calculatedReportYear).toBe(2024);
  });
});
