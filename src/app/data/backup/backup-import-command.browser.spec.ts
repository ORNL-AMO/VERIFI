import { vi } from 'vitest';
import { CURRENT_DATA_VERSION } from '@data/indexedDB/data-migrations/data-migration.models';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { IndexedDbTransactionContext, IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { VerifiStoreName } from '@data/indexedDB/indexed-db-schema';
import { IndexedDbTestHarness } from '@data/indexedDB/testing/indexed-db-test-harness';
import { BackupImportCommandService } from './backup-import-command.service';
import { PreparedBackupFile } from './backup-preparation.service';
import { IdbAnalysisItem } from '@data/models/idbModels/analysisItem';
import { IdbAccountAnalysisItem } from '@data/models/idbModels/accountAnalysisItem';

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

  it('remaps account-backup warning dismissals with imported entity GUIDs', async () => {
    const service = createService();
    const restoredAccount = await service.importAccountBackupFile(createAccountBackup(), 0);
    const storedMeters = await harness.getAll<any>('utilityMeter');
    const storedAccount = (await harness.getAll<any>('accounts'))[0];

    expect(storedMeters).toHaveLength(1);
    expect(storedAccount.statusWarningDismissals).toEqual([expect.objectContaining({
      findingId: `meter.currency.stale:meter:${storedMeters[0].guid}`
    })]);
    expect(restoredAccount.statusWarningDismissals).toEqual(storedAccount.statusWarningDismissals);

    await harness.reopen();
    expect((await harness.getAll<any>('accounts'))[0].statusWarningDismissals)
      .toEqual(storedAccount.statusWarningDismissals);
  });

  it('clears shared review receipts when importing remapped account and facility analyses', async () => {
    const backup = createAccountBackup();
    const review = { checksVersion: 1, reportYear: 2023, inputFingerprint: 'old-inputs', reviewedAt: '2026-01-01T00:00:00Z' };
    backup.facilityAnalysisItems = [{ guid: 'reviewed-facility-analysis', accountId: backup.account.guid, facilityId: backup.facilities[0].guid,
      groups: [], dataCheckReviews: [review] } as IdbAnalysisItem];
    backup.accountAnalysisItems = [{ guid: 'reviewed-account-analysis', accountId: backup.account.guid,
      facilityAnalysisItems: [{ facilityId: backup.facilities[0].guid, analysisItemId: 'reviewed-facility-analysis' }], dataCheckReviews: [review] } as IdbAccountAnalysisItem];
    await createService().importAccountBackupFile(backup, 0);
    await harness.reopen();
    const facility = (await harness.getAll('analysisItems'))[0];
    const account = (await harness.getAll('accountAnalysisItems'))[0];
    expect(facility['dataCheckReviews']).toBeUndefined(); expect(account['dataCheckReviews']).toBeUndefined();
    expect(account['facilityAnalysisItems']).toEqual([{ facilityId: facility['facilityId'], analysisItemId: facility.guid }]);
  });

  it('ignores malformed warning dismissals instead of aborting account restore', async () => {
    const service = createService();
    const backup = createAccountBackup();
    const valid = backup.account.statusWarningDismissals![0];
    (backup.account as any).statusWarningDismissals = [
      null,
      {},
      { ...valid, findingId: false },
      { ...valid, evidenceSignature: null },
      { ...valid, discardedAt: 42 },
      valid
    ];

    const restoredAccount = await service.importAccountBackupFile(backup, 0);
    const storedAccount = (await harness.getAll<any>('accounts'))[0];
    const storedMeter = (await harness.getAll<any>('utilityMeter'))[0];

    expect(restoredAccount.statusWarningDismissals).toEqual([{
      ...valid,
      findingId: `meter.currency.stale:meter:${storedMeter.guid}`
    }]);
    expect(storedAccount.statusWarningDismissals).toEqual(restoredAccount.statusWarningDismissals);
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
      deleteAccount: false,
      statusWarningDismissals: [{
        findingId: 'meter.currency.stale:meter:import-meter-guid',
        evidenceSignature: 'signature-a',
        discardedAt: '2026-09-18T12:00:00.000Z'
      }]
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
