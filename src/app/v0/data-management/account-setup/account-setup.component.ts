import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { ChangeDetectorRef, Component, DestroyRef, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ImportBackupModalService } from '@v0/core-components/import-backup-modal/import-backup-modal.service';
import { AutomaticBackupsService } from '@platform/electron/automatic-backups.service';
import { ElectronService } from '@platform/electron/electron.service';
import { WorkspaceCommandBoundary } from '@data/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from '@data/account-workspace/handlers/account-command-handler.service';
import { IdbAccount } from '@data/models/idbModels/account';
import { ApplicationLifecycleService } from '@app/application-lifecycle/application-lifecycle.service';
import { BackupExportCoordinator } from '@data/backup/backup-export-coordinator.service';

@Component({
  selector: 'app-account-setup',
  templateUrl: './account-setup.component.html',
  styleUrl: './account-setup.component.css',
  standalone: false
})
export class AccountSetupComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly applicationLifecycleService = inject(ApplicationLifecycleService);
  private readonly destroyRef = inject(DestroyRef);


  showDeleteAccount: boolean = false;
  isElectron: boolean;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  downloadAsZip: boolean = false;
  constructor(private router: Router,
    private electronService: ElectronService,
    private backupExportCoordinator: BackupExportCoordinator,
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
    const configured = await this.automaticBackupsService.configureFile(this.selectedAccount, updatedAccount =>
      this.commandBoundary.execute(
        { entityKind: 'account', changeKind: 'update', entityGuid: updatedAccount.guid, label: 'Updating account',
          publication: { mode: 'patch', buildPatch: value => ({ account: value }) } },
        () => this.accountHandler.update(updatedAccount, updatedAccount.guid)
      )
    );
    if (configured && !this.destroyRef.destroyed) this.cd.detectChanges();
  }

  async saveChanges() {
    await this.commandBoundary.execute(
      { entityKind: 'account', changeKind: 'update', entityGuid: this.selectedAccount.guid, label: 'Saving account' ,
        publication: { mode: 'patch', buildPatch: value => ({ account: value }) }},
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
