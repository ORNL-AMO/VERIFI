import { Component, EventEmitter, Output, inject } from '@angular/core';
import { BackupImportCoordinator } from '@data/backup/backup-import-coordinator.service';
import { addAccountBackupMessages } from '@data/backup/backup-loading-messages';
import { FutureBackupVersionError, PreparedBackupFile } from '@data/backup/backup-preparation.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from '@shared/notifications/toast-notifications.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { P1RouteFacade } from '../../../p1-route.facade';

@Component({
  selector: 'app-p1-import-account-backup-drawer',
  templateUrl: './import-account-backup-drawer.component.html',
  styleUrls: ['./import-account-backup-drawer.component.css'],
  standalone: false
})
export class P1ImportAccountBackupDrawerComponent {
  @Output() closed = new EventEmitter<void>();

  private readonly backupImportCoordinator = inject(BackupImportCoordinator);
  private readonly loadingService = inject(LoadingService);
  private readonly toastNotificationService = inject(ToastNotificationsService);
  private readonly facade = inject(P1RouteFacade);

  backupFile: PreparedBackupFile | undefined;
  backupFileError = '';
  selectedFileName = '';
  isImporting = false;

  get backupName(): string {
    return this.backupFile?.account?.name || '';
  }

  get facilityCount(): number {
    return this.backupFile?.facilities?.length || 0;
  }

  get meterCount(): number {
    return this.backupFile?.meters?.length || 0;
  }

  close(): void {
    if (this.isImporting) {
      return;
    }
    this.closed.emit();
  }

  async setImportFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.backupFile = undefined;
    this.backupFileError = '';
    this.selectedFileName = file?.name || '';

    if (!file) {
      return;
    }

    try {
      const fileText = await this.readFileText(file);
      const preparedBackup = this.backupImportCoordinator.prepareTextBackup(fileText);

      if (preparedBackup.origin !== 'VERIFI') {
        this.backupFileError = 'Selected file does not come from VERIFI and cannot be imported.';
        return;
      }

      if (preparedBackup.backupFileType !== 'Account') {
        this.backupFileError = 'Selected file is a facility backup. Upload an account backup from the welcome screen.';
        return;
      }

      this.backupFile = preparedBackup;
    } catch (error) {
      console.warn('P1 prototype could not read account backup.', error);
      this.backupFileError = error instanceof FutureBackupVersionError
        ? error.message
        : error instanceof Error ? error.message : 'Selected file is not a valid VERIFI backup.';
    }
  }

  async importBackupFile(): Promise<void> {
    if (!this.backupFile || this.backupFileError || this.isImporting) {
      return;
    }

    this.isImporting = true;
    this.loadingService.setContext('p1-import-account-backup');
    this.loadingService.setTitle('Importing account backup file');
    this.loadingService.addLoadingMessage('Adding account');
    addAccountBackupMessages(this.loadingService);
    this.loadingService.setCurrentLoadingIndex(0);
    this.closed.emit();

    try {
      const backup = structuredClone(this.backupFile);
      const newAccount: IdbAccount = await this.backupImportCoordinator.importNewAccount(backup);
      this.loadingService.isLoadingComplete.next(true);
      await this.facade.openWorkspace(newAccount.guid);
    } catch (error) {
      console.warn('P1 prototype could not import account backup.', error);
      this.loadingService.clearLoadingMessages();
      this.loadingService.setContext(undefined);
      this.loadingService.setTitle('');
      this.loadingService.isLoadingComplete.next(true);
      this.toastNotificationService.showToast('Error importing backup', 'There was an error importing this account backup file.', 15000, false, 'alert-danger');
    } finally {
      this.isImporting = false;
    }
  }

  private readFileText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsText(file);
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error('Unable to read selected backup file.'));
    });
  }
}
