import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CommonModule } from '@angular/common';
import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BehaviorSubject, from, of } from 'rxjs';
import { vi } from 'vitest';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { LoadingService } from '@app/core-components/loading/loading.service';
import { AccountWorkspaceSnapshot } from '@data/account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from '@data/account-workspace/account-workspace.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from '@data/account-workspace/handlers/facility-command-handler.service';
import { BackupExportCoordinator } from '@data/backup/backup-export-coordinator.service';
import { BackupPreparationService } from '@data/backup/backup-preparation.service';
import { ElectronBackupsDbService } from '@data/indexedDB/electron-backups-db.service';
import { BackupFile } from '@data/models/backup-file';
import { IdbAccount } from '@data/models/idbModels/account';
import { AutomaticBackupsService } from '@platform/electron/automatic-backups.service';
import { ElectronBackupFileGateway } from '@platform/electron/electron-backup-file.gateway';
import { ElectronService } from '@platform/electron/electron.service';
import { ElectronUpdateState } from '@platform/electron/electron-update.models';
import { UpdateInstallService } from '@platform/electron/update-install.service';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { ImportBackupModalService } from '@v0/core-components/import-backup-modal/import-backup-modal.service';
import { AccountSettingsComponent } from '@v0/data-evaluation/account/account-settings/account-settings.component';
import { AccountSetupComponent } from './account-setup.component';

@NgModule({
  declarations: [AccountSetupComponent],
  imports: [CommonModule, FormsModule],
  exports: [AccountSetupComponent],
  schemas: [NO_ERRORS_SCHEMA]
})
class AccountSetupTestModule { }

