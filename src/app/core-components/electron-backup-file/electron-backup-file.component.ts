import { ChangeDetectorRef, Component } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AutomaticBackupsService } from 'src/app/electron/automatic-backups.service';
import { ElectronService } from 'src/app/electron/electron.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { ElectronBackupsDbService } from 'src/app/indexedDB/electron-backups-db.service';
import { IdbElectronBackup } from 'src/app/models/idb';
import { BackupDataService, BackupFile } from 'src/app/shared/helper-services/backup-data.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { LoadingService } from '../loading/loading.service';
import { DatePipe } from '@angular/common';
import { DeleteDataService } from 'src/app/indexedDB/delete-data.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

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
  forceModal: boolean = false;
  constructor(private electronService: ElectronService,
    private accountDbService: AccountdbService,
    private automaticBackupsService: AutomaticBackupsService,
    private electronBackupsDbService: ElectronBackupsDbService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private backupDataService: BackupDataService,
    private loadingService: LoadingService,
    private cd: ChangeDetectorRef,
    private deleteDataService: DeleteDataService) {

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
      if (this.automaticBackupsService.forceModal == true) {
        this.forceModal = true;
        this.showModal = true;
      } else {
        this.forceModal = false;
      }
      this.cd.detectChanges();
    } else if (this.latestBackupFile) {
      this.automaticBackupsService.initializingAccount = false;
    }
  }

  hideModal() {
    this.showModal = false;
    this.automaticBackupsService.initializingAccount = false;
    this.automaticBackupsService.forceModal = false;
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
        this.deleteDataService.pauseDelete.next(true);
        this.account.deleteAccount = true;
        await firstValueFrom(this.accountDbService.updateWithObservable(this.account));
        let accounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
        this.accountDbService.allAccounts.next(accounts);

        let backupPath: string = this.account.dataBackupFilePath;
        let sharedFileAuthor: string = this.account.sharedFileAuthor;
        let isSharedBackupFile: boolean = this.account.isSharedBackupFile;
        let newAccount: IdbAccount = await this.backupDataService.importAccountBackupFile(this.latestBackupFile);
        newAccount.dataBackupFilePath = backupPath;
        newAccount.sharedFileAuthor = sharedFileAuthor;
        newAccount.isSharedBackupFile = isSharedBackupFile;

        await this.dbChangesService.updateAccount(newAccount);
        await this.dbChangesService.selectAccount(newAccount, false);
        this.deleteDataService.pauseDelete.next(false);
        this.deleteDataService.gatherAndDelete();
        this.loadingService.setLoadingStatus(false);
        needUpdate = false;
      }
    }

    if (needUpdate) {
      //archive created. set to skip for settings.
      if (this.archiveOption == 'justOnce') {
        this.account.archiveOption = 'skip';
      } else {
        this.account.archiveOption = this.archiveOption;
      }
      await this.dbChangesService.updateAccount(this.account);
    }

    this.hideModal();
  }


  createArchive() {
    let dataBackupFilePath: string = this.account.dataBackupFilePath;
    let archiveBackup: BackupFile = this.backupDataService.getAccountBackupFile();
    archiveBackup.account = JSON.parse(JSON.stringify(archiveBackup.account));
    let sub: string = dataBackupFilePath.substring(0, dataBackupFilePath.length - 5);
    let date: Date = new Date(archiveBackup.timeStamp);

    let datePipe: DatePipe = new DatePipe(navigator.language);
    let stringFormat: string = 'shortTime';
    let timeStr = datePipe.transform(archiveBackup.timeStamp, stringFormat);
    timeStr = timeStr.replace(':', '_').replace(' ', '_').replace('.', '_');
    let dateStr: string = (date.getMonth() + 1) + "-" + date.getDate() + "-" + date.getFullYear() + '_' + timeStr;
    archiveBackup.account.dataBackupFilePath = sub + '_' + dateStr + '.json';
    this.electronService.sendSaveData(archiveBackup, true);
    this.toastNotificationService.showToast('Archive Created', archiveBackup.account.dataBackupFilePath + ' created!', undefined, false, 'alert-success');
  }
}
