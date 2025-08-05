import { Component } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { LoadingService } from '../loading/loading.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { Router } from '@angular/router';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { getNewIdbAccount, IdbAccount } from 'src/app/models/idbModels/account';
import { ExportToExcelTemplateV3Service } from 'src/app/shared/helper-services/export-to-excel-template-v3.service';

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
  constructor(private accountDbService: AccountdbService, private loadingService: LoadingService,
    private dbChangesService: DbChangesService, private router: Router,
    private toastNotificationService: ToastNotificationsService,
    private backupDataService: BackupDataService,
    private exportToExcelTemplateV3Service: ExportToExcelTemplateV3Service
  ) {
  }

  ngOnInit() {
    this.accountDbService.selectedAccount.next(undefined);
    this.allAccountsSub = this.accountDbService.allAccounts.subscribe(accounts => {
      this.accounts = accounts;
      this.accountErrors = this.accounts.map(account => { return undefined });
    });
  }

  ngOnDestroy() {
    this.allAccountsSub.unsubscribe();
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
      await this.dbChangesService.selectAccount(account, true);
      this.backupDataService.backupAccount();
      account.lastBackup = new Date();
      await firstValueFrom(this.accountDbService.updateWithObservable(account));
      this.accounts = await firstValueFrom(this.accountDbService.getAll());
      this.toastNotificationService.showToast(account.name + 'Backup Successful', undefined, undefined, false, 'alert-success');
    } catch (err) {
      this.toastNotificationService.showToast('An Error Occured', 'There was an error when trying to backup ' + account.name + '. The action was unable to be completed.', 15000, false, 'alert-danger');
    }

    this.loadingService.setLoadingStatus(false);
  }

  async exportToExcel(account: IdbAccount) {
    this.loadingService.setLoadingMessage("Exporting Facilities...");
    this.loadingService.setLoadingStatus(true);
    try {
      await this.dbChangesService.selectAccount(account, true);
      this.exportToExcelTemplateV3Service.exportFacilityData();
      this.toastNotificationService.showToast(account.name + 'Backup Exported To Excel', undefined, undefined, false, 'alert-success');
    } catch (err) {
      this.toastNotificationService.showToast('An Error Occured', 'There was an error when trying to backup ' + account.name + '. The action was unable to be completed.', 15000, false, 'alert-danger');
    }
    this.loadingService.setLoadingStatus(false);
  }

  async goToAccount(account: IdbAccount, index: number) {
    this.loadingService.setLoadingMessage("Switching accounts...");
    this.loadingService.setLoadingStatus(true);
    try {
      await this.dbChangesService.selectAccount(account, false);
      this.loadingService.setLoadingStatus(false);
      this.router.navigateByUrl('/data-evaluation/account/home');
    } catch (err) {
      this.toastNotificationService.showToast('An Error Occured', 'There was an error when trying to switch to ' + account.name + '. The action was unable to be completed.', 15000, false, 'alert-danger');
      this.accountErrors[index] = err;
      this.loadingService.setLoadingStatus(false);
    }
  }

  async confirmAccountDelete() {
    this.showDeleteAccount = false;
    this.selectedAccount.deleteAccount = true;
    await firstValueFrom(this.accountDbService.updateWithObservable(this.selectedAccount));
    this.accounts = await firstValueFrom(this.accountDbService.getAll());
    this.accountDbService.allAccounts.next(this.accounts);
    this.accountDbService.selectedAccount.next(undefined);
  }

  async deleteDatabase() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Resetting Database, if this takes too long restart application..');
    let success: boolean = await this.accountDbService.deleteDatabase();
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
    let account: IdbAccount = getNewIdbAccount();
    account = await firstValueFrom(this.accountDbService.addWithObservable(account));
    let allAccounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
    this.accountDbService.allAccounts.next(allAccounts);
    await this.dbChangesService.selectAccount(account, false);
    this.router.navigateByUrl('/data-management/' + account.guid);
  }
}
