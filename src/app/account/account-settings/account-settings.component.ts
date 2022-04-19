import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { OverviewReportOptionsDbService } from 'src/app/indexedDB/overview-report-options-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbFacility, IdbOverviewReportOptions } from 'src/app/models/idb';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.css']
})
export class AccountSettingsComponent implements OnInit {

  facilityList: Array<IdbFacility> = [];
  facilityMenuOpen: number;
  showDeleteAccount: boolean;
  facilityToEdit: IdbFacility;
  facilityToDelete: IdbFacility;

  selectedAccountSub: Subscription;
  accountFacilitiesSub: Subscription;
  selectedAccount: IdbAccount;
  constructor(
    private router: Router,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private loadingService: LoadingService,
    private backupDataService: BackupDataService,
    private analysisDbService: AnalysisDbService,
    private overviewReportOptionsDbService: OverviewReportOptionsDbService,
    private importBackupModalService: ImportBackupModalService,
    private toastNotificationService: ToastNotificationsService,
    private accountAnalysisDbService: AccountAnalysisDbService
  ) { }

  ngOnInit() {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
    });

    this.accountFacilitiesSub = this.facilityDbService.accountFacilities.subscribe(val => {
      this.facilityList = val;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.accountFacilitiesSub.unsubscribe();
  }

  switchFacility(facility: IdbFacility) {
    this.facilityDbService.selectedFacility.next(facility);
    this.router.navigateByUrl('facility/' + facility.id + '/settings');
  }

  async addNewFacility() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Creating Facility...');
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let idbFacility: IdbFacility = this.facilityDbService.getNewIdbFacility(selectedAccount);
    let newFacility: IdbFacility = await this.facilityDbService.addWithObservable(idbFacility).toPromise();
    this.loadingService.setLoadingMessage('Updating Reports...');
    let overviewReportOptions: Array<IdbOverviewReportOptions> = this.overviewReportOptionsDbService.accountOverviewReportOptions.getValue();
    for (let index = 0; index < overviewReportOptions.length; index++) {
      overviewReportOptions[index].reportOptions.facilities.push({
        facilityId: newFacility.id,
        selected: false
      });
      await this.overviewReportOptionsDbService.updateWithObservable(overviewReportOptions[index]).toPromise();
    }
    this.loadingService.setLoadingMessage('Updating Analysis Items...');
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for(let index = 0; index < accountAnalysisItems.length; index++){
      accountAnalysisItems[index].facilityAnalysisItems.push({
        facilityId: newFacility.id,
        analysisItemId: undefined
      });
    }

    this.facilityDbService.setAccountFacilities();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('New Facility Added!', undefined, undefined, false, 'success');
  }


  async facilityDelete() {
    this.loadingService.setLoadingStatus(true);

    // Delete all info associated with account
    this.loadingService.setLoadingMessage("Deleting Facility Predictors...");
    await this.predictorDbService.deleteAllFacilityPredictors(this.facilityToDelete.id);
    this.loadingService.setLoadingMessage("Deleting Facility Meter Data...");
    await this.utilityMeterDataDbService.deleteAllFacilityMeterData(this.facilityToDelete.id);
    this.loadingService.setLoadingMessage("Deleting Facility Meters...");
    await this.utilityMeterDbService.deleteAllFacilityMeters(this.facilityToDelete.id);
    this.loadingService.setLoadingMessage("Deleting Facility Meter Groups...");
    await this.utilityMeterGroupDbService.deleteAllFacilityMeterGroups(this.facilityToDelete.id);
    this.loadingService.setLoadingMessage("Updating Reports...")
    await this.overviewReportOptionsDbService.updateReportsRemoveFacility(this.facilityToDelete.id);
    this.loadingService.setLoadingMessage("Deleting Analysis Items...")
    await this.analysisDbService.deleteAllFacilityAnalysisItems(this.facilityToDelete.id);
    this.loadingService.setLoadingMessage('Updating Analysis Items...');
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let index = 0; index < accountAnalysisItems.length; index++) {
      accountAnalysisItems[index].facilityAnalysisItems = accountAnalysisItems[index].facilityAnalysisItems.filter(facilityItem => { return facilityItem.facilityId != this.facilityToDelete.id });
      await this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[index]).toPromise();
    }

    this.loadingService.setLoadingMessage('Updating Reports...');
    let overviewReportOptions: Array<IdbOverviewReportOptions> = this.overviewReportOptionsDbService.accountOverviewReportOptions.getValue();
    for (let index = 0; index < overviewReportOptions.length; index++) {
      overviewReportOptions[index].reportOptions.facilities = overviewReportOptions[index].reportOptions.facilities.filter(reportFacility => { return reportFacility.facilityId != this.facilityToDelete.id });
      await this.overviewReportOptionsDbService.updateWithObservable(overviewReportOptions[index]).toPromise();
    }

    this.loadingService.setLoadingMessage("Deleting Facility...");
    await this.facilityDbService.deleteFacilitiesAsync([this.facilityToDelete]);
    let allFacilities: Array<IdbFacility> = await this.facilityDbService.getAll().toPromise();
    // Then navigate to another facility
    this.facilityDbService.allFacilities.next(allFacilities);
    let accountFacilites: Array<IdbFacility> = allFacilities.filter(facility => { return facility.accountId == this.selectedAccount.id });
    this.facilityDbService.accountFacilities.next(accountFacilites);
    this.facilityDbService.setSelectedFacility();
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Facility Deleted!', undefined, undefined, false, 'success');
  }

  async confirmAccountDelete() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();

    this.loadingService.setLoadingStatus(true);

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
    await this.overviewReportOptionsDbService.deleteAccountReports();
    this.loadingService.setLoadingMessage("Deleting Analysis Items...")
    await this.analysisDbService.deleteAccountAnalysisItems();
    await this.accountAnalysisDbService.deleteAccountAnalysisItems();

    let allFacilities: Array<IdbFacility> = await this.facilityDbService.getAll().toPromise();
    // Then navigate to another facility
    this.facilityDbService.allFacilities.next(allFacilities);
    this.facilityDbService.accountFacilities.next([]);
    this.facilityDbService.setSelectedFacility();

    this.loadingService.setLoadingMessage("Deleting Account...");
    await this.accountDbService.deleteAccountWithObservable(selectedAccount.id).toPromise();

    // Then navigate to another account
    let accounts: Array<IdbAccount> = await this.accountDbService.getAll().toPromise();
    this.accountDbService.allAccounts.next(accounts);
    if (accounts.length != 0) {
      this.accountDbService.setSelectedAccount(accounts[0].id);
      this.router.navigate(['/']);
    } else {
      this.accountDbService.setSelectedAccount(undefined);
      this.router.navigateByUrl('/setup-wizard');
    }
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Account Deleted!', undefined, undefined, false, 'success');
  }

  setDeleteFacilityEntry(facility: IdbFacility) {
    this.facilityToDelete = facility;
  }

  closeEditFacility() {
    this.facilityToEdit = undefined;
  }

  editAccount() {
    this.showDeleteAccount = true;
  }

  async confirmFacilityDelete() {
    await this.facilityDelete();
    this.facilityToDelete = undefined;
  }

  cancelAccountDelete() {
    this.showDeleteAccount = undefined;
  }

  cancelFacilityDelete() {
    this.facilityToDelete = undefined;
  }

  backupAccount() {
    this.backupDataService.backupAccount();
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
  }


  //TODO: Add button
  async deleteDatabase() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Resetting Database, if this takes too long restart application..');
    this.accountDbService.deleteDatabase();
  }
}
