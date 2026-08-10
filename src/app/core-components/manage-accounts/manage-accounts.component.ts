import { toObservable } from '@angular/core/rxjs-interop';
import { Component, Injector } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { LoadingService } from '../loading/loading.service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from 'src/app/account-workspace/handlers/account-command-handler.service';
import { Router } from '@angular/router';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { getNewIdbAccount, IdbAccount } from 'src/app/models/idbModels/account';
import { ExportToExcelTemplateV3Service } from 'src/app/shared/helper-services/export-to-excel-template-v3.service';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';
import { DatabaseResetService } from 'src/app/application-lifecycle/database-reset.service';
import { BackupExportCoordinator } from 'src/app/backup/backup-export-coordinator.service';

@Component({
  selector: 'app-manage-accounts',
  templateUrl: './manage-accounts.component.html',
  styleUrls: ['./manage-accounts.component.css'],
  standalone: false
})
export class ManageAccountsComponent {
  accounts: Array<IdbAccount>;
  accountErrors: Array<string>;

  showDeleteAccount: boolean = false;
  selectedAccount: IdbAccount;
  resetDatabase: boolean = false;
  allAccountsSub: Subscription;
  displayMoreHelp: boolean = false;
  account: IdbAccount;
  loadingSub: Subscription;
  showExportModal: boolean = false;
  includeWeatherData: boolean = false;
  constructor(private accountDbService: AccountdbService, private loadingService: LoadingService,
    private commandBoundary: WorkspaceCommandBoundary,
    private accountHandler: AccountCommandHandler,
    private router: Router,
    private toastNotificationService: ToastNotificationsService,
    private backupExportCoordinator: BackupExportCoordinator,
    private exportToExcelTemplateV3Service: ExportToExcelTemplateV3Service,
    private accountWorkspaceService: AccountWorkspaceService,
    private applicationLifecycleService: ApplicationLifecycleService,
    private databaseResetService: DatabaseResetService,
    private injector: Injector
  ) {
  }

  ngOnInit() {
    this.allAccountsSub = toObservable(this.applicationLifecycleService.accountCatalog, { injector: this.injector }).subscribe(accounts => {
      this.accounts = [...accounts];
      this.accountErrors = this.accounts.map(account => { return undefined });
    });

    this.loadingSub = this.loadingService.navigationAfterLoading.subscribe((context) => {
      if (context === 'export-facilities-to-excel') {
        this.exportToExcelTemplateV3Service.triggerExportDownload();
        this.showFacilityExportToast();
        this.loadingService.navigationAfterLoading.next(undefined);
      }
    });
  }

  ngOnDestroy() {
    this.allAccountsSub.unsubscribe();
    this.loadingSub.unsubscribe();
  }

  async setAccounts() {
    this.accounts = await firstValueFrom(this.accountDbService.getAll());
    this.accountErrors = this.accounts.map(account => { return undefined });
  }

  deleteAccount(account: IdbAccount) {
    this.showDeleteAccount = true;
    this.selectedAccount = account;
  }

  cancelAccountDelete() {
    this.showDeleteAccount = false;
    this.selectedAccount = undefined;
  }

  async backupAccount(account: IdbAccount) {
    this.loadingService.setLoadingMessage("Backing up accounts...");
    this.loadingService.setLoadingStatus(true);
    try {
      await this.backupExportCoordinator.exportAccountByGuid(account.guid);
      await this.accountHandler.update({ ...account, lastBackup: new Date() }, account.guid);
      this.accounts = [...await this.applicationLifecycleService.refreshAccountCatalog()];
      this.toastNotificationService.showToast(account.name + 'Backup Successful', undefined, undefined, false, 'alert-success');
    } catch (err) {
      this.toastNotificationService.showToast('An Error Occured', 'There was an error when trying to backup ' + account.name + '. The action was unable to be completed.', 15000, false, 'alert-danger');
    }

    this.loadingService.setLoadingStatus(false);
  }

  openExportModal(account: IdbAccount) {
    this.includeWeatherData = false;
    this.showExportModal = true;
    this.selectedAccount = account;
  }

  closeExportModal() {
    this.showExportModal = false;
    this.selectedAccount = undefined;
  }

  async exportToExcel(account: IdbAccount) {
    this.showExportModal = false;
    this.account = account;
    this.loadingService.setContext('export-facilities-to-excel');
    this.loadingService.setTitle('Exporting Facilities');
    this.exportToExcelTemplateV3Service.setExportFacilityDataMessages();
    this.loadingService.setCurrentLoadingIndex(0);
    try {
      await this.selectAccountWorkspace(account);
      this.exportToExcelTemplateV3Service.exportFacilityData(this.includeWeatherData);
    } catch (err) {
      this.loadingService.clearLoadingMessages();
      this.loadingService.setContext(undefined);
      this.loadingService.setTitle('');
      this.toastNotificationService.showToast('An Error Occured', 'There was an error when trying to backup ' + account.name + '. The action was unable to be completed.', 15000, false, 'alert-danger');
    }
  }

  showFacilityExportToast() {
    this.toastNotificationService.showToast(this.account.name + ' Backup Exported To Excel', undefined, undefined, false, 'alert-success');
  }

  async goToAccount(account: IdbAccount, index: number) {
    try {
      const result = await this.accountWorkspaceService.selectAccount(account.guid);
      if (result === 'published') {
        this.router.navigateByUrl('/data-evaluation/account/home');
      }
    } catch (err) {
      this.toastNotificationService.showToast('An Error Occured', 'There was an error when trying to switch to ' + account.name + '. The action was unable to be completed.', 15000, false, 'alert-danger');
      this.accountErrors[index] = err;
    }
  }

  async confirmAccountDelete() {
    this.showDeleteAccount = false;
    await this.commandBoundary.execute(
      { entityKind: 'account', changeKind: 'delete', entityGuid: this.selectedAccount.guid, label: 'Deleting account' },
      () => this.accountHandler.update({ ...this.selectedAccount, deleteAccount: true }, this.selectedAccount.guid)
    );
    this.accounts = [...await this.applicationLifecycleService.handleMarkedAccountDeletion(this.selectedAccount.guid)];
  }

  async deleteDatabase() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Resetting Database, if this takes too long restart application..');
    let success: boolean = await this.databaseResetService.resetAndRestart();
    if (!success) {
      this.loadingService.setLoadingStatus(false);
      this.toastNotificationService.showToast('An error occured', 'There was an error when trying to reset the database follow the instructions delete database manually.', undefined, false, 'alert-danger')
      this.showMoreHelp();
    }
  }

  toggleResetDatabase() {
    this.resetDatabase = !this.resetDatabase;
  }

  showMoreHelp() {
    this.displayMoreHelp = true;
  }

  hideMoreHelp() {
    this.displayMoreHelp = false;
  }

  async addNewAccount() {
    const account = await this.applicationLifecycleService.createAccount(getNewIdbAccount());
    this.router.navigateByUrl('/data-management/' + account.guid);
  }

  private async selectAccountWorkspace(account: IdbAccount): Promise<void> {
    const result = await this.accountWorkspaceService.selectAccount(account.guid);
    if (result !== 'published') {
      throw new Error('The requested account workspace was superseded before it could be loaded.');
    }
  }
}
