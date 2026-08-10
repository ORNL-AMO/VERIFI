import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceSnapshot } from '../account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '../account-workspace/account-workspace.store';
import { BackupExportCoordinator } from '../backup/backup-export-coordinator.service';
import { BackupPreparationService } from '../backup/backup-preparation.service';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { ElectronBackupsDbService } from '../indexedDB/electron-backups-db.service';
import { AutomaticBackupsService } from './automatic-backups.service';
import { ElectronBackupFileGateway } from './electron-backup-file.gateway';

describe('AutomaticBackupsService', () => {
  let store: AccountWorkspaceStore;
  let service: AutomaticBackupsService;
  let gateway: {
    isAvailable: boolean;
    exists: ReturnType<typeof vi.fn>;
    read: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
  };
  let exportCoordinator: {
    buildActiveAccountBackup: ReturnType<typeof vi.fn>;
  };
  let electronBackupsDb: {
    getAll: ReturnType<typeof vi.fn>;
    addWithObservable: ReturnType<typeof vi.fn>;
    updateWithObservable: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    store = new AccountWorkspaceStore();
    gateway = {
      isAvailable: true,
      exists: vi.fn().mockResolvedValue(true),
      read: vi.fn().mockResolvedValue({ dataBackupId: 'registry-id', backupFileType: 'Account', origin: 'VERIFI', account: { guid: 'account-a' } }),
      write: vi.fn().mockResolvedValue(undefined)
    };
    exportCoordinator = {
      buildActiveAccountBackup: vi.fn(() => ({
        dataBackupId: 'written-backup-id',
        timeStamp: new Date('2026-08-07T12:00:00.000Z'),
        backupFileType: 'Account',
        origin: 'VERIFI',
        account: { guid: 'account-a', name: 'Account A' }
      }))
    };
    electronBackupsDb = {
      getAll: vi.fn(() => of([])),
      addWithObservable: vi.fn(backup => of({ ...backup, id: 1 })),
      updateWithObservable: vi.fn(backup => of(backup))
    };

    TestBed.configureTestingModule({
      providers: [
        AutomaticBackupsService,
        { provide: ElectronBackupFileGateway, useValue: gateway },
        { provide: BackupExportCoordinator, useValue: exportCoordinator },
        { provide: BackupPreparationService, useValue: { prepare: vi.fn(input => input) } },
        { provide: ToastNotificationsService, useValue: { showToast: vi.fn() } },
        { provide: ElectronBackupsDbService, useValue: electronBackupsDb },
        { provide: AccountWorkspaceStore, useValue: store }
      ]
    });
    service = TestBed.inject(AutomaticBackupsService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not save for hydration or selection-only changes', async () => {
    store.publish(snapshot('account-a', { dataBackupFilePath: undefined }));
    service.subscribeData();
    store.setSelections({});

    await vi.runAllTimersAsync();

    expect(gateway.write).not.toHaveBeenCalled();
    expect(service.status.value).toBe('disabled');
  });

  it('debounces committed revisions and saves the latest coherent snapshot once', async () => {
    store.publish(snapshot('account-a'));
    service.subscribeData();
    await flushAsync();

    store.publishCommitted(snapshot('account-a', { name: 'First' }), {});
    await flushAsync();
    await vi.advanceTimersByTimeAsync(2000);
    store.publishCommitted(snapshot('account-a', { name: 'Second' }), {});
    await flushAsync();
    await vi.advanceTimersByTimeAsync(2999);
    expect(gateway.write).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await flushAsync();

    expect(gateway.write).toHaveBeenCalledTimes(1);
    expect(exportCoordinator.buildActiveAccountBackup).toHaveBeenCalledTimes(1);
    expect(service.status.value).toBe('ready');
  });

  it('cancels pending work when an account switch starts and does not save the new hydration', async () => {
    store.publish(snapshot('account-a'));
    service.subscribeData();
    await flushAsync();

    store.publishCommitted(snapshot('account-a', { name: 'Changed' }), {});
    await flushAsync();
    store.beginLoad(true);
    store.publish(snapshot('account-b', { dataBackupFilePath: undefined }));
    await vi.runAllTimersAsync();
    await flushAsync();

    expect(gateway.write).not.toHaveBeenCalled();
    expect(service.account.guid).toBe('account-b');
    expect(service.status.value).toBe('disabled');
  });

  it('marks the session as conflict when the file backup id differs from the registry', async () => {
    service.accountBackups = [{
      id: 1,
      guid: 'electron-backup-a',
      accountId: 'account-a',
      dataBackupId: 'registry-id',
      createdDate: new Date('2026-08-07T09:00:00.000Z'),
      modifiedDate: new Date('2026-08-07T09:00:00.000Z'),
      timeStamp: new Date('2026-08-07T10:00:00.000Z')
    }];
    gateway.read.mockResolvedValue({
      dataBackupId: 'different-file-id',
      backupFileType: 'Account',
      origin: 'VERIFI',
      account: { guid: 'account-a', name: 'Account A' }
    });

    store.publish(snapshot('account-a'));
    service.subscribeData();
    await flushAsync();

    expect(service.status.value).toBe('conflict');
    expect(service.latestBackupFile.value?.dataBackupId).toBe('different-file-id');
  });

  it('keeps status ready when review is requested and registry matches file backup id', async () => {
    service.accountBackups = [{
      id: 1,
      guid: 'electron-backup-a',
      accountId: 'account-a',
      dataBackupId: 'registry-id',
      createdDate: new Date('2026-08-07T09:00:00.000Z'),
      modifiedDate: new Date('2026-08-07T09:00:00.000Z'),
      timeStamp: new Date('2026-08-07T10:00:00.000Z')
    }];
    gateway.read.mockResolvedValue({
      dataBackupId: 'registry-id',
      backupFileType: 'Account',
      origin: 'VERIFI',
      account: { guid: 'account-a', name: 'Account A' }
    });

    store.publish(snapshot('account-a'));
    service.subscribeData();
    await flushAsync();
    await service.requestReview();
    await flushAsync();

    expect(service.reviewRequested.value).toBe(true);
    expect(service.status.value).toBe('ready');
  });

  it('keeps status ready when an automatic write finishes during an active review request', async () => {
    service.accountBackups = [{
      id: 1,
      guid: 'electron-backup-a',
      accountId: 'account-a',
      dataBackupId: 'registry-id',
      createdDate: new Date('2026-08-07T09:00:00.000Z'),
      modifiedDate: new Date('2026-08-07T09:00:00.000Z'),
      timeStamp: new Date('2026-08-07T10:00:00.000Z')
    }];
    gateway.read.mockResolvedValue({
      dataBackupId: 'registry-id',
      backupFileType: 'Account',
      origin: 'VERIFI',
      account: { guid: 'account-a', name: 'Account A' }
    });

    store.publish(snapshot('account-a'));
    service.subscribeData();
    await flushAsync();
    await service.requestReview();
    await flushAsync();

    store.publishCommitted(snapshot('account-a', { name: 'Changed' }), {});
    await flushAsync();
    await vi.runAllTimersAsync();
    await flushAsync();

    expect(service.reviewRequested.value).toBe(true);
    expect(gateway.write).toHaveBeenCalledTimes(1);
    expect(service.status.value).toBe('ready');
  });

  it('overwriteFile skips backup build when account switches during exists check', async () => {
    store.publish(snapshot('account-a'));
    service.subscribeData();
    await flushAsync();
    gateway.exists.mockClear();
    gateway.write.mockClear();
    exportCoordinator.buildActiveAccountBackup.mockClear();
    electronBackupsDb.addWithObservable.mockClear();

    const existsPending = deferred<boolean>();
    gateway.exists.mockReturnValueOnce(existsPending.promise);
    const tokenBeforeSwitch = (service as any).accountSessionToken;

    const overwrite = service.overwriteFile();
    (service as any).handleAccountSwitch(
      snapshot('account-b', { dataBackupFilePath: undefined }).account
    );
    expect((service as any).accountSessionToken).toBeGreaterThan(tokenBeforeSwitch);
    existsPending.resolve(true);
    await overwrite;
    await flushAsync();

    expect(exportCoordinator.buildActiveAccountBackup).not.toHaveBeenCalled();
    expect(gateway.write).not.toHaveBeenCalled();
    expect(electronBackupsDb.addWithObservable).not.toHaveBeenCalled();
    expect(service.account.guid).toBe('account-b');
    expect(service.status.value).toBe('disabled');
  });

  it('overwriteFile suppresses state updates when account switches during write', async () => {
    store.publish(snapshot('account-a'));
    service.subscribeData();
    await flushAsync();
    gateway.exists.mockClear();
    gateway.write.mockClear();
    exportCoordinator.buildActiveAccountBackup.mockClear();
    electronBackupsDb.addWithObservable.mockClear();

    const writePending = deferred<void>();
    gateway.exists.mockResolvedValueOnce(true);
    gateway.write.mockReturnValueOnce(writePending.promise);
    const tokenBeforeSwitch = (service as any).accountSessionToken;

    const overwrite = service.overwriteFile();
    await flushAsync();

    expect(gateway.write).toHaveBeenCalledTimes(1);
    (service as any).handleAccountSwitch(
      snapshot('account-b', { dataBackupFilePath: undefined }).account
    );
    expect((service as any).accountSessionToken).toBeGreaterThan(tokenBeforeSwitch);
    writePending.resolve();
    await overwrite;
    await flushAsync();

    expect(electronBackupsDb.addWithObservable).not.toHaveBeenCalled();
    expect(service.latestBackupFile.value).toBeUndefined();
    expect(service.status.value).toBe('disabled');
  });

  it('does not let a stale save finally clear active write flags for the new account session', async () => {
    store.publish(snapshot('account-a'));
    service.subscribeData();
    await flushAsync();
    gateway.exists.mockClear();
    gateway.write.mockClear();

    const oldExists = deferred<boolean>();
    const newExists = deferred<boolean>();
    gateway.exists
      .mockReturnValueOnce(oldExists.promise)
      .mockReturnValueOnce(newExists.promise);

    const oldToken = (service as any).accountSessionToken;
    const staleSave = (service as any).saveCommittedRevision('account-a:1', oldToken);
    await flushAsync();
    expect((service as any).activeWrite).toBe(true);
    expect(service.saving.value).toBe(true);

    (service as any).handleAccountSwitch(
      snapshot('account-b', { dataBackupFilePath: undefined }).account
    );
    (service as any).account = snapshot('account-b').account;
    const newToken = (service as any).accountSessionToken;
    const currentSave = (service as any).saveCommittedRevision('account-b:1', newToken);
    await flushAsync();
    expect((service as any).activeWrite).toBe(true);
    expect(service.saving.value).toBe(true);

    oldExists.resolve(true);
    await staleSave;
    await flushAsync();

    expect((service as any).activeWrite).toBe(true);
    expect(service.saving.value).toBe(true);

    newExists.resolve(false);
    await currentSave;
    await flushAsync();

    expect((service as any).activeWrite).toBe(false);
    expect(service.saving.value).toBe(false);
  });
});

async function flushAsync(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function snapshot(
  accountGuid: string,
  overrides: Partial<{ name: string; dataBackupFilePath: string | undefined }> = {}
): AccountWorkspaceSnapshot {
  return {
    account: {
      id: accountGuid === 'account-a' ? 1 : 2,
      guid: accountGuid,
      name: overrides.name ?? 'Account',
      dataBackupFilePath: 'dataBackupFilePath' in overrides ? overrides.dataBackupFilePath : `/tmp/${accountGuid}.json`,
      archiveOption: 'skip'
    },
    facilities: [], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  } as unknown as AccountWorkspaceSnapshot;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
