import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { AnalysisDbService } from 'src/app/indexedDB/analysis-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAccountReport, IdbFacility } from 'src/app/models/idb';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { AccountReportDbService } from 'src/app/indexedDB/account-report-db.service';
import { CustomEmissionsDbService } from 'src/app/indexedDB/custom-emissions-db.service';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { CustomGWPDbService } from 'src/app/indexedDB/custom-gwp-db.service';
import { DeleteDataService } from 'src/app/indexedDB/delete-data.service';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.css']
})
export class AccountSettingsComponent implements OnInit {

  facilityList: Array<IdbFacility> = [];
  facilityMenuOpen: number;
  showDeleteAccount: boolean;
  facilityToDelete: IdbFacility;

  selectedAccountSub: Subscription;
  accountFacilitiesSub: Subscription;
  selectedAccount: IdbAccount;
  displayDeleteFacility: boolean;
  orderOptions: Array<number>;
  displayApplyFacilitySettings: boolean;
  applySettingsOptions: {
    units: boolean,
    sustainabilityQuestions: boolean,
    financialReporting: boolean
  } = {
      units: true,
      sustainabilityQuestions: true,
      financialReporting: true
    };
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
    private accountReportDbService: AccountReportDbService,
    private importBackupModalService: ImportBackupModalService,
    private toastNotificationService: ToastNotificationsService,
    private accountAnalysisDbService: AccountAnalysisDbService,
    private dbChangesService: DbChangesService,
    private customEmissionsDbService: CustomEmissionsDbService,
    private customFuelDbService: CustomFuelDbService,
    private customGWPDbService: CustomGWPDbService
  ) { }

  ngOnInit() {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
    });

    this.accountFacilitiesSub = this.facilityDbService.accountFacilities.subscribe(val => {
      this.facilityList = val;
      this.setOrderOptions();
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
    let newFacility: IdbFacility = await firstValueFrom(this.facilityDbService.addWithObservable(idbFacility));
    this.loadingService.setLoadingMessage('Updating Reports...');
    let accountReports: Array<IdbAccountReport> = this.accountReportDbService.accountReports.getValue();
    for (let index = 0; index < accountReports.length; index++) {
      accountReports[index].dataOverviewReportSetup.includedFacilities.push({
        facilityId: newFacility.guid,
        included: false
      });
      await firstValueFrom(this.accountReportDbService.updateWithObservable(accountReports[index]));
    }
    this.loadingService.setLoadingMessage('Updating Analysis Items...');
    let accountAnalysisItems: Array<IdbAccountAnalysisItem> = this.accountAnalysisDbService.accountAnalysisItems.getValue();
    for (let index = 0; index < accountAnalysisItems.length; index++) {
      accountAnalysisItems[index].facilityAnalysisItems.push({
        facilityId: newFacility.guid,
        analysisItemId: undefined
      });
      await firstValueFrom(this.accountAnalysisDbService.updateWithObservable(accountAnalysisItems[index]));
    }

    await this.dbChangesService.selectAccount(this.selectedAccount, false);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('New Facility Added!', undefined, undefined, false, 'alert-success');
    this.router.navigateByUrl('/facility/' + newFacility.id + '/settings');
  }


  async facilityDelete() {
    await this.dbChangesService.deleteFacility(this.facilityToDelete, this.selectedAccount);
  }

  async confirmAccountDelete() {
    this.showDeleteAccount = false;
    this.selectedAccount.deleteAccount = true;
    await firstValueFrom(this.accountDbService.updateWithObservable(this.selectedAccount));
    let accounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
    this.accountDbService.allAccounts.next(accounts);
    let nonDeleteAccounts: Array<IdbAccount> = accounts.filter(acc => {
      return acc.deleteAccount == false;
    })
    if (nonDeleteAccounts.length != 0) {
      this.accountDbService.selectedAccount.next(undefined);
      this.router.navigateByUrl('/manage-accounts');
    } else {
      this.accountDbService.selectedAccount.next(undefined);
      this.router.navigateByUrl('/setup-wizard');
    }
  }

  setDeleteFacilityEntry(facility: IdbFacility) {
    this.facilityToDelete = facility;
    this.displayDeleteFacility = true;
  }

  editAccount() {
    this.showDeleteAccount = true;
  }

  async confirmFacilityDelete() {
    this.displayDeleteFacility = false;
    await this.facilityDelete();
    this.facilityToDelete = undefined;
  }

  cancelAccountDelete() {
    this.showDeleteAccount = undefined;
  }

  cancelFacilityDelete() {
    this.displayDeleteFacility = false;
    this.facilityToDelete = undefined;
  }

  backupAccount() {
    this.backupDataService.backupAccount();
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
  }

  setOrderOptions() {
    let orderOptions: Array<number> = new Array();
    let index: number = 1;
    this.facilityList.forEach(item => {
      orderOptions.push(index);
      index++;
    })
    this.orderOptions = orderOptions;
  }

  async setFacilityOrder(facility: IdbFacility) {
    await this.dbChangesService.updateFacilities(facility, false);
    for (let i = 0; i < this.facilityList.length; i++) {
      if (this.facilityList[i].guid != facility.guid) {
        if (this.facilityList[i].facilityOrder && this.facilityList[i].facilityOrder == facility.facilityOrder) {
          this.facilityList[i].facilityOrder = undefined;
          await this.dbChangesService.updateFacilities(this.facilityList[i], false);
        }
      }
    };
  }

  openApplySettingsModal() {
    this.displayApplyFacilitySettings = true;
  }

  async applySettingsToFacility() {
    this.closeApplySettingsModel();
    this.loadingService.setLoadingMessage('Updating Facilities...');
    this.loadingService.setLoadingStatus(true);
    let accountCopy: IdbAccount = JSON.parse(JSON.stringify(this.selectedAccount))
    for (let i = 0; i < this.facilityList.length; i++) {
      let facility: IdbFacility = this.facilityList[i];
      if (this.applySettingsOptions.units) {
        facility.unitsOfMeasure = accountCopy.unitsOfMeasure;
        facility.energyUnit = accountCopy.energyUnit;
        facility.massUnit = accountCopy.massUnit;
        facility.volumeLiquidUnit = accountCopy.volumeLiquidUnit;
        facility.volumeGasUnit = accountCopy.volumeGasUnit;
        facility.energyIsSource = accountCopy.energyIsSource;
        facility.electricityUnit = accountCopy.electricityUnit;
      }
      if (this.applySettingsOptions.financialReporting) {
        facility.fiscalYear = accountCopy.fiscalYear;
        facility.fiscalYearMonth = accountCopy.fiscalYearMonth;
        facility.fiscalYearCalendarEnd = accountCopy.fiscalYearCalendarEnd;
      }
      if (this.applySettingsOptions.sustainabilityQuestions) {
        facility.sustainabilityQuestions = accountCopy.sustainabilityQuestions
      }
      await this.dbChangesService.updateFacilities(facility, false);
    }
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Facility Settings Updated!', undefined, undefined, false, "alert-success");
  }


  closeApplySettingsModel() {
    this.displayApplyFacilitySettings = false;
  }
}
