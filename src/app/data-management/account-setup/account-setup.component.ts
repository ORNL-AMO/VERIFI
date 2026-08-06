import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { ChangeDetectorRef, Component, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { AutomaticBackupsService } from 'src/app/electron/automatic-backups.service';
import { ElectronService } from 'src/app/electron/electron.service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from 'src/app/account-workspace/handlers/account-command-handler.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { BackupDataService, BackupFile } from 'src/app/shared/helper-services/backup-data.service';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';

@Component({
  selector: 'app-account-setup',
  templateUrl: './account-setup.component.html',
  styleUrl: './account-setup.component.css',
  standalone: false
})
export class AccountSetupComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly applicationLifecycleService = inject(ApplicationLifecycleService);


  showDeleteAccount: boolean = false;
  savedFilePath: string;
  savedFilePathSub: Subscription;
  updatingFilePath: boolean = false;
  isElectron: boolean;
  backupFile: BackupFile;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  downloadAsZip: boolean = false;
  constructor(private router: Router,
    private electronService: ElectronService,
    private backupDataService: BackupDataService,
    private commandBoundary: WorkspaceCommandBoundary,
    private accountHandler: AccountCommandHandler,
    private automaticBackupsService: AutomaticBackupsService,
    private cd: ChangeDetectorRef,
    private importBackupModalService: ImportBackupModalService, private injector: Injector) {

  }

  ngOnInit() {
    this.isElectron = this.electronService.isElectron;
    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(val => {
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
    let account: IdbAccount = this.accountWorkspaceStore.account();
    this.router.navigateByUrl('/data-management/' + account.guid + '/import-data');
  }

  async confirmAccountDelete() {
    this.showDeleteAccount = false;
    await this.accountHandler.update({ ...this.selectedAccount, deleteAccount: true }, this.selectedAccount.guid);
    await this.applicationLifecycleService.refreshAccountCatalog();
    this.router.navigateByUrl('/welcome');
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
    await this.commandBoundary.execute(
      { entityKind: 'account', changeKind: 'update', entityGuid: this.selectedAccount.guid, label: 'Updating account' },
      () => this.accountHandler.update(this.selectedAccount, this.selectedAccount.guid)
    );
    this.cd.detectChanges();
  }

  async saveChanges() {
    await this.commandBoundary.execute(
      { entityKind: 'account', changeKind: 'update', entityGuid: this.selectedAccount.guid, label: 'Saving account' },
      () => this.accountHandler.update(this.selectedAccount, this.selectedAccount.guid)
    );
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
    this.backupDataService.backupAccount(this.downloadAsZip);
  }
}
