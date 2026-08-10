import { vi } from 'vitest';
import { CURRENT_DATA_VERSION } from '../indexedDB/data-migrations/data-migration.models';
import { dbConfig } from '../indexedDB/_dbConfig';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '../indexedDB/indexed-db-transaction.service';
import { VerifiStoreName } from '../indexedDB/indexed-db-schema';
import { IndexedDbTestHarness } from '../indexedDB/testing/indexed-db-test-harness';
import { BackupImportCommandService } from './backup-import-command.service';
import { PreparedBackupFile } from './backup-preparation.service';

describe('BackupImportCommandService restore transactions in Chromium', () => {
  let harness: IndexedDbTestHarness;

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('backup-import-command');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await harness.destroy();
  });

  it('rolls back account restore when a later store write fails', async () => {
    const service = createService();
    const backup = createAccountBackup();
    const originalAdd = IndexedDbTransactionContext.prototype.add;
    vi.spyOn(IndexedDbTransactionContext.prototype, 'add')
      .mockImplementation(function (storeName: VerifiStoreName, value: unknown) {
        if (storeName === 'utilityMeter') {
          return Promise.reject(new Error('Injected account restore failure'));
        }
        return originalAdd.call(this, storeName, value);
      });

    await expect(service.importAccountBackupFile(backup, 0))
      .rejects.toThrow('Injected account restore failure');

    expect(await harness.getAll('accounts')).toEqual([]);
    expect(await harness.getAll('facilities')).toEqual([]);
    expect(await harness.getAll('utilityMeterGroups')).toEqual([]);
    expect(await harness.getAll('utilityMeter')).toEqual([]);

    await harness.reopen();
    expect(await harness.getAll('accounts')).toEqual([]);
    expect(await harness.getAll('facilities')).toEqual([]);
    expect(await harness.getAll('utilityMeterGroups')).toEqual([]);
    expect(await harness.getAll('utilityMeter')).toEqual([]);
  });

  it('rolls back facility restore when a later store write fails', async () => {
    await harness.seed({
      accounts: [{ id: 1, guid: 'existing-account', name: 'Existing Account', deleteAccount: false }]
    });
    const service = createService();
    const backup = createFacilityBackup('existing-account');
    const originalAdd = IndexedDbTransactionContext.prototype.add;
    vi.spyOn(IndexedDbTransactionContext.prototype, 'add')
      .mockImplementation(function (storeName: VerifiStoreName, value: unknown) {
        if (storeName === 'utilityMeter') {
          return Promise.reject(new Error('Injected facility restore failure'));
        }
        return originalAdd.call(this, storeName, value);
      });

    await expect(service.importFacilityBackupFile(backup, 'existing-account', 0))
      .rejects.toThrow('Injected facility restore failure');

    expect(await harness.getAll('accounts')).toEqual([
      { id: 1, guid: 'existing-account', name: 'Existing Account', deleteAccount: false }
    ]);
    expect(await harness.getAll('facilities')).toEqual([]);
    expect(await harness.getAll('utilityMeterGroups')).toEqual([]);
    expect(await harness.getAll('utilityMeter')).toEqual([]);

    await harness.reopen();
    expect(await harness.getAll('accounts')).toEqual([
      { id: 1, guid: 'existing-account', name: 'Existing Account', deleteAccount: false }
    ]);
    expect(await harness.getAll('facilities')).toEqual([]);
    expect(await harness.getAll('utilityMeterGroups')).toEqual([]);
    expect(await harness.getAll('utilityMeter')).toEqual([]);
  });

  function createService(): BackupImportCommandService {
    const transactionService = new IndexedDbTransactionService(indexedDB, {
      [harness.databaseName]: {
        ...dbConfig,
        name: harness.databaseName
      }
    });
    return new BackupImportCommandService(transactionService, {
      setCurrentLoadingIndex: vi.fn(),
      setLoadingMessage: vi.fn()
    } as any);
  }
});

function createAccountBackup(): PreparedBackupFile {
  return {
    dataVersion: CURRENT_DATA_VERSION,
    origin: 'VERIFI',
    backupFileType: 'Account',
    timeStamp: new Date(),
    dataBackupId: 'backup-account',
    account: {
      guid: 'import-account-guid',
      name: 'Imported Account',
      deleteAccount: false
    },
    facility: undefined,
    facilities: [{
      guid: 'import-facility-guid',
      accountId: 'import-account-guid',
      name: 'Imported Facility'
    }],
    groups: [{
      guid: 'import-group-guid',
      accountId: 'import-account-guid',
      facilityId: 'import-facility-guid',
      name: 'Imported Group'
    }],
    meters: [{
      guid: 'import-meter-guid',
      accountId: 'import-account-guid',
      facilityId: 'import-facility-guid',
      groupId: 'import-group-guid',
      name: 'Imported Meter'
    }],
    meterData: [],
    accountReports: [],
    accountAnalysisItems: [],
    facilityAnalysisItems: [],
    predictorData: [],
    predictorDataV2: [],
    predictors: [],
    customEmissionsItems: [],
    customFuels: [],
    customGWPs: [],
    facilityReports: [],
    facilityEnergyUseGroups: [],
    facilityEnergyUseEquipment: []
  } as unknown as PreparedBackupFile;
}

function createFacilityBackup(accountGuid: string): PreparedBackupFile {
  return {
    dataVersion: CURRENT_DATA_VERSION,
    origin: 'VERIFI',
    backupFileType: 'Facility',
    timeStamp: new Date(),
    dataBackupId: 'backup-facility',
    account: undefined,
    facility: {
      guid: 'import-facility-guid',
      accountId: accountGuid,
      name: 'Imported Facility'
    },
    facilities: [],
    groups: [{
      guid: 'import-group-guid',
      accountId: accountGuid,
      facilityId: 'import-facility-guid',
      name: 'Imported Group'
    }],
    meters: [{
      guid: 'import-meter-guid',
      accountId: accountGuid,
      facilityId: 'import-facility-guid',
      groupId: 'import-group-guid',
      name: 'Imported Meter'
    }],
    meterData: [],
    accountReports: [],
    accountAnalysisItems: [],
    facilityAnalysisItems: [],
    predictorData: [],
    predictorDataV2: [],
    predictors: [],
    customEmissionsItems: [],
    customFuels: [],
    customGWPs: [],
    facilityReports: [],
    facilityEnergyUseGroups: [],
    facilityEnergyUseEquipment: []
  } as unknown as PreparedBackupFile;
}
