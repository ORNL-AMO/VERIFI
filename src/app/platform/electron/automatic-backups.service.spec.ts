import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { BackupExportCoordinator } from '@data/backup/backup-export-coordinator.service';
import { BackupPreparationService } from '@data/backup/backup-preparation.service';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { ElectronBackupsDbService } from '@data/indexedDB/electron-backups-db.service';
import { AutomaticBackupsService } from './automatic-backups.service';
import { ElectronBackupFileGateway } from './electron-backup-file.gateway';
import { UpdateInstallService } from './update-install.service';
import { ElectronUpdateState } from './electron-update.models';

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
    buildActiveAccountBackup: ReturnType<typeof vi.fn<BackupExportCoordinator['buildActiveAccountBackup']>>;
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
      } as ReturnType<BackupExportCoordinator['buildActiveAccountBackup']>))
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

  function installer() {
    const electron = { isElectron: true, updateState: new BehaviorSubject<ElectronUpdateState>({ status: 'downloaded' }), installUpdate: vi.fn() };
    const install = new UpdateInstallService(
      { url: '/welcome' } as any,
      { whenIdle: vi.fn().mockResolvedValue(undefined) } as any,
      service,
      electron as any,
      { setLoadingMessage: vi.fn(), setLoadingStatus: vi.fn() } as any,
      { initialize: vi.fn().mockResolvedValue({ status: 'ready' }) } as any
    );
    return { install, electron };
  }

  it('waits for an automatic archive started during inspection before requesting installation', async () => {
    service.accountBackups = [{ accountId: 'account-a', dataBackupId: 'registry-id' } as any];
    const archive = deferred<void>();
    gateway.write.mockReturnValueOnce(archive.promise);
    const subscription = service.latestBackupFile.subscribe(value => {
      if (value && service.status.value === 'checking') void service.writeArchive('/tmp/archive.json', exportCoordinator.buildActiveAccountBackup()).catch(() => undefined);
    });
    store.publish(snapshot('account-a'));
    service.subscribeData();
    const { install, electron } = installer();
    const completed = install.install();
    await vi.advanceTimersByTimeAsync(0);
    expect(gateway.write).toHaveBeenCalledOnce();
    expect(electron.installUpdate).not.toHaveBeenCalled();
    archive.resolve();
    await expect(completed).resolves.toBe(true);
    expect(electron.installUpdate).toHaveBeenCalledOnce();
    subscription.unsubscribe();
  });

  it('retains archive failures after other backup work is ready and blocks installation until a successful retry', async () => {
    service.accountBackups = [{ accountId: 'account-a', dataBackupId: 'registry-id' } as any];
    const archive = deferred<void>();
    gateway.write.mockReturnValueOnce(archive.promise);
    const subscription = service.latestBackupFile.subscribe(value => {
      if (value && service.status.value === 'checking') void service.writeArchive('/tmp/archive.json', exportCoordinator.buildActiveAccountBackup()).catch(() => undefined);
    });
    store.publish(snapshot('account-a'));
    service.subscribeData();
    const { install, electron } = installer();
    const completed = expect(install.install()).rejects.toThrow('archive offline');
    await vi.advanceTimersByTimeAsync(0);
    archive.reject(new Error('archive offline'));
    await completed;
    expect(service.status.value).toBe('ready');
    await expect(install.install()).rejects.toThrow('archive could not be saved');
    expect(electron.installUpdate).not.toHaveBeenCalled();
    await service.writeArchive('/tmp/archive-retry.json', exportCoordinator.buildActiveAccountBackup());
    await expect(install.install()).resolves.toBe(true);
    expect(electron.installUpdate).toHaveBeenCalledOnce();
    subscription.unsubscribe();
  });

  it('serializes archive writes that can share a temporary file path', async () => {
    store.publish(snapshot('account-a', { dataBackupFilePath: undefined }));
    service.subscribeData();
    const firstWrite = deferred<void>();
    gateway.write.mockReturnValueOnce(firstWrite.promise);
    const first = service.writeArchive('/tmp/archive.json', exportCoordinator.buildActiveAccountBackup());
    const second = service.writeArchive('/tmp/archive.json', exportCoordinator.buildActiveAccountBackup());
    await flushAsync();
    expect(gateway.write).toHaveBeenCalledTimes(1);
    firstWrite.resolve();
    await Promise.all([first, second]);
    expect(gateway.write).toHaveBeenCalledTimes(2);
  });

  it('retains an archive failure across account switches and an empty workspace until its owner retries', async () => {
    store.publish(snapshot('account-a', { dataBackupFilePath: undefined }));
    service.subscribeData();
    gateway.write.mockRejectedValueOnce(new Error('archive offline'));
    await expect(service.writeArchive('/tmp/archive.json', exportCoordinator.buildActiveAccountBackup())).rejects.toThrow('archive offline');
    await expect(service.flushPending()).rejects.toThrow('archive could not be saved');
    store.publish(snapshot('account-b', { dataBackupFilePath: undefined }));
    await expect(service.flushPending()).rejects.toThrow('archive could not be saved');
    store.publish(snapshot('account-a', { dataBackupFilePath: undefined }));
    await expect(service.flushPending()).rejects.toThrow('archive could not be saved');
    store.clear();
    await expect(service.flushPending()).rejects.toThrow('archive could not be saved');
    expect(service.status.value).toBe('disabled');
    await service.writeArchive('/tmp/archive-retry.json', exportCoordinator.buildActiveAccountBackup());
    await expect(service.flushPending()).resolves.toBeUndefined();
  });

  it('retains a late archive failure for its captured owner after switching accounts', async () => {
    store.publish(snapshot('account-a', { dataBackupFilePath: undefined }));
    service.subscribeData();
    const archive = deferred<void>();
    gateway.write.mockReturnValueOnce(archive.promise);
    const completed = expect(service.writeArchive('/tmp/archive.json', exportCoordinator.buildActiveAccountBackup())).rejects.toThrow('late archive failure');
    store.publish(snapshot('account-b', { dataBackupFilePath: undefined }));
    const blocked = expect(service.flushPending()).rejects.toThrow('late archive failure');
    archive.reject(new Error('late archive failure'));
    await Promise.all([completed, blocked]);
    await service.writeArchive('/tmp/b.json', { ...exportCoordinator.buildActiveAccountBackup(), account: { guid: 'account-b' } } as any);
    await expect(service.flushPending()).rejects.toThrow('archive could not be saved');
    await service.writeArchive('/tmp/a.json', exportCoordinator.buildActiveAccountBackup());
    await expect(service.flushPending()).resolves.toBeUndefined();
  });

  it('flushes a debounced committed revision before restart without waiting for its timer', async () => {
    store.publish(snapshot('account-a'));
    service.accountBackups = [{ accountId: 'account-a', dataBackupId: 'registry-id' } as any];
    service.subscribeData();
    await flushAsync();
    store.publishCommitted(snapshot('account-a', { name: 'Changed' }), {});
    await service.flushPending();
    expect(gateway.write).toHaveBeenCalledTimes(1);
    expect(service.status.value).toBe('ready');
    await vi.runAllTimersAsync();
    expect(gateway.write).toHaveBeenCalledTimes(1);
  });

  it('blocks restart on backup conflicts and write failures', async () => {
    store.publish(snapshot('account-a'));
    service.subscribeData();
    await service.flushPending().then(() => { throw new Error('Expected a conflict'); }, error => {
      expect(error.message).toContain('backup issue');
    });
    service.accountBackups = [{ accountId: 'account-a', dataBackupId: 'registry-id' } as any];
    await service.requestReview();
    store.publishCommitted(snapshot('account-a', { name: 'Changed' }), {});
    gateway.write.mockRejectedValue(new Error('disk full'));
    await expect(service.flushPending()).rejects.toThrow('backup issue');
    expect(service.status.value).toBe('error');
  });

  it('waits for a running write and its newer queued revision before restarting', async () => {
    store.publish(snapshot('account-a'));
    service.accountBackups = [{ accountId: 'account-a', dataBackupId: 'registry-id' } as any];
    service.subscribeData();
    await flushAsync();
    const write = deferred<void>();
    gateway.write.mockReturnValueOnce(write.promise);
    store.publishCommitted(snapshot('account-a', { name: 'First' }), {});
    await vi.advanceTimersByTimeAsync(3000);
    store.publishCommitted(snapshot('account-a', { name: 'Second' }), {});
    const complete = vi.fn();
    const flush = service.flushPending().then(complete);
    await flushAsync();
    expect(complete).not.toHaveBeenCalled();
    write.resolve();
    await flush;
    expect(gateway.write).toHaveBeenCalledTimes(2);
    expect(service.status.value).toBe('ready');
  });

  it('does not overwrite an unresolved conflicting file when flushing a newer committed revision', async () => {
    store.publish(snapshot('account-a'));
    service.subscribeData();
    await service.inspectCurrentAccountFile();
    expect(service.status.value).toBe('conflict');

    store.publishCommitted(snapshot('account-a', { name: 'Changed' }), {});
    await expect(service.flushPending()).rejects.toThrow('backup issue');
    await vi.runAllTimersAsync();
    expect(gateway.write).not.toHaveBeenCalled();
    expect(service.status.value).toBe('conflict');
  });

  it('waits for file validation before flushing a committed revision', async () => {
    service.accountBackups = [{ accountId: 'account-a', dataBackupId: 'registry-id' } as any];
    const inspection = deferred<unknown>();
    gateway.read.mockReturnValueOnce(inspection.promise);
    store.publish(snapshot('account-a'));
    service.subscribeData();
    await flushAsync();
    store.publishCommitted(snapshot('account-a', { name: 'Changed' }), {});
    const flush = service.flushPending();
    await vi.advanceTimersByTimeAsync(4000);
    expect(gateway.write).not.toHaveBeenCalled();
    inspection.resolve({ dataBackupId: 'registry-id', backupFileType: 'Account', origin: 'VERIFI', account: { guid: 'account-a' } });
    await flush;
    expect(gateway.write).toHaveBeenCalledOnce();
    expect(service.status.value).toBe('ready');
  });

  it('keeps newer queued edits blocked after a write fails and resumes after explicit successful review', async () => {
    service.accountBackups = [{ accountId: 'account-a', dataBackupId: 'registry-id' } as any];
    store.publish(snapshot('account-a'));
    service.subscribeData();
    await service.inspectCurrentAccountFile();
    const write = deferred<void>();
    gateway.write.mockReturnValueOnce(write.promise);
    store.publishCommitted(snapshot('account-a', { name: 'First' }), {});
    await vi.advanceTimersByTimeAsync(3000);
    store.publishCommitted(snapshot('account-a', { name: 'Second' }), {});
    await flushAsync();
    write.reject(new Error('disk full'));
    await vi.runAllTimersAsync();
    expect(service.status.value).toBe('error');
    expect(gateway.write).toHaveBeenCalledTimes(1);
    await expect(service.flushPending()).rejects.toThrow('backup issue');

    await service.requestReview();
    await service.flushPending();
    expect(gateway.write).toHaveBeenCalledTimes(2);
    expect(service.status.value).toBe('ready');
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
    service.accountBackups = [{ accountId: 'account-a', dataBackupId: 'registry-id' } as any];
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
    service.accountBackups = [{ accountId: 'account-a', dataBackupId: 'registry-id' } as any];
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
    service.status.next('ready');
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
