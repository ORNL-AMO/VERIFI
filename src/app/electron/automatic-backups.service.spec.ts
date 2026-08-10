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

    TestBed.configureTestingModule({
      providers: [
        AutomaticBackupsService,
        { provide: ElectronBackupFileGateway, useValue: gateway },
        { provide: BackupExportCoordinator, useValue: exportCoordinator },
        { provide: BackupPreparationService, useValue: { prepare: vi.fn(input => input) } },
        { provide: ToastNotificationsService, useValue: { showToast: vi.fn() } },
        {
          provide: ElectronBackupsDbService,
          useValue: {
            getAll: vi.fn(() => of([])),
            addWithObservable: vi.fn(backup => of({ ...backup, id: 1 })),
            updateWithObservable: vi.fn(backup => of(backup))
          }
        },
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
