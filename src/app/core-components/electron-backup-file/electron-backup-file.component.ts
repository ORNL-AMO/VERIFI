import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AutomaticBackupsService } from 'src/app/electron/automatic-backups.service';
import { ElectronService } from 'src/app/electron/electron.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { ElectronBackupsDbService } from 'src/app/indexedDB/electron-backups-db.service';
import { IdbAccount, IdbElectronBackup } from 'src/app/models/idb';
import { BackupFile } from 'src/app/shared/helper-services/backup-data.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';

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
  electronBackup: IdbElectronBackup;
  constructor(private electronService: ElectronService,
    private accountDbService: AccountdbService,
    private automaticBackupsService: AutomaticBackupsService,
    private electronBackupsDbService: ElectronBackupsDbService,
    private toastNotificationService: ToastNotificationsService) {

  }

  ngOnInit() {
    this.isElectron = this.electronService.isElectron;
    if (this.electronService.isElectron) {
      this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
        this.account = val;
        if (this.account) {
          this.electronBackup = this.electronBackupsDbService.accountBackups.find(backup => {
            return backup.accountId == this.account.guid
          });
          this.archiveOption = this.account.archiveOption;
        }
      });

      this.latestBackupFileSub = this.electronService.accountLatestBackupFile.subscribe(val => {
        if (val) {
          this.latestBackupFile = val;
          if (this.archiveOption == 'skip' || this.archiveOption == 'justOnce') {
            this.showModal = true;
          } else if (this.archiveOption == 'always') {
            //create archive here?
            this.createArchive();
          }
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

  hideModal() {
    this.showModal = false;
    this.automaticBackupsService.initializingAccount = false;
  }

  confirmActions() {
    if (this.archiveOption == 'always') {
      //update account and always create archive

    } else if (this.archiveOption == 'justOnce') {
      //create single archive
      console.log('just once');
      this.createArchive();
    } else if (this.archiveOption == 'never') {
      //update account and save. never show again
    } else if (this.archiveOption == 'skip') {
      //do nothing with archive  
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
