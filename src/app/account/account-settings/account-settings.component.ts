import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { BackupDataService, BackupFile } from 'src/app/shared/helper-services/backup-data.service';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountAnalysisDbService } from 'src/app/indexedDB/account-analysis-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ElectronService } from 'src/app/electron/electron.service';
import { AutomaticBackupsService } from 'src/app/electron/automatic-backups.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbAccountAnalysisItem } from 'src/app/models/idbModels/accountAnalysisItem';

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

  savedFilePath: string;
  savedFilePathSub: Subscription;
  updatingFilePath: boolean = false;
  isElectron: boolean;
  backupFile: BackupFile;
  constructor(
    private router: Router,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private loadingService: LoadingService,
    private backupDataService: BackupDataService,
    private importBackupModalService: ImportBackupModalService,
    private toastNotificationService: ToastNotificationsService,
    private dbChangesService: DbChangesService,
    private electronService: ElectronService,
    private cd: ChangeDetectorRef,
    private automaticBackupsService: AutomaticBackupsService,
  ) { }

  ngOnInit() {
    this.isElectron = this.electronService.isElectron;
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
    });

    this.accountFacilitiesSub = this.facilityDbService.accountFacilities.subscribe(val => {
      this.facilityList = val;
      this.setOrderOptions();
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
    this.accountFacilitiesSub.unsubscribe();
    if (this.savedFilePathSub) {
      this.savedFilePathSub.unsubscribe();
    }
  }

  switchFacility(facility: IdbFacility) {
    this.facilityDbService.selectedFacility.next(facility);
    this.router.navigateByUrl('facility/' + facility.id + '/settings');
  }

  async addNewFacility() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Creating Facility...');
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let idbFacility: IdbFacility = getNewIdbFacility(selectedAccount);
    let newFacility: IdbFacility = await firstValueFrom(this.facilityDbService.addWithObservable(idbFacility));
    await this.dbChangesService.updateDataNewFacility(newFacility);
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
    //this is bad code but the "sharedFileAuthor" field won't show unless I have the 
    //detectChanges() call..
    //#isWhatItIs
    await this.saveChanges();
    this.cd.detectChanges();
  }
}
