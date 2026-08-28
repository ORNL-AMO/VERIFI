import { Component, TemplateRef, ViewChild, ViewContainerRef, effect, inject, untracked } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { TemplatePortal } from '@angular/cdk/portal';
import { BackupExportCoordinator } from '@data/backup/backup-export-coordinator.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { AutomaticBackupStatus, AutomaticBackupsService } from '@platform/electron/automatic-backups.service';
import { ElectronBackupFileGateway } from '@platform/electron/electron-backup-file.gateway';
import { WorkspaceNavigationService } from '../../../shell/workspace-navigation.service';
import { ModalPortalService } from '../../../shell/modal-portal.service';
import { AccountSettingsDetailBase } from '../account-settings-detail.base';

@Component({
  selector: 'app-account-settings-backup',
  templateUrl: './account-settings-backup.component.html',
  styleUrls: ['../account-settings.component.css'],
  host: { style: 'display: block;' },
  standalone: false
})
export class AccountSettingsBackupComponent extends AccountSettingsDetailBase {
  private readonly backupExportCoordinator = inject(BackupExportCoordinator);
  private readonly automaticBackups = inject(AutomaticBackupsService);
  private readonly navigation = inject(WorkspaceNavigationService);
  private readonly modalPortal = inject(ModalPortalService);
  private readonly viewContainerRef = inject(ViewContainerRef);
  readonly backupGateway = inject(ElectronBackupFileGateway);

  readonly automaticBackupStatus = toSignal(this.automaticBackups.status, { initialValue: 'disabled' as AutomaticBackupStatus });
  readonly automaticBackupSaving = toSignal(this.automaticBackups.saving, { initialValue: false });

  @ViewChild('backupConfirmModal') private readonly backupConfirmModal!: TemplateRef<unknown>;

  form: FormGroup;
  showBackupConfirm = false;
  showImportPanel = false;
  isBackingUp = false;

  override ngOnDestroy(): void {
    super.ngOnDestroy();
    this.showBackupConfirm = false;
    this.modalPortal.hide();
  }

  get automaticBackupLabel(): string {
    if (!this.backupGateway.isAvailable) {
      return 'Available in the desktop application';
    }
    switch (this.automaticBackupStatus()) {
      case 'checking':
        return 'Checking selected backup file';
      case 'ready':
        return 'Automatic backup is ready';
      case 'pending':
        return 'Backup queued';
      case 'saving':
        return 'Saving backup file';
      case 'conflict':
        return 'Backup file needs review';
      case 'error':
        return 'Backup file needs attention';
      default:
        return this.account()?.dataBackupFilePath ? 'Backup file selected' : 'No automatic backup file selected';
    }
  }

  constructor() {
    super();
    effect(() => {
      const account = this.account();
      if (!account) {
        return;
      }
      if (this.skipNextWorkspaceRefresh) {
        this.skipNextWorkspaceRefresh = false;
        return;
      }
      this.buildForm(account);
    });
    effect(() => {
      this.applyFormAvailability(this.canWrite());
    });
  }

  scheduleBackupSettingsSave(): void {
    this.scheduleSave(() => this.saveBackupSettings());
  }

  flushBackupSettingsSave(): void {
    this.flushSave(() => this.saveBackupSettings());
  }

  async saveBackupSettings(): Promise<void> {
    if (!this.form) {
      return;
    }
    this.applyFormAvailability(this.canWrite());
    await this.saveAccount('Saving backup settings', account => ({
      ...account,
      isSharedBackupFile: !!this.form.controls['isSharedBackupFile'].value,
      sharedFileAuthor: this.form.controls['sharedFileAuthor'].value,
      archiveOption: this.form.controls['archiveOption'].value
    }));
  }

  openBackupConfirm(): void {
    if (!this.account() || this.isBackingUp) {
      return;
    }
    this.showBackupConfirm = true;
    this.saveError = '';
    this.modalPortal.show(new TemplatePortal(this.backupConfirmModal, this.viewContainerRef));
  }

  cancelBackupConfirm(): void {
    if (!this.isBackingUp) {
      this.showBackupConfirm = false;
      this.modalPortal.hide();
    }
  }

  async confirmBackupDownload(): Promise<void> {
    if (!this.account() || this.isBackingUp) {
      return;
    }
    this.showBackupConfirm = false;
    this.modalPortal.hide();
    this.isBackingUp = true;
    await this.runSave('Preparing account backup', async () => {
      await this.backupExportCoordinator.exportActiveAccount({ downloadAsZip: false });
    });
    this.isBackingUp = false;
  }

  async chooseAutomaticBackupLocation(): Promise<void> {
    const account = this.account();
    if (!account || !this.canWrite() || !this.backupGateway.isAvailable) {
      return;
    }
    const backupFile = this.backupExportCoordinator.buildActiveAccountBackup();
    const defaultPath = account.dataBackupFilePath ?? `${account.name}.json`;
    const savedFilePath = await this.backupGateway.chooseSavePath(defaultPath);
    if (!savedFilePath) {
      return;
    }

    await this.runSave('Saving automatic backup settings', async () => {
      await this.backupGateway.write(savedFilePath, backupFile);
      await this.automaticBackups.addOrUpdateFile(backupFile.dataBackupId, account.guid);
      const updatedAccount: IdbAccount = {
        ...structuredClone(account),
        dataBackupFilePath: savedFilePath,
        dataBackupId: backupFile.dataBackupId
      };
      await this.commandBoundary.execute(
        {
          entityKind: 'account',
          changeKind: 'update',
          entityGuid: updatedAccount.guid,
          label: 'Saving automatic backup settings',
          notification: { suppressSuccessToast: true },
          publication: { mode: 'patch', buildPatch: value => ({ account: value }) }
        },
        () => this.accountHandler.update(updatedAccount, updatedAccount.guid)
      );
      await this.automaticBackups.inspectCurrentAccountFile();
      await this.lifecycle.refreshAccountCatalog();
    });
  }

  openImportPanel(): void {
    this.showImportPanel = true;
    this.saveError = '';
  }

  closeImportPanel(): void {
    this.showImportPanel = false;
  }

  async openImportedAccount(account: IdbAccount): Promise<void> {
    this.closeImportPanel();
    await this.navigation.openAccount(account.guid);
  }

  private buildForm(account: IdbAccount): void {
    this.form = new FormGroup({
      isSharedBackupFile: new FormControl(!!account.isSharedBackupFile),
      sharedFileAuthor: new FormControl(account.sharedFileAuthor || ''),
      archiveOption: new FormControl(account.archiveOption || 'skip')
    });
    this.applyFormAvailability(untracked(() => this.canWrite()));
  }

  private applyFormAvailability(canWrite: boolean): void {
    const hasAutomaticBackupFile = !!this.account()?.dataBackupFilePath;
    this.setFormEnabled(this.form, canWrite && hasAutomaticBackupFile);
    this.setControlEnabled(
      this.form?.controls['sharedFileAuthor'],
      canWrite && hasAutomaticBackupFile && !!this.form?.controls['isSharedBackupFile'].value
    );
  }
}
