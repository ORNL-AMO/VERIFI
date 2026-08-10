import { CommonModule } from '@angular/common';
import { NgModule, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { vi } from 'vitest';
import { PreparedBackupFile } from 'src/app/backup/backup-preparation.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { AccountCommandHandler } from 'src/app/account-workspace/handlers/account-command-handler.service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { BackupExportCoordinator } from 'src/app/backup/backup-export-coordinator.service';
import { BackupImportCoordinator } from 'src/app/backup/backup-import-coordinator.service';
import { LoadingService } from '../loading/loading.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { ElectronBackupFileComponent } from './electron-backup-file.component';
import { AutomaticBackupsService } from 'src/app/electron/automatic-backups.service';
import { ElectronBackupFileGateway } from 'src/app/electron/electron-backup-file.gateway';
import { ElectronService } from 'src/app/electron/electron.service';
import { DeleteDataService } from 'src/app/indexedDB/delete-data.service';

@NgModule({
  declarations: [ElectronBackupFileComponent],
  imports: [CommonModule, FormsModule],
  exports: [ElectronBackupFileComponent]
})
class ElectronBackupFileTestModule { }

describe('ElectronBackupFileComponent', () => {
  let fixture: ComponentFixture<ElectronBackupFileComponent>;
  let component: ElectronBackupFileComponent;
  let electronService: { isElectron: boolean };
  let backupImportCoordinator: { replaceActiveAccount: ReturnType<typeof vi.fn> };
  let commandBoundary: { execute: ReturnType<typeof vi.fn> };
  let accountHandler: { update: ReturnType<typeof vi.fn> };
  let loadingService: {
    setContext: ReturnType<typeof vi.fn>;
    setTitle: ReturnType<typeof vi.fn>;
    isLoadingComplete: { next: ReturnType<typeof vi.fn> };
  };
  let deleteDataService: {
    suspendQueuedDeletion: ReturnType<typeof vi.fn>;
    resumeQueuedDeletion: ReturnType<typeof vi.fn>;
  };
  let automaticBackupsService: {
    latestBackupFile: BehaviorSubject<PreparedBackupFile | undefined>;
    status: BehaviorSubject<'disabled' | 'checking' | 'ready' | 'pending' | 'saving' | 'conflict' | 'error'>;
    reviewRequested: BehaviorSubject<boolean>;
    accountBackups: Array<{ accountId: string }>;
    clearReviewRequest: ReturnType<typeof vi.fn>;
    addOrUpdateFile: ReturnType<typeof vi.fn>;
    inspectCurrentAccountFile: ReturnType<typeof vi.fn>;
    overwriteFile: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    electronService = { isElectron: false };
    backupImportCoordinator = {
      replaceActiveAccount: vi.fn().mockResolvedValue({ guid: 'replacement-account-guid' })
    };
    commandBoundary = {
      execute: vi.fn(async (_context, operation: () => Promise<unknown>) => operation())
    };
    accountHandler = {
      update: vi.fn().mockResolvedValue(undefined)
    };
    loadingService = {
      setContext: vi.fn(),
      setTitle: vi.fn(),
      isLoadingComplete: { next: vi.fn() }
    };
    deleteDataService = {
      suspendQueuedDeletion: vi.fn(),
      resumeQueuedDeletion: vi.fn().mockResolvedValue(undefined)
    };
    automaticBackupsService = {
      latestBackupFile: new BehaviorSubject<PreparedBackupFile | undefined>(undefined),
      status: new BehaviorSubject<'disabled' | 'checking' | 'ready' | 'pending' | 'saving' | 'conflict' | 'error'>('disabled'),
      reviewRequested: new BehaviorSubject<boolean>(false),
      accountBackups: [{ accountId: 'account-a' }],
      clearReviewRequest: vi.fn(() => automaticBackupsService.reviewRequested.next(false)),
      addOrUpdateFile: vi.fn().mockResolvedValue(undefined),
      inspectCurrentAccountFile: vi.fn().mockResolvedValue(undefined),
      overwriteFile: vi.fn().mockResolvedValue(undefined)
    };
    TestBed.configureTestingModule({
      imports: [ElectronBackupFileTestModule],
      providers: [
        {
          provide: AccountWorkspaceStore,
          useValue: {
            account: signal({
              guid: 'account-a',
              archiveOption: 'always'
            })
          }
        },
        { provide: ElectronService, useValue: electronService },
        { provide: AutomaticBackupsService, useValue: automaticBackupsService },
        { provide: ToastNotificationsService, useValue: { showToast: vi.fn() } },
        { provide: BackupExportCoordinator, useValue: { buildActiveAccountBackup: vi.fn() } },
        { provide: BackupImportCoordinator, useValue: backupImportCoordinator },
        { provide: LoadingService, useValue: loadingService },
        { provide: DeleteDataService, useValue: deleteDataService },
        { provide: WorkspaceCommandBoundary, useValue: commandBoundary },
        { provide: AccountCommandHandler, useValue: accountHandler },
        { provide: ElectronBackupFileGateway, useValue: { write: vi.fn() } }
      ]
    });

    fixture = TestBed.createComponent(ElectronBackupFileComponent);
    component = fixture.componentInstance;
    vi.spyOn((component as any).cd, 'detectChanges').mockImplementation(() => undefined);
  });

  it('creates an archive on external file load when archive option is always', () => {
    electronService.isElectron = true;
    const createArchiveSpy = vi.spyOn(component, 'createArchive').mockResolvedValue();
    component.ngOnInit();
    component.archiveOption = 'always';

    automaticBackupsService.status.next('checking');
    automaticBackupsService.latestBackupFile.next(buildPreparedBackupFile());

    expect(createArchiveSpy).toHaveBeenCalledTimes(1);
  });

  it('does not create an archive for automatic-save latest-backup emissions', () => {
    electronService.isElectron = true;
    const createArchiveSpy = vi.spyOn(component, 'createArchive').mockResolvedValue();
    component.ngOnInit();

    automaticBackupsService.status.next('saving');
    automaticBackupsService.latestBackupFile.next(buildPreparedBackupFile());

    expect(createArchiveSpy).not.toHaveBeenCalled();
  });

  it('keeps the archive prompt dismissed after automatic saves update the latest backup file', () => {
    electronService.isElectron = true;
    component.ngOnInit();
    component.account = {
      guid: 'account-a',
      archiveOption: 'skip'
    } as unknown as ElectronBackupFileComponent['account'];
    component.archiveOption = 'skip';

    automaticBackupsService.status.next('checking');
    automaticBackupsService.latestBackupFile.next(buildPreparedBackupFile());
    automaticBackupsService.status.next('ready');

    expect(component.showModal).toBe(true);
    expect(component.showArchiveDecision).toBe(true);

    component.hideModal();

    automaticBackupsService.status.next('saving');
    automaticBackupsService.latestBackupFile.next({
      ...buildPreparedBackupFile(),
      dataBackupId: 'automatic-save-id'
    });
    automaticBackupsService.status.next('ready');

    expect(component.showModal).toBe(false);
    expect(component.showArchiveDecision).toBe(false);
  });

  it('renders a conflict message when the backup registry entry is missing', () => {
    electronService.isElectron = true;
    component.showModal = true;
    automaticBackupsService.accountBackups = [];
    automaticBackupsService.status.next('conflict');
    automaticBackupsService.latestBackupFile.next(buildPreparedBackupFile());
    fixture.detectChanges();

    const popupBody = fixture.nativeElement.querySelector('.popup-body') as HTMLElement | null;
    expect(popupBody).not.toBeNull();
    expect(popupBody?.textContent).toContain('does not have a registered automatic backup record');
    expect(popupBody?.textContent).toContain('Which would you like to update?');
  });

  it('keeps conflict modal dismissed when Do Nothing clears review request', () => {
    component.account = { guid: 'account-a', archiveOption: 'always' } as unknown as ElectronBackupFileComponent['account'];
    component.archiveOption = 'always';
    component.latestBackupFile = {
      account: { name: 'Backup Account' },
      timeStamp: new Date('2026-08-10T00:00:00.000Z')
    } as unknown as ElectronBackupFileComponent['latestBackupFile'];
    component.backupStatus = 'conflict';
    component.reviewRequestedSub = automaticBackupsService.reviewRequested.subscribe(requested => {
      component.forceModal = requested;
      component.checkShowModal();
    });
    component.checkShowModal();
    expect(component.showModal).toBe(true);

    component.hideModal();

    expect(automaticBackupsService.clearReviewRequest).toHaveBeenCalledTimes(1);
    expect(component.showModal).toBe(false);
  });

  it('registers the backup file id after replacing the account from a conflicting file', async () => {
    component.account = {
      guid: 'account-a',
      archiveOption: 'always',
      dataBackupFilePath: '/tmp/account-a.json'
    } as unknown as ElectronBackupFileComponent['account'];
    component.archiveOption = 'always';
    component.differingBackups = true;
    component.overwriteOption = 'updateAccount';
    component.latestBackupFile = buildPreparedBackupFile();
    backupImportCoordinator.replaceActiveAccount.mockResolvedValue({
      guid: 'replacement-account-guid',
      archiveOption: 'always'
    });

    await component.confirmActions();

    expect(automaticBackupsService.addOrUpdateFile).toHaveBeenCalledWith(
      component.latestBackupFile.dataBackupId,
      'replacement-account-guid'
    );
    expect(automaticBackupsService.inspectCurrentAccountFile).toHaveBeenCalledTimes(1);
  });
});

function buildPreparedBackupFile(): PreparedBackupFile {
  return {
    dataVersion: 1,
    origin: 'VERIFI',
    backupFileType: 'Account',
    dataBackupId: 'backup-id',
    timeStamp: new Date('2026-08-10T00:00:00.000Z'),
    account: { guid: 'account-a', name: 'Backup Account' } as PreparedBackupFile['account'],
    facilities: [],
    facility: undefined as unknown as PreparedBackupFile['facility'],
    meters: [],
    meterData: [],
    groups: [],
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
  };
}
