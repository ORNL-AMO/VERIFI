import { Component, EventEmitter, Output, inject } from '@angular/core';
import { BackupImportCoordinator } from '@data/backup/backup-import-coordinator.service';
import { FutureBackupVersionError, PreparedBackupFile } from '@data/backup/backup-preparation.service';
import { IdbAccount } from '@data/models/idbModels/account';

@Component({
  selector: 'app-import-account-backup-panel',
  templateUrl: './import-account-backup.component.html',
  styleUrls: ['./import-account-backup.component.css'],
  standalone: true
})
export class ImportAccountBackupComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<IdbAccount>();

  private readonly backupImportCoordinator = inject(BackupImportCoordinator);

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
    if (!this.isImporting) {
      this.closed.emit();
    }
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
      const fileText = await file.text();
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
      console.warn('v1 welcome could not read account backup.', error);
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
    try {
      const backup = structuredClone(this.backupFile);
      const newAccount = await this.backupImportCoordinator.importNewAccount(backup);
      this.completed.emit(newAccount);
    } catch (error) {
      console.warn('v1 welcome could not import account backup.', error);
      this.backupFileError = 'There was an error importing this account backup file.';
    } finally {
      this.isImporting = false;
    }
  }
}
