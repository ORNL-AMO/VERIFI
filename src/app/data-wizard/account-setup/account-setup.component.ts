import { ChangeDetectorRef, Component } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { AutomaticBackupsService } from 'src/app/electron/automatic-backups.service';
import { ElectronService } from 'src/app/electron/electron.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { BackupDataService, BackupFile } from 'src/app/shared/helper-services/backup-data.service';

@Component({
  selector: 'app-account-setup',
  templateUrl: './account-setup.component.html',
  styleUrl: './account-setup.component.css',
  standalone: false
})
export class AccountSetupComponent {


  showDeleteAccount: boolean = false;
  savedFilePath: string;
  savedFilePathSub: Subscription;
  updatingFilePath: boolean = false;
  isElectron: boolean;
  backupFile: BackupFile;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  constructor(private router: Router,
    private accountDbService: AccountdbService,
    private electronService: ElectronService,
    private backupDataService: BackupDataService,
    private dbChangesService: DbChangesService,
    private automaticBackupsService: AutomaticBackupsService,
    private cd: ChangeDetectorRef,
    private importBackupModalService: ImportBackupModalService) {

  }

  ngOnInit() {
    this.isElectron = this.electronService.isElectron;
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
    });

    if (this.isElectron) {
      this.savedFilePathSub = this.electronService.savedFilePath.subscribe(savedFilePath => {
        if (this.updatingFilePath) {
          this.updateFilePath(savedFilePath)
        }
      });
    }
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    if (this.savedFilePathSub) {
      this.savedFilePathSub.unsubscribe();
    }
  }

  next() {
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.router.navigateByUrl('/data-wizard/' + account.guid + '/import-data');
  }

  async confirmAccountDelete() {
    this.showDeleteAccount = false;
    this.selectedAccount.deleteAccount = true;
    await firstValueFrom(this.accountDbService.updateWithObservable(this.selectedAccount));
    let accounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
    this.accountDbService.allAccounts.next(accounts);
    this.router.navigateByUrl('/verifi');
  }

  cancelAccountDelete() {
    this.showDeleteAccount = false;
  }

  openDeleteAccount() {
    this.showDeleteAccount = true;
  }

  async automaticBackup() {
    this.updatingFilePath = true;
    this.backupFile = this.backupDataService.getAccountBackupFile();
    this.electronService.openDialog(this.backupFile);
  }

  async updateFilePath(savedFilePath: string) {
    console.log('update file path')
    this.automaticBackupsService.initializingAccount = false;
    this.automaticBackupsService.creatingFile = true;
    this.selectedAccount.dataBackupFilePath = savedFilePath;
    this.selectedAccount.dataBackupId = this.backupFile.dataBackupId;
    this.updatingFilePath = false;
    await this.dbChangesService.updateAccount(this.selectedAccount);
    this.cd.detectChanges();
  }

  async saveChanges() {
    await this.dbChangesService.updateAccount(this.selectedAccount);
  }

  async changeIsShared() {
    await this.saveChanges();
    this.cd.detectChanges();
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
  }

  backupAccount() {
    this.backupDataService.backupAccount();
  }
}
