import { Component } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';
import { LoadingService } from '../loading/loading.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { Router } from '@angular/router';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { ExportToExcelTemplateService } from 'src/app/shared/helper-services/export-to-excel-template.service';

@Component({
  selector: 'app-manage-accounts',
  templateUrl: './manage-accounts.component.html',
  styleUrls: ['./manage-accounts.component.css']
})
export class ManageAccountsComponent {

  accounts: Array<IdbAccount>;
  accountErrors: Array<string>;

  showDeleteAccount: boolean = false;
  selectedAccount: IdbAccount;
  resetDatabase: boolean = false;
  allAccountsSub: Subscription;
  constructor(private accountDbService: AccountdbService, private loadingService: LoadingService,
    private dbChangesService: DbChangesService, private router: Router,
    private toastNotificationService: ToastNotificationsService,
    private backupDataService: BackupDataService,
    private exportToExcelTemplateService: ExportToExcelTemplateService,
  ) {
  }

  ngOnInit() {
    this.accountDbService.selectedAccount.next(undefined);
    this.allAccountsSub = this.accountDbService.allAccounts.subscribe(accounts => {
      this.accounts = accounts;
      this.accountErrors = this.accounts.map(account => { return undefined });
      if (this.accounts.length == 0) {
        this.router.navigateByUrl('/setup-wizard');
      }
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
      this.exportToExcelTemplateService.exportFacilityData();
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
      this.router.navigate(['/']);
    } catch (err) {
      this.toastNotificationService.showToast('An Error Occured', 'There was an error when trying to switch to ' + account.name + '. The action was unable to be completed.', 15000, false, 'alert-danger');
      this.accountErrors[index] = err;
      this.loadingService.setLoadingStatus(false);
    }
  }

  async confirmAccountDelete() {

    this.showDeleteAccount = false;
    this.selectedAccount.deleteAccount = true;
    console.log('update with delete bool set...')
    await firstValueFrom(this.accountDbService.updateWithObservable(this.selectedAccount));
    this.accounts = await firstValueFrom(this.accountDbService.getAll());
    this.accountDbService.allAccounts.next(this.accounts);
    this.accountDbService.selectedAccount.next(undefined);
  }

  async deleteDatabase() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Resetting Database, if this takes too long restart application..');
    this.accountDbService.deleteDatabase();
  }

  toggleResetDatabase() {
    this.resetDatabase = !this.resetDatabase;
  }
}
