import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { ChangeDetectorRef, Component, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { AutomaticBackupsService } from 'src/app/electron/automatic-backups.service';
import { ElectronService } from 'src/app/electron/electron.service';
import { ElectronBackupFileGateway } from 'src/app/electron/electron-backup-file.gateway';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from 'src/app/account-workspace/handlers/account-command-handler.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { BackupFile } from 'src/app/models/backup-file';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';
import { BackupExportCoordinator } from 'src/app/backup/backup-export-coordinator.service';

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
  isElectron: boolean;
  backupFile: BackupFile;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  downloadAsZip: boolean = false;
  constructor(private router: Router,
    private electronService: ElectronService,
    private backupExportCoordinator: BackupExportCoordinator,
    private backupGateway: ElectronBackupFileGateway,
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
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
  }

  next() {
    let account: IdbAccount = this.accountWorkspaceStore.account();
    this.router.navigateByUrl('/data-management/' + account.guid + '/import-data');
  }

  async confirmAccountDelete() {
    this.showDeleteAccount = false;
    await this.commandBoundary.execute(
      { entityKind: 'account', changeKind: 'delete', entityGuid: this.selectedAccount.guid, label: 'Deleting account' },
      () => this.accountHandler.update({ ...this.selectedAccount, deleteAccount: true }, this.selectedAccount.guid)
    );
    const accounts = await this.applicationLifecycleService.handleMarkedAccountDeletion(this.selectedAccount.guid);
    const hasUsableAccount = accounts.some(account => !account.deleteAccount);
    this.router.navigateByUrl(hasUsableAccount ? '/manage-accounts' : '/welcome');
  }

  cancelAccountDelete() {
    this.showDeleteAccount = false;
  }

  openDeleteAccount() {
    this.showDeleteAccount = true;
  }

  async automaticBackup() {
    this.backupFile = this.backupExportCoordinator.buildActiveAccountBackup();
    const defaultPath = this.selectedAccount?.dataBackupFilePath ?? `${this.selectedAccount?.name}.json`;
    const savedFilePath = await this.backupGateway.chooseSavePath(defaultPath);
    if (!savedFilePath) { return; }
    await this.backupGateway.write(savedFilePath, this.backupFile);
    await this.automaticBackupsService.addOrUpdateFile(this.backupFile.dataBackupId, this.selectedAccount.guid);
    const updatedAccount: IdbAccount = {
      ...this.selectedAccount,
      dataBackupFilePath: savedFilePath,
      dataBackupId: this.backupFile.dataBackupId
    };
    await this.commandBoundary.execute(
      { entityKind: 'account', changeKind: 'update', entityGuid: updatedAccount.guid, label: 'Updating account' },
      () => this.accountHandler.update(updatedAccount, updatedAccount.guid)
    );
    await this.automaticBackupsService.inspectCurrentAccountFile();
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

  async backupAccount() {
    await this.backupExportCoordinator.exportActiveAccount({ downloadAsZip: this.downloadAsZip });
  }
}
