import { vi } from 'vitest';
import { IdbAccount } from '../models/idbModels/account';
import { IdbAnalysisItem } from '../models/idbModels/analysisItem';
import { IdbFacility } from '../models/idbModels/facility';
import { IdbUtilityMeter } from '../models/idbModels/utilityMeter';
import { AccountAnalysisDbService } from './account-analysis-db.service';
import { AccountdbService } from './account-db.service';
import { AccountReportDbService } from './account-report-db.service';
import { AnalysisDbService } from './analysis-db.service';
import { CustomEmissionsDbService } from './custom-emissions-db.service';
import { CustomFuelDbService } from './custom-fuel-db.service';
import { CustomGWPDbService } from './custom-gwp-db.service';
import { DbChangesService } from './db-changes.service';
import { FacilitydbService } from './facility-db.service';
import { FacilityEnergyUseEquipmentDbService } from './facility-energy-use-equipment-db.service';
import { FacilityEnergyUseGroupsDbService } from './facility-energy-use-groups-db.service';
import { FacilityReportsDbService } from './facility-reports-db.service';
import { PredictorDataDbService } from './predictor-data-db.service';
import { PredictorDbService } from './predictor-db.service';
import { PredictordbServiceDeprecated } from './predictors-deprecated-db.service';
import { accountAFixture, accountBFixture, twoAccountPersistenceSeed } from './testing/indexed-db-test-fixtures';
import { IndexedDbTestHarness } from './testing/indexed-db-test-harness';
import { UtilityMeterdbService } from './utilityMeter-db.service';
import { UtilityMeterDatadbService } from './utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from './utilityMeterGroup-db.service';
import { IndexedDbAccessService } from './indexed-db-access.service';

