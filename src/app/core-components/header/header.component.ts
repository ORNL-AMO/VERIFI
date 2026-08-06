import { toObservable } from '@angular/core/rxjs-interop';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';
import { DatabaseResetService } from 'src/app/application-lifecycle/database-reset.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { AccountdbService } from "../../indexedDB/account-db.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db.service";
import { Subscription, firstValueFrom } from 'rxjs';
import { ImportBackupModalService } from '../import-backup-modal/import-backup-modal.service';
import { environment } from 'src/environments/environment';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { LoadingService } from '../loading/loading.service';
import { ElectronService } from 'src/app/electron/electron.service';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { AutomaticBackupsService } from 'src/app/electron/automatic-backups.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  standalone: false
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
  resetDatabase: boolean = false;

  updateAvailableSub: Subscription;
  updateAvailable: boolean;
  showUpdateModal: boolean = false;
  updateErrorSub: Subscription;
  updateError: boolean;

  savingBackup: boolean;
  savingBackupSub: Subscription;

  inDataEvaluation: boolean = false;
  displayToggle: boolean = false;
  constructor(
    private router: Router,
    public accountdbService: AccountdbService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterGroupdbService: UtilityMeterGroupdbService,
    public utilityMeterDatadbService: UtilityMeterDatadbService,
    private importBackupModalService: ImportBackupModalService,
    private backupDataService: BackupDataService,
    private loadingService: LoadingService,
    private accountWorkspaceService: AccountWorkspaceService,
    private electronService: ElectronService,
    private toastNotificationService: ToastNotificationsService,
    private cd: ChangeDetectorRef,
    private automaticBackupService: AutomaticBackupsService,
    private databaseResetService: DatabaseResetService,
    private applicationLifecycleService: ApplicationLifecycleService,
    private accountWorkspaceStore: AccountWorkspaceStore

  ) {
  }

  ngOnInit() {
    this.allAccountsSub = toObservable(this.applicationLifecycleService.accountCatalog).subscribe(allAccounts => {
      this.accountList = allAccounts.filter(account => { return !account.deleteAccount });
    });

    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account).subscribe(selectedAccount => {
      this.resetDatabase = false;
      this.activeAccount = selectedAccount;
      this.cd.detectChanges();
    });

    if (this.electronService.isElectron) {
      this.updateAvailableSub = this.electronService.updateAvailable.subscribe(val => {
        this.updateAvailable = val;
      });
      this.updateErrorSub = this.electronService.updateError.subscribe(val => {
        this.updateError = val;
      });
      this.savingBackupSub = this.automaticBackupService.saving.subscribe(val => {
        this.savingBackup = val;
        this.cd.detectChanges();
      })
    }

    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setInDashboard(event.urlAfterRedirects);
      }
    });
    this.setInDashboard(this.router.url);
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
    if (this.savingBackupSub) {
      this.savingBackupSub.unsubscribe();
    }
  }

  async addNewAccount() {
    // let account: IdbAccount = getNewIdbAccount();
    // account = await firstValueFrom(this.accountdbService.addWithObservable(account));
    // let accounts: Array<IdbAccount> = await firstValueFrom(this.accountdbService.getAll());
    // this.accountdbService.allAccounts.next(accounts);
    this.router.navigateByUrl('/welcome');
  }

  async switchAccount(account: IdbAccount) {
    try {
      await this.accountWorkspaceService.selectAccount(account.guid);
      if (this.inDataEvaluation) {
        this.goToDashboard(true);
      } else {
        this.goToDataEntry(true);
      }
    } catch (err) {
      this.toastNotificationService.showToast('An Error Occured', 'There was an error when trying to switch to ' + account.name + '. The action was unable to be completed.', 15000, false, 'alert-danger');
      this.router.navigate(['/manage-accounts']);
    }
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
  }

  async backupAccount() {
    this.backupDataService.backupAccount();
    const selectedAccount = this.accountWorkspaceStore.account();
    if (!selectedAccount) { return; }
    await firstValueFrom(this.accountdbService.updateWithObservable({
      ...selectedAccount,
      lastBackup: new Date()
    }));
    await this.applicationLifecycleService.refreshAccountCatalog();
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
  }

  async deleteDatabase() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Resetting Database, if this takes too long restart application..');
    await this.databaseResetService.resetAndRestart();
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

  checkLatestFile() {
    this.automaticBackupService.forceModal = true;
    this.electronService.getDataFile(this.activeAccount.dataBackupFilePath);
  }

  goHome() {
    this.router.navigate(['/welcome']);
  }

  setInDashboard(url: string) {
    this.inDataEvaluation = url.includes('data-management') == false;
    this.displayToggle = url.includes('welcome') == false;
  }

  goToDataEntry(forceNavigation: boolean = false) {
    if (this.inDataEvaluation || forceNavigation) {
      let url: string = this.router.url;
      if (url.includes('facility')) {
        let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
        if(selectedFacility){
          this.router.navigateByUrl(`/data-management/${this.activeAccount.guid}/facilities/${selectedFacility.guid}`)
        }else{
          this.router.navigateByUrl(`/data-management/${this.activeAccount.guid}`)
        }
      } else if (url.includes('weather-data')) {
        this.router.navigateByUrl('/data-management/' + this.activeAccount.guid + '/weather-data');
      } else if (url.includes('custom-data')) {
        if (url.includes('emissions')) {
          this.router.navigateByUrl('/data-management/' + this.activeAccount.guid + '/account-custom-data/custom-grid-factors');
        } else if (url.includes('fuels')) {
          this.router.navigateByUrl('/data-management/' + this.activeAccount.guid + '/account-custom-data/custom-fuels');
        } else if (url.includes('gwp')) {
          this.router.navigateByUrl('/data-management/' + this.activeAccount.guid + '/account-custom-data/custom-gwps');
        }
      } else {
        this.router.navigateByUrl('/data-management/' + this.activeAccount.guid)
      }
    }
  }

  goToDashboard(forceNavigation: boolean = false) {
    if (!this.inDataEvaluation || forceNavigation) {
      let url: string = this.router.url;
      if (url.includes('facilities')) {
        let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
        if (selectedFacility) {
          this.router.navigateByUrl('/data-evaluation/facility/' + selectedFacility.guid);
        } else {
          this.router.navigateByUrl('/data-evaluation/account')
        }
      } else if (url.includes('weather-data')) {
        this.router.navigateByUrl('/data-evaluation/weather-data');
      } else if (url.includes('account-custom-data')) {
        if (url.includes('custom-grid-factors')) {
          this.router.navigateByUrl('/data-evaluation/account/custom-data/emissions');
        } else if (url.includes('custom-fuels')) {
          this.router.navigateByUrl('/data-evaluation/account/custom-data/fuels');
        } else if (url.includes('custom-gwps')) {
          this.router.navigateByUrl('/data-evaluation/account/custom-data/gwp');
        }
      } else {
        this.router.navigateByUrl('/data-evaluation/account')
      }
    }
  }
}
