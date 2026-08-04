import { firstValueFrom } from 'rxjs';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { dbConfig } from './_dbConfig';
import { AnalysisDbService } from './analysis-db.service';
import { accountAFixture, accountBFixture, twoAccountPersistenceSeed } from './testing/indexed-db-test-fixtures';
import { IndexedDbTestHarness } from './testing/indexed-db-test-harness';

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
