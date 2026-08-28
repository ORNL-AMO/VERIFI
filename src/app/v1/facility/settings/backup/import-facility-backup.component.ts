import { Component, EventEmitter, Output, computed, inject } from '@angular/core';
import { BackupImportCoordinator } from '@data/backup/backup-import-coordinator.service';
import { FutureBackupVersionError, PreparedBackupFile } from '@data/backup/backup-preparation.service';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { IdbFacility } from '@data/models/idbModels/facility';
import { DrawerFocusTrapDirective } from '../../../welcome/shared/drawer-focus-trap.directive';

@Component({
  selector: 'app-import-facility-backup-panel',
  templateUrl: './import-facility-backup.component.html',
  styleUrls: ['../../../welcome/import-account-backup/import-account-backup.component.css'],
  imports: [DrawerFocusTrapDirective],
  standalone: true
})
export class ImportFacilityBackupComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() completed = new EventEmitter<IdbFacility>();

  private readonly backupImportCoordinator = inject(BackupImportCoordinator);
  private readonly workspace = inject(AccountWorkspaceStore);

  readonly account = this.workspace.account;
  readonly facility = this.workspace.selectedFacility;
  readonly isSingleSiteSetup = computed(() =>
    this.account()?.isSingleFacilityCompany === true && this.workspace.facilities().length === 1
  );

  backupFile: PreparedBackupFile | undefined;
  backupFileError = '';
  selectedFileName = '';
  importMode: 'new' | 'replace' = 'replace';
  isImporting = false;

  get backupName(): string {
    return this.backupFile?.facility?.name || '';
  }

  get meterCount(): number {
    return this.backupFile?.meters?.length || 0;
  }

  get predictorCount(): number {
    return this.backupFile?.predictors?.length || 0;
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

      if (preparedBackup.backupFileType !== 'Facility') {
        this.backupFileError = 'Selected file is an account backup. Facility settings can import facility backup files only.';
        return;
      }

      this.backupFile = preparedBackup;
    } catch (error) {
      console.warn('v1 facility settings could not read facility backup.', error);
      this.backupFileError = error instanceof FutureBackupVersionError
        ? error.message
        : error instanceof Error ? error.message : 'Selected file is not a valid VERIFI backup.';
    }
  }

  async importBackupFile(): Promise<void> {
    const account = this.account();
    const currentFacility = this.facility();
    if (!account || !this.backupFile || this.backupFileError || this.isImporting) {
      return;
    }
    if (this.importMode === 'replace' && !currentFacility) {
      this.backupFileError = 'Select a facility before replacing it with a backup.';
      return;
    }

    this.isImporting = true;
    try {
      const backup = structuredClone(this.backupFile);
      const importedFacility = this.importMode === 'replace'
        ? await this.backupImportCoordinator.replaceFacility(backup, account, currentFacility!)
        : await this.backupImportCoordinator.importNewFacility(backup, account.guid);
      this.completed.emit(importedFacility);
    } catch (error) {
      console.warn('v1 facility settings could not import facility backup.', error);
      this.backupFileError = 'There was an error importing this facility backup file.';
    } finally {
      this.isImporting = false;
    }
  }
}
