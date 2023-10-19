import { Component } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';
import { LoadingService } from '../loading/loading.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { Router } from '@angular/router';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { ExportToExcelTemplateService } from 'src/app/shared/helper-services/export-to-excel-template.service';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';

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
  constructor(private accountDbService: AccountdbService, private loadingService: LoadingService,
    private dbChangesService: DbChangesService, private router: Router,
    private toastNotificationService: ToastNotificationsService,
    private predictorDbService: PredictordbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private facilityDbService: FacilitydbService,
    private accountReportDbService: AccountReportDbService,
    private analysisDbService: AnalysisDbService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private backupDataService: BackupDataService,
    private exportToExcelTemplateService: ExportToExcelTemplateService,
    private customEmissionsDbService: CustomEmissionsDbService,
    private customFuelDbService: CustomFuelDbService
  ) {
  }

  ngOnInit() {
    this.accountDbService.selectedAccount.next(undefined);
    this.setAccounts();
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
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Fetching account data...')
    await this.dbChangesService.selectAccount(this.selectedAccount, true);
    // Delete all info associated with account
    this.loadingService.setLoadingMessage("Deleting Account Predictors...");
    await this.predictorDbService.deleteAllSelectedAccountPredictors();
    this.loadingService.setLoadingMessage("Deleting Account Meter Data...");
    await this.utilityMeterDataDbService.deleteAllSelectedAccountMeterData();
    this.loadingService.setLoadingMessage("Deleting Account Meters...");
    await this.utilityMeterDbService.deleteAllSelectedAccountMeters();
    this.loadingService.setLoadingMessage("Deleting Account Meter Groups...");
    await this.utilityMeterGroupDbService.deleteAllSelectedAccountMeterGroups();
    this.loadingService.setLoadingMessage("Deleting Account Facilities...");
    await this.facilityDbService.deleteAllSelectedAccountFacilities();
    this.loadingService.setLoadingMessage("Deleting Reports...")
    await this.accountReportDbService.deleteAccountReports();
    this.loadingService.setLoadingMessage("Deleting Analysis Items...")
    await this.analysisDbService.deleteAccountAnalysisItems();
    await this.accountAnalysisDbService.deleteAccountAnalysisItems();
    this.loadingService.setLoadingMessage("Deleting Custom Emissions...")
    await this.customEmissionsDbService.deleteAccountEmissionsItems();
    this.loadingService.setLoadingMessage("Deleting Custom Fuels...")
    await this.customFuelDbService.deleteAccountCustomFuels();   
    this.loadingService.setLoadingMessage("Deleting Account...");
    await firstValueFrom(this.accountDbService.deleteAccountWithObservable(this.selectedAccount.id));
    this.accounts = await firstValueFrom(this.accountDbService.getAll());
    this.accountDbService.allAccounts.next(this.accounts);
    this.accountDbService.selectedAccount.next(undefined);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Account Deleted!', undefined, undefined, false, 'alert-success');
    if (this.accounts.length == 0) {
      this.router.navigateByUrl('/setup-wizard');
    }
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
