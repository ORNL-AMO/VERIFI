import { effect, Injectable } from '@angular/core';
import { ElectronService } from './electron.service';
import { BackupDataService, BackupFile } from '../shared/helper-services/backup-data.service';
import { ToastNotificationsService } from '../core-components/toast-notifications/toast-notifications.service';
import { DbChangesService } from '../indexedDB/db-changes.service';
import { ElectronBackupsDbService } from '../indexedDB/electron-backups-db.service';
import { BehaviorSubject } from 'rxjs';
import { IdbAccount } from '../models/idbModels/account';
import { AccountWorkspaceState } from '../account-workspace/account-workspace.models';
import { AccountWorkspaceStore } from '../account-workspace/account-workspace.store';

@Injectable({
  providedIn: 'root'
})
export class AutomaticBackupsService {

  account: IdbAccount;
  backupTimer: any;
  fileExists: boolean;
  initializingAccount: boolean = true;
  saving: BehaviorSubject<boolean>;
  forceModal: boolean = false;
  creatingFile: boolean = false;
  private observingRevisions = false;
  private lastObservedRevision?: string;
  constructor(
    private electronService: ElectronService,
    private backupDataService: BackupDataService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private electronBackupsDbService: ElectronBackupsDbService,
    private workspaceStore: AccountWorkspaceStore
  ) {
    this.saving = new BehaviorSubject<boolean>(false);
    if (this.electronService.isElectron) {
      this.electronService.fileExists.subscribe(val => {
        this.fileExists = val;
        if (this.initializingAccount && this.account) {
          if (this.fileExists) {
            this.electronService.getDataFile(this.account.dataBackupFilePath);
          } else if (this.account) {
            this.alertFileDoesNotExist();
          }
        }
      });
    }
    effect(() => this.observeWorkspace(this.workspaceStore.state()));
  }

  subscribeData() {
    if (!this.electronService.isElectron || this.observingRevisions) { return; }
    this.observingRevisions = true;
    this.observeWorkspace(this.workspaceStore.state());
  }

  clearBackupTimer() {
    if (this.backupTimer) {
      clearTimeout(this.backupTimer)
    }
  }

  async saveBackup() {

    if (this.account && this.account.dataBackupFilePath && !this.initializingAccount) {
      this.saving.next(true);
      this.clearBackupTimer();
      if (!this.creatingFile) {
        //backup 3 seconds after changes finish..
        this.backupTimer = setTimeout(() => {
          this.electronService.checkFileExists(this.account.dataBackupFilePath);
          setTimeout(() => {
            if (this.fileExists) {
              let backupFile: BackupFile = this.backupDataService.getAccountBackupFile();
              this.electronBackupsDbService.addOrUpdateFile(backupFile.dataBackupId, this.account.guid);
              this.electronService.sendSaveData(backupFile)
            } else {
              console.log('tried to save but there is no file')
              this.alertFileDoesNotExist();
            }
            this.saving.next(false);
          }, 500);
        }, 3000);
      } else {
        console.log('create file')
        let backupFile: BackupFile = this.backupDataService.getAccountBackupFile();
        this.electronBackupsDbService.addOrUpdateFile(backupFile.dataBackupId, this.account.guid);
        this.electronService.sendSaveData(backupFile, false, true);
        this.creatingFile = false;
        this.saving.next(false);
      }
    }
  }

  overwriteFile() {
    this.electronService.checkFileExists(this.account.dataBackupFilePath);
    setTimeout(() => {
      if (this.fileExists) {
        let backupFile: BackupFile = this.backupDataService.getAccountBackupFile();
        this.electronBackupsDbService.addOrUpdateFile(backupFile.dataBackupId, this.account.guid);
        this.electronService.sendSaveData(backupFile)
      } else {
        this.alertFileDoesNotExist();
      }
    }, 500);
  }

  initializeAccount() {
    if (this.electronService.isElectron) {
      if (this.account && this.account.dataBackupFilePath) {
        this.electronService.checkFileExists(this.account.dataBackupFilePath);
      } else {
        this.initializingAccount = false;
      }
    }
  }

  private observeWorkspace(state: AccountWorkspaceState): void {
    if (!this.electronService.isElectron || !this.observingRevisions) { return; }
    if (state.status === 'loading' || state.status === 'switching') {
      this.clearBackupTimer();
      this.saving.next(false);
      return;
    }

    const account = state.snapshot?.account;
    if (!account) {
      this.clearBackupTimer();
      this.account = undefined;
      this.lastObservedRevision = undefined;
      return;
    }
    if (this.account?.guid !== account.guid) {
      this.clearBackupTimer();
      this.electronService.accountLatestBackupFile.next(undefined);
      this.account = account;
      this.initializingAccount = true;
      this.lastObservedRevision = undefined;
      this.initializeAccount();
      return;
    }
    this.account = account;

    const revision = state.committedRevision;
    if (!revision || revision.accountGuid !== account.guid) { return; }
    const revisionKey = `${revision.accountGuid}:${revision.revision}`;
    if (revisionKey === this.lastObservedRevision) { return; }
    this.lastObservedRevision = revisionKey;
    void this.saveBackup();
  }

  alertFileDoesNotExist() {
    this.toastNotificationService.showToast('Missing Backup File', 'The file selected to backup this account no longer exists. Please navigate to the settings page for the account to update the file selection.', 10000, false, 'alert-danger')
    this.account.dataBackupFilePath = undefined;
    this.dbChangesService.updateAccount(this.account);
  }
}
