import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AutomaticBackupsService } from 'src/app/electron/automatic-backups.service';
import { ElectronService } from 'src/app/electron/electron.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { ElectronBackupsDbService } from 'src/app/indexedDB/electron-backups-db.service';
import { IdbAccount, IdbElectronBackup } from 'src/app/models/idb';
import { BackupDataService, BackupFile } from 'src/app/shared/helper-services/backup-data.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { LoadingService } from '../loading/loading.service';

@Component({
  selector: 'app-electron-backup-file',
  templateUrl: './electron-backup-file.component.html',
  styleUrls: ['./electron-backup-file.component.css']
})
export class ElectronBackupFileComponent {


  latestBackupFileSub: Subscription;
  latestBackupFile: BackupFile;
  account: IdbAccount;
  accountSub: Subscription;
  showModal: boolean = false;
  isElectron: boolean;
  archiveOption: 'never' | 'always' | 'justOnce' | 'skip';
  overwriteOption: 'updateAccount' | 'overwriteFile' = 'updateAccount';
  differingBackups: boolean = false;
  electronBackup: IdbElectronBackup;
  constructor(private electronService: ElectronService,
    private accountDbService: AccountdbService,
    private automaticBackupsService: AutomaticBackupsService,
    private electronBackupsDbService: ElectronBackupsDbService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private backupDataService: BackupDataService,
    private loadingService: LoadingService) {

  }

  ngOnInit() {
    this.isElectron = this.electronService.isElectron;
    if (this.electronService.isElectron) {
      this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
        //initialize account or account change
        if (val) {
          if (!this.account || (this.account.guid != val.guid)) {
            this.account = val;
            if (this.account) {
              this.electronBackup = this.electronBackupsDbService.accountBackups.find(backup => {
                return backup.accountId == this.account.guid
              });
              this.archiveOption = this.account.archiveOption;
              this.checkShowModal();
            }
          }
        }
      });

      this.latestBackupFileSub = this.electronService.accountLatestBackupFile.subscribe(val => {
        this.latestBackupFile = val;
        if (this.latestBackupFile) {
          if (this.archiveOption == 'always') {
            this.createArchive();
          }
          this.checkShowModal();
        }
      });
    }

  }

  ngOnDestroy() {
    if (this.electronService.isElectron) {
      this.accountSub.unsubscribe();
      this.latestBackupFileSub.unsubscribe();
    }
  }

  checkShowModal() {
    if (this.account && this.electronBackup && this.latestBackupFile) {
      if (this.latestBackupFile.dataBackupId != this.electronBackup.dataBackupId) {
        this.differingBackups = true;
        this.showModal = true;
      } else {
        this.differingBackups = false;
      }
      if (this.archiveOption == 'skip' || this.archiveOption == 'justOnce') {
        this.showModal = true;
      }
      if (this.showModal == false) {
        this.automaticBackupsService.initializingAccount = false;
      }
    }
  }

  hideModal() {
    this.showModal = false;
    this.automaticBackupsService.initializingAccount = false;
  }

  async confirmActions() {
    if (this.archiveOption == 'justOnce' || ((this.account.archiveOption != this.archiveOption) && this.archiveOption == 'always')) {
      this.createArchive();
    }

    let needUpdate: boolean = this.account.archiveOption != this.archiveOption;
    if (this.differingBackups) {
      if (this.overwriteOption == 'overwriteFile') {
        this.automaticBackupsService.overwriteFile();
      } else if (this.overwriteOption == 'updateAccount') {
        this.showModal = false;
        this.loadingService.setLoadingMessage('Overwriting account. This may take a moment.');
        this.loadingService.setLoadingStatus(true);
        await this.backupDataService.deleteAccountData(this.account);
        let backupPath: string = this.account.dataBackupFilePath;
        let sharedFileAuthor: string = this.account.sharedFileAuthor;
        console.log('1: ' + sharedFileAuthor);
        let isSharedBackupFile: boolean = this.account.isSharedBackupFile;
        this.account = await this.backupDataService.importAccountBackupFile(this.latestBackupFile);
        this.account.dataBackupFilePath = backupPath;
        this.account.sharedFileAuthor = sharedFileAuthor;
        this.account.isSharedBackupFile = isSharedBackupFile;
        console.log('2: ' + this.account.sharedFileAuthor);
        await this.dbChangesService.updateAccount(this.account);
        await this.dbChangesService.selectAccount(this.account, false);
        this.loadingService.setLoadingStatus(false);
        needUpdate = false;
      }
    }

    if (needUpdate) {
      this.account.archiveOption = this.archiveOption;
      await this.dbChangesService.updateAccount(this.account);
    }

    this.hideModal();
  }


  createArchive() {
    let dataBackupFilePath: string = this.account.dataBackupFilePath;
    let sub: string = dataBackupFilePath.substring(0, dataBackupFilePath.length - 5);
    let date: Date = new Date(this.latestBackupFile.timeStamp);
    let dateStr: string = (date.getMonth() + 1) + "-" + date.getDate() + "-" + date.getFullYear();
    this.latestBackupFile.account.dataBackupFilePath = sub + '_' + dateStr + '.json';
    this.electronService.sendSaveData(this.latestBackupFile, true);
    this.toastNotificationService.showToast('Archive Created', this.latestBackupFile.account.dataBackupFilePath + ' created!', undefined, false, 'alert-success');
  }
}
