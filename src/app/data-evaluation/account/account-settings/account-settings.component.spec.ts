import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA, Pipe, PipeTransform, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { vi } from 'vitest';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { AccountCommandHandler } from 'src/app/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';
import { BackupExportCoordinator } from 'src/app/backup/backup-export-coordinator.service';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AutomaticBackupsService } from 'src/app/electron/automatic-backups.service';
import { ElectronBackupFileGateway } from 'src/app/electron/electron-backup-file.gateway';
import { ElectronService } from 'src/app/electron/electron.service';
import { BackupFile } from 'src/app/models/backup-file';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AccountSettingsComponent } from './account-settings.component';

@Pipe({ name: 'naicsDisplay', standalone: false })
export class NaicsDisplayPipeStub implements PipeTransform {
  transform(_value: unknown): string {
    return '';
  }
}

@NgModule({
  declarations: [AccountSettingsComponent, NaicsDisplayPipeStub],
  imports: [CommonModule, FormsModule],
  exports: [AccountSettingsComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
export class AccountSettingsTestModule { }

describe('AccountSettingsComponent', () => {
  let fixture: ComponentFixture<AccountSettingsComponent>;
  let component: AccountSettingsComponent;
  let accountHandler: { update: ReturnType<typeof vi.fn> };
  let backupGateway: {
    chooseSavePath: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
  };
  let automaticBackupsService: {
    addOrUpdateFile: ReturnType<typeof vi.fn>;
    inspectCurrentAccountFile: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    accountHandler = {
      update: vi.fn().mockRejectedValue(new Error('persist failed'))
    };
    backupGateway = {
      chooseSavePath: vi.fn().mockResolvedValue('/tmp/new-backup.json'),
      write: vi.fn().mockResolvedValue(undefined)
    };
    automaticBackupsService = {
      addOrUpdateFile: vi.fn().mockResolvedValue(undefined),
      inspectCurrentAccountFile: vi.fn().mockResolvedValue(undefined)
    };

    TestBed.configureTestingModule({
      imports: [AccountSettingsTestModule],
      providers: [
        { provide: Router, useValue: { navigateByUrl: vi.fn() } },
        { provide: LoadingService, useValue: { setLoadingStatus: vi.fn(), setLoadingMessage: vi.fn(), addLoadingMessage: vi.fn(), setContext: vi.fn(), setTitle: vi.fn(), isLoadingComplete: { next: vi.fn() } } },
        { provide: BackupExportCoordinator, useValue: { buildActiveAccountBackup: vi.fn(() => buildBackupFile('new-backup-id')), exportActiveAccount: vi.fn() } },
        { provide: ImportBackupModalService, useValue: { inFacility: false, showModal: { next: vi.fn() } } },
        { provide: ToastNotificationsService, useValue: { showToast: vi.fn() } },
        { provide: WorkspaceCommandBoundary, useValue: { execute: vi.fn(async (_metadata, operation: () => Promise<unknown>) => operation()) } },
        { provide: AccountCommandHandler, useValue: accountHandler },
        { provide: FacilityCommandHandler, useValue: { add: vi.fn(), update: vi.fn(), delete: vi.fn() } },
        { provide: ElectronService, useValue: { isElectron: false, getFolderPath: vi.fn() } },
        { provide: ElectronBackupFileGateway, useValue: backupGateway },
        { provide: AutomaticBackupsService, useValue: automaticBackupsService },
        { provide: AccountWorkspaceStore, useValue: { account: signal(undefined), facilities: signal([]), accountAnalyses: () => [], accountReports: () => [] } },
        { provide: AccountWorkspaceService, useValue: { selectFacility: vi.fn() } },
        { provide: ApplicationLifecycleService, useValue: { handleMarkedAccountDeletion: vi.fn() } }
      ]
    });

    fixture = TestBed.createComponent(AccountSettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not mutate selected account backup fields when persistence fails in automatic backup', async () => {
    component.selectedAccount = {
      guid: 'account-a',
      name: 'Account A',
      archiveOption: 'skip',
      dataBackupFilePath: '/tmp/original-backup.json',
      dataBackupId: 'original-backup-id'
    } as IdbAccount;

    await expect(component.automaticBackup()).rejects.toThrow('persist failed');

    expect(component.selectedAccount.dataBackupFilePath).toBe('/tmp/original-backup.json');
    expect(component.selectedAccount.dataBackupId).toBe('original-backup-id');
    expect(accountHandler.update).toHaveBeenCalledWith(
      expect.objectContaining({
        guid: 'account-a',
        dataBackupFilePath: '/tmp/new-backup.json',
        dataBackupId: 'new-backup-id'
      }),
      'account-a'
    );
    expect(automaticBackupsService.inspectCurrentAccountFile).not.toHaveBeenCalled();
  });
});

function buildBackupFile(dataBackupId: string): BackupFile {
  return {
    origin: 'VERIFI',
    backupFileType: 'Account',
    dataVersion: 1,
    dataBackupId,
    timeStamp: new Date('2026-08-10T12:00:00.000Z'),
    account: { guid: 'account-a', name: 'Account A' } as BackupFile['account'],
    facilities: [],
    facility: undefined as unknown as BackupFile['facility'],
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
