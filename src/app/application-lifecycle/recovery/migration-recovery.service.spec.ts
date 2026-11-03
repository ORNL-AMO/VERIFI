import { BrowserBackupDownloadService } from '@data/backup/browser-backup-download.service';
import { IndexedDbTransactionService } from '@data/indexedDB/indexed-db-transaction.service';
import { ElectronBackupFileGateway } from '@platform/electron/electron-backup-file.gateway';
import { MigrationRecoveryService, RECOVERY_STORE_NAMES } from './migration-recovery.service';

describe('MigrationRecoveryService', () => {
  function setup(options?: { electron?: boolean }) {
    const sourceAccount = {
      id: 1,
      guid: 'account',
      name: 'Legacy',
      createdDate: new Date('2026-01-01T00:00:00.000Z'),
      dataBackupFilePath: '/Users/person/private.json',
      dataBackupId: 'machine-backup',
      lastBackup: new Date('2026-02-01T00:00:00.000Z')
    };
    const records: Record<string, unknown[]> = Object.fromEntries(
      RECOVERY_STORE_NAMES.map(store => [store, []])
    );
    records.application = [{ id: 1, guid: 'application', dataVersion: 0 }];
    records.accounts = [sourceAccount];
    records.customFuels = [{ id: 1, guid: 'fuel', CO2: NaN }];
    const transaction = {
      getAll: vi.fn(async (storeName: string) => records[storeName])
    };
    const transactions = {
      runTransaction: vi.fn(async (_stores, _mode, operation) => operation(transaction))
    } as unknown as IndexedDbTransactionService;
    const browserDownloads = { downloadBlob: vi.fn() } as unknown as BrowserBackupDownloadService;
    const electronFiles = {
      isAvailable: Boolean(options?.electron),
      chooseSavePath: vi.fn(async () => '/tmp/recovery.json'),
      writeJson: vi.fn(async () => undefined)
    } as unknown as ElectronBackupFileGateway;
    const service = new MigrationRecoveryService(transactions, browserDownloads, electronFiles);
    return { service, transactions, transaction, browserDownloads, electronFiles, sourceAccount };
  }

  const startupError = {
    step: 'migrations' as const,
    message: 'VERIFI could not update the stored data safely.',
    retryable: true,
    cause: new Error('bad legacy record')
  };

  it('reads the complete migration dataset in one readonly transaction without changing source records', async () => {
    const { service, transactions, transaction, sourceAccount } = setup();

    const snapshot = await service.createSnapshot(startupError);
    const accounts = snapshot.stores.accounts as Array<Record<string, unknown>>;
    const fuel = (snapshot.stores.customFuels as Array<Record<string, unknown>>)[0];

    expect(transactions.runTransaction).toHaveBeenCalledWith(RECOVERY_STORE_NAMES, 'readonly', expect.any(Function));
    expect(transaction.getAll).toHaveBeenCalledTimes(RECOVERY_STORE_NAMES.length);
    expect(Object.keys(snapshot.recordCounts).sort()).toEqual([...RECOVERY_STORE_NAMES].sort());
    expect(accounts[0]).toMatchObject({
      dataBackupFilePath: '/Users/person/private.json',
      dataBackupId: 'machine-backup'
    });
    expect(accounts[0].lastBackup).toEqual(new Date('2026-02-01T00:00:00.000Z'));
    expect(Number.isNaN(fuel.CO2 as number)).toBe(true);
    expect(sourceAccount.dataBackupFilePath).toBe('/Users/person/private.json');
    expect(snapshot.error).toMatchObject({ causeName: 'Error', causeMessage: 'bad legacy record' });
  });

  it('downloads the browser snapshot as ordinary JSON', async () => {
    const { service, browserDownloads } = setup();
    const result = await service.exportSnapshot(startupError);
    expect(result).toMatchObject({ status: 'saved' });
    expect(browserDownloads.downloadBlob).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^VERIFI-recovery-/));
    if (result.status !== 'saved') { throw new Error('Expected a saved snapshot.'); }
    expect(result.snapshot.stores.accounts).toEqual(expect.any(Array));
  });

  it('writes the Electron snapshot to the selected path', async () => {
    const { service, electronFiles, browserDownloads } = setup({ electron: true });

    const result = await service.exportSnapshot(startupError);

    expect(result).toMatchObject({ status: 'saved', filePath: '/tmp/recovery.json' });
    expect(electronFiles.writeJson).toHaveBeenCalledWith('/tmp/recovery.json', expect.any(Object));
    expect(browserDownloads.downloadBlob).not.toHaveBeenCalled();
  });

  it('treats a cancelled Electron save as non-destructive cancellation', async () => {
    const { service, electronFiles } = setup({ electron: true });
    vi.mocked(electronFiles.chooseSavePath).mockResolvedValue(undefined);

    await expect(service.exportSnapshot(startupError)).resolves.toEqual({ status: 'cancelled' });
    expect(electronFiles.writeJson).not.toHaveBeenCalled();
  });
});