describe('DbChangesService account switching in Chromium', () => {
  let harness: IndexedDbTestHarness;

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('account-switching');
    await harness.seed(twoAccountPersistenceSeed);
  });

  afterEach(async () => {
    await harness.destroy();
  });

  it('clears a previous account facility and every facility-scoped collection', async () => {
    const storedValues = new Map<string, unknown>([
      ['accountId', accountAFixture.account.id],
      ['facilityId', accountAFixture.facility.id]
    ]);
    const localStorageService = {
      retrieve: vi.fn((key: string) => storedValues.get(key)),
      store: vi.fn((key: string, value: unknown) => storedValues.set(key, value)),
      clear: vi.fn((key: string) => storedValues.delete(key))
    };
    const loadingService = {};
    const indexedDbAccess = new IndexedDbAccessService(harness.dbService);
    const accountDbService = new AccountdbService(
      harness.dbService,
      localStorageService as any,
      { isElectron: false } as any,
      indexedDbAccess
    );
    const facilityDbService = new FacilitydbService(
      harness.dbService,
      localStorageService as any,
      loadingService as any,
      indexedDbAccess
    );
    const predictorDbService = new PredictorDbService(
      harness.dbService,
      loadingService as any,
      indexedDbAccess
    );
    const predictorDataDbService = new PredictorDataDbService(
      harness.dbService,
      loadingService as any,
      indexedDbAccess
    );
    const predictorsDbServiceDeprecated = new PredictordbServiceDeprecated(
      harness.dbService,
      loadingService as any,
      indexedDbAccess
    );
    const utilityMeterDbService = new UtilityMeterdbService(
      harness.dbService,
      loadingService as any,
      indexedDbAccess
    );
    const utilityMeterDataDbService = new UtilityMeterDatadbService(
      harness.dbService,
      loadingService as any,
      indexedDbAccess
    );
    const utilityMeterGroupDbService = new UtilityMeterGroupdbService(
      harness.dbService,
      loadingService as any,
      indexedDbAccess
    );
    const accountAnalysisDbService = new AccountAnalysisDbService(
      harness.dbService,
      localStorageService as any,
      loadingService as any,
      indexedDbAccess
    );
    const analysisDbService = new AnalysisDbService(
      harness.dbService,
      localStorageService as any,
      facilityDbService,
      accountDbService,
      predictorDbService,
      loadingService as any,
      indexedDbAccess
    );
    const accountReportDbService = new AccountReportDbService(
      harness.dbService,
      localStorageService as any,
      loadingService as any,
      indexedDbAccess
    );
    const facilityReportsDbService = new FacilityReportsDbService(
      harness.dbService,
      localStorageService as any,
      loadingService as any,
      indexedDbAccess
    );
    const customEmissionsDbService = new CustomEmissionsDbService(
      harness.dbService,
      loadingService as any,
      indexedDbAccess
    );
    const customFuelDbService = new CustomFuelDbService(
      harness.dbService,
      loadingService as any,
      indexedDbAccess
    );
    const customGWPDbService = new CustomGWPDbService(
      harness.dbService,
      loadingService as any,
      indexedDbAccess
    );
    const facilityEnergyUseGroupsDbService = new FacilityEnergyUseGroupsDbService(
      harness.dbService,
      loadingService as any,
      indexedDbAccess
    );
    const facilityEnergyUseEquipmentDbService = new FacilityEnergyUseEquipmentDbService(
      harness.dbService,
      loadingService as any,
      indexedDbAccess
    );
    const analysisSelectionRepair = {
      repairAccount: (account: IdbAccount) => ({ account, isChanged: false }),
      repairFacility: (facility: IdbFacility) => ({ facility, isChanged: false })
    };
    const dbChangesService = new DbChangesService(
      accountDbService,
      facilityDbService,
      accountAnalysisDbService,
      analysisDbService,
      predictorsDbServiceDeprecated,
      utilityMeterDbService,
      utilityMeterDataDbService,
      utilityMeterGroupDbService,
      analysisSelectionRepair as any,
      customEmissionsDbService,
      loadingService as any,
      {} as any,
      accountReportDbService,
      customFuelDbService,
      customGWPDbService,
      predictorDbService,
      predictorDataDbService,
      facilityReportsDbService,
      facilityEnergyUseGroupsDbService,
      facilityEnergyUseEquipmentDbService,
      {} as any,
      { reloadActiveWorkspace: vi.fn().mockResolvedValue('published') } as any,
      { account: vi.fn(() => undefined) } as any
    );

    await dbChangesService.selectAccount(accountAFixture.account as unknown as IdbAccount, true);
    expect(facilityDbService.selectedFacility.getValue()?.guid).toBe(accountAFixture.facility.guid);
    expect(utilityMeterDbService.facilityMeters.getValue()).toEqual([accountAFixture.meter]);
    utilityMeterDbService.selectedMeter.next(accountAFixture.meter as unknown as IdbUtilityMeter);
    analysisDbService.selectedAnalysisItem.next(accountAFixture.facilityAnalysis as unknown as IdbAnalysisItem);
    facilityReportsDbService.selectedReport.next(accountAFixture.facilityReport as any);
    analysisDbService.setGeneratedModelsForGroup('account-a-group', [{} as any]);

    await dbChangesService.selectAccount(accountBFixture.account as unknown as IdbAccount, true);

    expect(accountDbService.selectedAccount.getValue()?.guid).toBe(accountBFixture.account.guid);
    expect(facilityDbService.accountFacilities.getValue()).toEqual([accountBFixture.facility]);
    expect(facilityDbService.selectedFacility.getValue()).toBeUndefined();
    expect(predictorsDbServiceDeprecated.facilityPredictorEntries.getValue()).toEqual([]);
    expect(predictorsDbServiceDeprecated.facilityPredictors.getValue()).toEqual([]);
    expect(predictorDbService.facilityPredictors.getValue()).toEqual([]);
    expect(predictorDataDbService.facilityPredictorData.getValue()).toEqual([]);
    expect(utilityMeterDbService.facilityMeters.getValue()).toEqual([]);
    expect(utilityMeterDbService.selectedMeter.getValue()).toBeUndefined();
    expect(utilityMeterDataDbService.facilityMeterData.getValue()).toEqual([]);
    expect(utilityMeterGroupDbService.facilityMeterGroups.getValue()).toEqual([]);
    expect(analysisDbService.facilityAnalysisItems.getValue()).toEqual([]);
    expect(analysisDbService.selectedAnalysisItem.getValue()).toBeUndefined();
    expect(analysisDbService.generatedModelsPerGroup.getValue()).toEqual({});
    expect(facilityReportsDbService.facilityReports.getValue()).toEqual([]);
    expect(facilityReportsDbService.selectedReport.getValue()).toBeUndefined();
    expect(facilityEnergyUseGroupsDbService.facilityEnergyUseGroups.getValue()).toEqual([]);
    expect(facilityEnergyUseEquipmentDbService.facilityEnergyUseEquipment.getValue()).toEqual([]);
    expect(storedValues.has('facilityId')).toBe(false);

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
});