for (const componentType of [AccountSetupComponent, AccountSettingsComponent]) {
  describe(`${componentType.name} automatic backup restart coordination`, () => {
    let component: AccountSetupComponent | AccountSettingsComponent;
    let fixture: ComponentFixture<AccountSetupComponent | AccountSettingsComponent>;
    let store: AccountWorkspaceStore;
    let backups: AutomaticBackupsService;
    let installer: UpdateInstallService;
    let gateway: { chooseSavePath: ReturnType<typeof vi.fn>; write: ReturnType<typeof vi.fn>; exists: ReturnType<typeof vi.fn>; read: ReturnType<typeof vi.fn> };
    let registry: { addWithObservable: ReturnType<typeof vi.fn>; updateWithObservable: ReturnType<typeof vi.fn> };
    let accountHandler: { update: ReturnType<typeof vi.fn> };
    let electron: { isElectron: boolean; updateState: BehaviorSubject<ElectronUpdateState>; installUpdate: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      store = new AccountWorkspaceStore();
      store.publish(snapshot('account-a'));
      const backup = { account: store.account(), dataBackupId: 'backup-id', origin: 'VERIFI', backupFileType: 'Account' } as BackupFile;
      gateway = {
        chooseSavePath: vi.fn().mockResolvedValue('/tmp/account-a.json'),
        write: vi.fn().mockResolvedValue(undefined),
        exists: vi.fn().mockResolvedValue(true),
        read: vi.fn().mockResolvedValue(backup)
      };
      registry = { addWithObservable: vi.fn(value => of({ ...value, id: 1 })), updateWithObservable: vi.fn(value => of(value)) };
      accountHandler = { update: vi.fn((account: IdbAccount) => Promise.resolve(account)) };
      electron = { isElectron: true, updateState: new BehaviorSubject<ElectronUpdateState>({ status: 'downloaded' }), installUpdate: vi.fn() };
      TestBed.configureTestingModule({
        imports: componentType === AccountSetupComponent ? [AccountSetupTestModule] : [],
        declarations: componentType === AccountSettingsComponent ? [AccountSettingsComponent] : [],
        providers: [
          AutomaticBackupsService, UpdateInstallService,
          { provide: AccountWorkspaceStore, useValue: store },
          { provide: AccountWorkspaceService, useValue: {} },
          { provide: Router, useValue: { url: '/welcome' } },
          { provide: ApplicationLifecycleService, useValue: { initialize: vi.fn().mockResolvedValue({ status: 'ready' }) } },
          { provide: LoadingService, useValue: { setLoadingMessage: vi.fn(), setLoadingStatus: vi.fn() } },
          { provide: BackupExportCoordinator, useValue: { buildActiveAccountBackup: vi.fn(() => backup) } },
          { provide: BackupPreparationService, useValue: { prepare: vi.fn(value => value) } },
          { provide: ElectronBackupFileGateway, useValue: { ...gateway, isAvailable: true } },
          { provide: ElectronBackupsDbService, useValue: { ...registry, getAll: vi.fn(() => of([])) } },
          { provide: ToastNotificationsService, useValue: { showToast: vi.fn() } },
          { provide: ImportBackupModalService, useValue: {} },
          { provide: ElectronService, useValue: { ...electron, getFolderPath: () => of(undefined) } },
          { provide: AccountCommandHandler, useValue: accountHandler },
          { provide: FacilityCommandHandler, useValue: {} },
          { provide: WorkspaceCommandBoundary, useValue: {
            whenIdle: vi.fn().mockResolvedValue(undefined),
            execute: vi.fn(async (_request, operation: () => Promise<IdbAccount>) => {
              const account = await operation();
              store.publishCommitted({ ...store.snapshot(), account }, {});
              return { value: account };
            })
          } }
        ]
      }).overrideComponent(componentType, { set: { template: '' } });
      fixture = TestBed.createComponent<AccountSetupComponent | AccountSettingsComponent>(componentType);
      component = fixture.componentInstance;
      fixture.detectChanges();
      component.selectedAccount = store.account();
      backups = TestBed.inject(AutomaticBackupsService);
      backups.subscribeData();
      installer = TestBed.inject(UpdateInstallService);
    });

    it('waits for file writing, registry completion, and account publication before installing', async () => {
      const write = deferred<void>();
      const registration = deferred<any>();
      const publication = deferred<IdbAccount>();
      gateway.write.mockReturnValueOnce(write.promise);
      registry.addWithObservable.mockImplementationOnce(value => from(registration.promise.then(() => ({ ...value, id: 1 }))));
      accountHandler.update.mockReturnValueOnce(publication.promise);
      const configured = component.automaticBackup();
      await vi.waitFor(() => expect(gateway.write).toHaveBeenCalledOnce());
      // Restart navigation destroys the routed editor before the pending setup completes.
      fixture.destroy();
      const installed = installer.install();
      await Promise.resolve();
      expect(electron.installUpdate).not.toHaveBeenCalled();
      write.resolve();
      await vi.waitFor(() => expect(registry.addWithObservable).toHaveBeenCalledOnce());
      expect(electron.installUpdate).not.toHaveBeenCalled();
      registration.resolve(undefined);
      await vi.waitFor(() => expect(accountHandler.update).toHaveBeenCalledOnce());
      expect(electron.installUpdate).not.toHaveBeenCalled();
      publication.resolve({ ...store.account(), dataBackupFilePath: '/tmp/account-a.json', dataBackupId: 'backup-id' });
      await configured;
      await expect(installed).resolves.toBe(true);
      expect(store.account().dataBackupFilePath).toBe('/tmp/account-a.json');
      expect(electron.installUpdate).toHaveBeenCalledOnce();
    });

    for (const phase of ['file', 'registry', 'account'] as const) {
      it(`blocks installation after a ${phase} setup failure and allows a successful full retry`, async () => {
        if (phase === 'file') gateway.write.mockRejectedValueOnce(new Error('setup failed'));
        if (phase === 'registry') registry.addWithObservable.mockImplementationOnce(() => from(Promise.reject(new Error('setup failed'))));
        if (phase === 'account') accountHandler.update.mockRejectedValueOnce(new Error('setup failed'));
        await expect(component.automaticBackup()).rejects.toThrow('setup failed');
        await expect(installer.install()).rejects.toThrow('backup file could not be configured');
        expect(electron.installUpdate).not.toHaveBeenCalled();
        // Canceling a retry must not acknowledge the earlier failure.
        gateway.chooseSavePath.mockResolvedValueOnce(undefined);
        await component.automaticBackup();
        await expect(installer.install()).rejects.toThrow('backup file could not be configured');
        await component.automaticBackup();
        await expect(installer.install()).resolves.toBe(true);
        expect(electron.installUpdate).toHaveBeenCalledOnce();
      });
    }

    it('does not write or attach a backup to another account after the dialog is delayed', async () => {
      const choice = deferred<string>();
      gateway.chooseSavePath.mockReturnValueOnce(choice.promise);
      const configured = expect(component.automaticBackup()).rejects.toThrow('active account changed');
      await vi.waitFor(() => expect(gateway.chooseSavePath).toHaveBeenCalledOnce());
      store.publish(snapshot('account-b'));
      choice.resolve('/tmp/account-a.json');
      await configured;
      expect(gateway.write).not.toHaveBeenCalled();
      expect(registry.addWithObservable).not.toHaveBeenCalled();
      expect(accountHandler.update).not.toHaveBeenCalled();
    });
  });
}

function snapshot(guid: string): AccountWorkspaceSnapshot {
  return {
    account: { guid, name: guid } as IdbAccount,
    facilities: [], meters: [], meterData: [], meterGroups: [], predictors: [], predictorData: [],
    facilityAnalyses: [], accountAnalyses: [], accountReports: [], facilityReports: [],
    customEmissions: [], customFuels: [], customGWPs: [], energyUseGroups: [], energyUseEquipment: []
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
