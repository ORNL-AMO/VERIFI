import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { AccountWorkspaceSnapshot } from '../account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '../account-workspace/account-workspace.store';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { DbChangesService } from '../indexedDB/db-changes.service';
import { ElectronBackupsDbService } from '../indexedDB/electron-backups-db.service';
import { BackupDataService } from '../shared/helper-services/backup-data.service';
import { AutomaticBackupsService } from './automatic-backups.service';
import { ElectronService } from './electron.service';

describe('AutomaticBackupsService', () => {
  let store: AccountWorkspaceStore;
  let service: AutomaticBackupsService;
  let electron: {
    isElectron: boolean;
    fileExists: BehaviorSubject<boolean>;
    checkFileExists: ReturnType<typeof vi.fn>;
    getDataFile: ReturnType<typeof vi.fn>;
    sendSaveData: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    store = new AccountWorkspaceStore();
    electron = {
      isElectron: true,
      fileExists: new BehaviorSubject(false),
      checkFileExists: vi.fn(),
      getDataFile: vi.fn(),
      sendSaveData: vi.fn()
    };
    TestBed.configureTestingModule({
      providers: [
        AutomaticBackupsService,
        { provide: ElectronService, useValue: electron },
        {
          provide: BackupDataService,
          useValue: { getAccountBackupFile: vi.fn(() => ({ dataBackupId: 'backup-id' })) }
        },
        { provide: ToastNotificationsService, useValue: { showToast: vi.fn() } },
        { provide: DbChangesService, useValue: { updateAccount: vi.fn() } },
        { provide: ElectronBackupsDbService, useValue: { addOrUpdateFile: vi.fn() } },
        { provide: AccountWorkspaceStore, useValue: store }
      ]
    });
    service = TestBed.inject(AutomaticBackupsService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not save for hydration or selection-only changes', () => {
    store.publish(snapshot('account-a'));
    service.subscribeData();
    service.initializingAccount = false;
    store.setSelections({});
    flushEffects();
    vi.runAllTimers();

    expect(electron.sendSaveData).not.toHaveBeenCalled();
  });

  it('debounces committed revisions and saves the latest coherent snapshot once', () => {
    store.publish(snapshot('account-a'));
    service.subscribeData();
    service.initializingAccount = false;
    electron.fileExists.next(true);

    store.publishCommitted(snapshot('account-a', 'First'), {});
    flushEffects();
    vi.advanceTimersByTime(2000);
    store.publishCommitted(snapshot('account-a', 'Second'), {});
    flushEffects();
    vi.advanceTimersByTime(3499);
    expect(electron.sendSaveData).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(electron.sendSaveData).toHaveBeenCalledTimes(1);
  });

  it('cancels pending work when an account switch starts and does not save the new hydration', () => {
    store.publish(snapshot('account-a'));
    service.subscribeData();
    service.initializingAccount = false;
    electron.fileExists.next(true);
    store.publishCommitted(snapshot('account-a', 'Changed'), {});
    flushEffects();

    store.beginLoad(true);
    flushEffects();
    store.publish(snapshot('account-b'));
    flushEffects();
    vi.runAllTimers();

    expect(electron.sendSaveData).not.toHaveBeenCalled();
    expect(service.account.guid).toBe('account-b');
  });
});

function flushEffects(): void {
  (TestBed as any).tick();
}

function snapshot(accountGuid: string, accountName = 'Account'): AccountWorkspaceSnapshot {
  return {
    account: {
      id: accountGuid === 'account-a' ? 1 : 2,
      guid: accountGuid,
      name: accountName,
      dataBackupFilePath: `/tmp/${accountGuid}.json`
    },
    facilities: [], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  } as unknown as AccountWorkspaceSnapshot;
}
