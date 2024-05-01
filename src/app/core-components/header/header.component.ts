import { Component, ElementRef, Input, OnInit } from '@angular/core';
import { Router, Event, NavigationStart } from '@angular/router';
import { AccountdbService } from "../../indexedDB/account-db.service";
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db.service";
import { IdbAccount } from 'src/app/models/idb';
import { Subscription, firstValueFrom } from 'rxjs';
import * as _ from 'lodash';
import { ImportBackupModalService } from '../import-backup-modal/import-backup-modal.service';
import { environment } from 'src/environments/environment';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { LoadingService } from '../loading/loading.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ElectronService } from 'src/app/electron/electron.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
})
export class HeaderComponent implements OnInit {
  @Input()
  dataInitialized: boolean;

  version: string = environment.version;
  isProduction: boolean = environment.production;
  accountList: Array<IdbAccount>;
  activeAccount: IdbAccount;

  allAccountsSub: Subscription;
  selectedAccountSub: Subscription;
  showSearch: boolean = false;
  lastBackupDate: Date;
  resetDatabase: boolean = false;

  updateAvailableSub: Subscription;
  updateAvailable: boolean;
  showUpdateModal: boolean = false;
  updateErrorSub: Subscription;
  updateError: boolean;
  constructor(
    private router: Router,
    public accountdbService: AccountdbService,
    public facilitydbService: FacilitydbService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterGroupdbService: UtilityMeterGroupdbService,
    public utilityMeterDatadbService: UtilityMeterDatadbService,
    private importBackupModalService: ImportBackupModalService,
    private backupDataService: BackupDataService,
    private loadingService: LoadingService,
    private dbChangesService: DbChangesService,
    private electronService: ElectronService,
    private toastNotificationService: ToastNotificationsService
  ) {
  }

  ngOnInit() {
    this.allAccountsSub = this.accountdbService.allAccounts.subscribe(allAccounts => {
      this.accountList = allAccounts.filter(account => { return !account.deleteAccount });
    });

    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(selectedAccount => {
      this.resetDatabase = false;
      this.activeAccount = selectedAccount;
      if (selectedAccount) {
        this.lastBackupDate = selectedAccount.lastBackup;
      } else {
        this.lastBackupDate = undefined;
      }
    });

    if (this.electronService.isElectron) {
      this.updateAvailableSub = this.electronService.updateAvailable.subscribe(val => {
        this.updateAvailable = val;
      });
      this.updateErrorSub = this.electronService.updateError.subscribe(val => {
        this.updateError = val;
      });
    }
  }

  ngOnDestroy() {
    this.allAccountsSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
    if (this.updateAvailableSub) {
      this.updateAvailableSub.unsubscribe();
    }
    if (this.updateErrorSub) {
      this.updateErrorSub.unsubscribe();
    }
  }

  addNewAccount() {
    this.router.navigateByUrl('/setup-wizard');
  }

  async switchAccount(account: IdbAccount) {
    if (!account.deleteAccount) {
      this.loadingService.setLoadingMessage("Switching accounts...");
      this.loadingService.setLoadingStatus(true);
      try {
        await this.dbChangesService.selectAccount(account, false);
        this.loadingService.setLoadingStatus(false);
        this.router.navigate(['/']);
      } catch (err) {
        this.toastNotificationService.showToast('An Error Occured', 'There was an error when trying to switch to ' + account.name + '. The action was unable to be completed.', 15000, false, 'alert-danger');
        this.loadingService.setLoadingStatus(false);
        this.router.navigate(['/manage-accounts']);
      }
    }
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
  }

  async backupAccount() {
    this.backupDataService.backupAccount();
    let selectedAccount: IdbAccount = this.accountdbService.selectedAccount.getValue();
    selectedAccount.lastBackup = new Date();
    await firstValueFrom(this.accountdbService.updateWithObservable(selectedAccount));
    this.accountdbService.selectedAccount.next(selectedAccount);
  }

  async deleteDatabase() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Resetting Database, if this takes too long restart application..');
    this.accountdbService.deleteDatabase();
  }

  toggleResetDatabase() {
    this.resetDatabase = !this.resetDatabase;
  }

  openBackupModal() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
  }

  update() {
    this.showUpdateModal = false;
    this.loadingService.setLoadingMessage('Downloading update. Application will close when download is completed. This may take a moment.');
    this.loadingService.setLoadingStatus(true);
    this.electronService.sendUpdateSignal();
  }

  toggleUpdateModal() {
    this.showUpdateModal = !this.showUpdateModal;
  }

  goToManageAccounts() {
    this.router.navigate(['/manage-accounts']);
  }
}
