import { firstValueFrom } from 'rxjs';
import { accountAFixture, accountBFixture, twoAccountPersistenceSeed } from '../indexedDB/testing/indexed-db-test-fixtures';
import { IndexedDbTestHarness } from '../indexedDB/testing/indexed-db-test-harness';
import { IndexedDbAccessService } from '../indexedDB/indexed-db-access.service';
import { AccountWorkspaceLoaderService } from './account-workspace-loader.service';

describe('Account workspace loading in Chromium', () => {
  let harness: IndexedDbTestHarness;

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('account-workspace');
    await harness.seed(twoAccountPersistenceSeed);
  });

  afterEach(async () => {
    await harness.destroy();
  });

  it('loads a complete account snapshot without cross-account records', async () => {
    const access = new IndexedDbAccessService(harness.dbService);
    const byAccount = (store: any) => ({
      load: (accountGuid: string) => access.getAllByIndex(store, 'accountId', accountGuid)
    });
    const loader = new AccountWorkspaceLoaderService(
      { getStoredByGuid: (guid: string) => access.getByGuid('accounts', guid) } as any,
      { getAllAccountFacilities: byAccount('facilities').load } as any,
      { getAllAccountMeters: byAccount('utilityMeter').load } as any,
      { getAllAccountMeterData: byAccount('utilityMeterData').load } as any,
      { getAllAccountMeterGroups: byAccount('utilityMeterGroups').load } as any,
      { getAllAccountPredictors: byAccount('predictor').load } as any,
      { getAllAccountPredictorData: byAccount('predictorData').load } as any,
      { getAllAccountAnalysisItems: byAccount('analysisItems').load } as any,
      { getAllAccountAnalysisItems: byAccount('accountAnalysisItems').load } as any,
      { getAllAccountReports: byAccount('accountReports').load } as any,
      { getAllFacilityReportsByAccountId: byAccount('facilityReports').load } as any,
      { getAllAccountCustomEmissions: byAccount('customEmissionsItems').load } as any,
      { getAllAccountCustomFuels: byAccount('customFuels').load } as any,
      { getAllAccountCustomGWP: byAccount('customGWP').load } as any,
      { getAllAccountEnergyUseGroups: byAccount('facilityEnergyUseGroups').load } as any,
      { getAllAccountEnergyUseEquipment: byAccount('facilityEnergyUseEquipment').load } as any
    );

    const snapshot = await loader.load(accountAFixture.account.guid as string);

    expect(snapshot.account.guid).toBe(accountAFixture.account.guid);
    expect(snapshot.facilities).toEqual([accountAFixture.facility]);
    expect(snapshot.meters).toEqual([accountAFixture.meter]);
    expect(snapshot.meterData).toEqual([accountAFixture.meterData]);
    expect(snapshot.predictors).toEqual([accountAFixture.predictor]);
    expect(snapshot.predictorData).toEqual([accountAFixture.predictorData]);
    expect(Object.values(snapshot).flat().some((record: any) => record?.accountId === accountBFixture.account.guid)).toBe(false);

    await harness.reopen();
    expect(await firstValueFrom(harness.dbService.count('accounts'))).toBe(2);
  });
});
