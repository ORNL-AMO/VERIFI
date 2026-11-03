import { BrowserBackupDownloadService } from '@data/backup/browser-backup-download.service';
import { dbConfig } from '@data/indexedDB/_dbConfig';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { IndexedDbTestHarness, IndexedDbTestSeed } from '@data/indexedDB/testing/indexed-db-test-harness';
import { ElectronBackupFileGateway } from '@platform/electron/electron-backup-file.gateway';
import { MigrationRecoveryService, RECOVERY_STORE_NAMES } from './migration-recovery.service';

describe('migration recovery export in Chromium', () => {
  let harness: IndexedDbTestHarness;
  let service: MigrationRecoveryService;
  let browserDownloads: { downloadBlob: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    harness = await IndexedDbTestHarness.create('migration-recovery');
    browserDownloads = { downloadBlob: vi.fn() };
    service = new MigrationRecoveryService(
      new IndexedDbTransactionService(indexedDB, {
        [harness.databaseName]: { ...dbConfig, name: harness.databaseName }
      }),
      browserDownloads as unknown as BrowserBackupDownloadService,
      { isAvailable: false } as ElectronBackupFileGateway
    );
  });

  afterEach(async () => harness.destroy());

  it('captures every migration store without changing the database or data version', async () => {
    const seed = Object.fromEntries(RECOVERY_STORE_NAMES.map((storeName, index) => [
      storeName,
      [{ id: index + 1, guid: `${storeName}-record`, marker: storeName }]
    ])) as IndexedDbTestSeed;
    seed.application = [{ id: 1, guid: 'application', dataVersion: 0, marker: 'application' }];
    seed.accounts = [{
      id: 1,
      guid: 'account',
      name: 'Legacy',
      createdDate: new Date('2025-01-01T00:00:00.000Z'),
      dataBackupFilePath: '/private/account.json'
    }];
    seed.customFuels = [{ id: 1, guid: 'fuel', accountId: 'account', CO2: NaN }];
    await harness.seed(seed);
    const before = Object.fromEntries(await Promise.all(
      RECOVERY_STORE_NAMES.map(async storeName => [storeName, await harness.getAll(storeName)] as const)
    ));

    const snapshot = await service.createSnapshot({
      step: 'migrations',
      message: 'Migration failed.',
      retryable: true,
      cause: new Error('bad record')
    });

    expect(Object.keys(snapshot.stores).sort()).toEqual([...RECOVERY_STORE_NAMES].sort());
    expect(snapshot.recordCounts).toEqual(Object.fromEntries(RECOVERY_STORE_NAMES.map(storeName => [storeName, 1])));
    expect(snapshot.database.storedDataVersion).toBe(0);
    const exportedFuel = (snapshot.stores.customFuels as Array<Record<string, unknown>>)[0];
    expect(Number.isNaN(exportedFuel.CO2 as number)).toBe(true);
    const exportedAccount = (snapshot.stores.accounts as Array<Record<string, unknown>>)[0];
    expect(exportedAccount.createdDate).toEqual(new Date('2025-01-01T00:00:00.000Z'));
    expect(exportedAccount.dataBackupFilePath).toBe('/private/account.json');

    for (const storeName of RECOVERY_STORE_NAMES) {
      expect(await harness.getAll(storeName)).toEqual(before[storeName]);
    }
    expect((await harness.getAll('application'))[0].dataVersion).toBe(0);
  });

  it('downloads ordinary JSON through the browser', async () => {
    const result = await service.exportSnapshot({
      step: 'migrations', message: 'Migration failed.', retryable: true
    });
    if (result.status !== 'saved') { throw new Error('Expected the browser recovery export to be saved.'); }
    const blob = browserDownloads.downloadBlob.mock.calls[0][0] as Blob;
    const downloadedSnapshot = JSON.parse(await blob.text());

    expect(downloadedSnapshot).toMatchObject({
      format: 'VERIFI IndexedDB Recovery',
      snapshotId: result.snapshot.snapshotId,
      recordCounts: result.snapshot.recordCounts
    });
  });
});
