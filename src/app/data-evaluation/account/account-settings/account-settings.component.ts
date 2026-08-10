import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { ChangeDetectorRef, Component, OnInit, inject, Injector } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, skip, take } from 'rxjs';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { ToastNotificationsService } from 'src/app/core-components/toast-notifications/toast-notifications.service';
import { WorkspaceCommandBoundary } from 'src/app/account-workspace/workspace-command-boundary.service';
import { AccountCommandHandler } from 'src/app/account-workspace/handlers/account-command-handler.service';
import { FacilityCommandHandler } from 'src/app/account-workspace/handlers/facility-command-handler.service';
import { FACILITY_DELETION_MESSAGES } from 'src/app/indexedDB/facility-deletion.config';
import { ElectronService } from 'src/app/electron/electron.service';
import { AutomaticBackupsService } from 'src/app/electron/automatic-backups.service';
import { ElectronBackupFileGateway } from 'src/app/electron/electron-backup-file.gateway';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { getNewIdbFacility, IdbFacility } from 'src/app/models/idbModels/facility';
import { BackupFile } from 'src/app/models/backup-file';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';
import { BackupExportCoordinator } from 'src/app/backup/backup-export-coordinator.service';

@Component({
  selector: 'app-account-settings',
  templateUrl: './account-settings.component.html',
  styleUrls: ['./account-settings.component.css'],
  standalone: false
})
export class AccountSettingsComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly applicationLifecycleService = inject(ApplicationLifecycleService);

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

  isElectron: boolean;
  backupFile: BackupFile;
  folderPath: string;
  folderError: string;
  downloadAsZip: boolean = false;
  constructor(
    private router: Router,
    private loadingService: LoadingService,
    private backupExportCoordinator: BackupExportCoordinator,
    private importBackupModalService: ImportBackupModalService,
    private toastNotificationService: ToastNotificationsService,
    private commandBoundary: WorkspaceCommandBoundary,
    private accountHandler: AccountCommandHandler,
    private facilityHandler: FacilityCommandHandler,
    private electronService: ElectronService,
    private backupGateway: ElectronBackupFileGateway,
    private cd: ChangeDetectorRef,
    private automaticBackupsService: AutomaticBackupsService,
    private injector: Injector
  ) { }

  ngOnInit() {
    this.isElectron = this.electronService.isElectron;
    this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(val => {
      this.selectedAccount = val;
    });

    this.accountFacilitiesSub = toObservable(this.accountWorkspaceStore.facilities, { injector: this.injector }).subscribe(val => {
      this.facilityList = val.map(facility => ({ ...facility }));
      this.setOrderOptions();
    });
    if (this.isElectron) {
      this.electronService.getFolderPath().subscribe(path => {
        this.folderPath = path;
        this.cd.detectChanges();
      });
    }
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.accountFacilitiesSub.unsubscribe();
  }

  switchFacility(facility: IdbFacility) {
    this.accountWorkspaceService.selectFacility(facility.guid);
    this.router.navigateByUrl('/data-evaluation/facility/' + facility.guid + '/settings');
  }

  async addNewFacility() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Creating Facility...');
    const selectedAccount: IdbAccount = this.accountWorkspaceStore.account();
    const idbFacility: IdbFacility = getNewIdbFacility(selectedAccount);
    const result = await this.commandBoundary.execute(
      { entityKind: 'facility', changeKind: 'add', label: 'Adding facility' },
      () => this.facilityHandler.add(
        idbFacility,
        selectedAccount.guid,
        this.accountWorkspaceStore.accountAnalyses(),
        this.accountWorkspaceStore.accountReports()
      )
    );
    const newFacility = result.value.facility;
    this.accountWorkspaceService.selectFacility(newFacility.guid);
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('New Facility Added!', undefined, undefined, false, 'alert-success');
    this.router.navigateByUrl('/data-evaluation/facility/' + newFacility.guid + '/settings');
  }


  async facilityDelete() {
    for (const message of FACILITY_DELETION_MESSAGES) {
      this.loadingService.addLoadingMessage(message);
    }
    this.loadingService.setContext('delete-facility');
    this.loadingService.setTitle('Deleting Facility');
    await this.commandBoundary.execute(
      { entityKind: 'facility', changeKind: 'delete', entityGuid: this.facilityToDelete.guid, label: 'Deleting facility' },
      () => this.facilityHandler.delete(this.facilityToDelete, this.selectedAccount.guid, phase => {
        this.loadingService.setCurrentLoadingIndex(phase.index);
      })
    );
    this.loadingService.isLoadingComplete.next(true);
  }

  async confirmAccountDelete() {
    this.showDeleteAccount = false;
    await this.commandBoundary.execute(
      { entityKind: 'account', changeKind: 'delete', entityGuid: this.selectedAccount.guid, label: 'Deleting account' },
      () => this.accountHandler.update({ ...this.selectedAccount, deleteAccount: true }, this.selectedAccount.guid)
    );
    const accounts = await this.applicationLifecycleService.handleMarkedAccountDeletion(this.selectedAccount.guid);
    let nonDeleteAccounts: Array<IdbAccount> = accounts.filter(acc => {
      return acc.deleteAccount == false;
    })
    if (nonDeleteAccounts.length != 0) {
      this.router.navigateByUrl('/manage-accounts');
    } else {
      this.router.navigateByUrl('/welcome');
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

  async backupAccount() {
    await this.backupExportCoordinator.exportActiveAccount({ downloadAsZip: this.downloadAsZip });
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
  }

  setOrderOptions() {
    let orderOptions: Array<number> = new Array();
    let index: number = 1;
    this.facilityList.forEach(() => {
      orderOptions.push(index);
      index++;
    })
    this.orderOptions = orderOptions;
  }

  async setFacilityOrder(facility: IdbFacility) {
    const activeAccountGuid = this.accountWorkspaceStore.account()?.guid;
    await this.commandBoundary.execute(
      { entityKind: 'facility', changeKind: 'update', entityGuid: facility.guid, label: 'Updating facility order' },
      () => this.facilityHandler.update(facility, activeAccountGuid)
    );
    for (let i = 0; i < this.facilityList.length; i++) {
      if (this.facilityList[i].guid != facility.guid) {
        if (this.facilityList[i].facilityOrder && this.facilityList[i].facilityOrder == facility.facilityOrder) {
          this.facilityList[i].facilityOrder = undefined;
          await this.commandBoundary.execute(
            { entityKind: 'facility', changeKind: 'update', entityGuid: this.facilityList[i].guid, label: 'Updating facility order' },
            () => this.facilityHandler.update(this.facilityList[i], activeAccountGuid)
          );
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
      await this.commandBoundary.execute(
        { entityKind: 'facility', changeKind: 'update', entityGuid: facility.guid, label: 'Updating facility settings' },
        () => this.facilityHandler.update(facility, this.selectedAccount.guid)
      );
    }
    this.loadingService.setLoadingStatus(false);
    this.toastNotificationService.showToast('Facility Settings Updated!', undefined, undefined, false, "alert-success");
  }


  closeApplySettingsModel() {
    this.displayApplyFacilitySettings = false;
  }


  async automaticBackup() {
    this.backupFile = this.backupExportCoordinator.buildActiveAccountBackup();
    const defaultPath = this.selectedAccount?.dataBackupFilePath ?? `${this.selectedAccount?.name}.json`;
    const savedFilePath = await this.backupGateway.chooseSavePath(defaultPath);
    if (!savedFilePath) { return; }
    await this.backupGateway.write(savedFilePath, this.backupFile);
    await this.automaticBackupsService.addOrUpdateFile(this.backupFile.dataBackupId, this.selectedAccount.guid);
    const updatedAccount: IdbAccount = {
      ...this.selectedAccount,
      dataBackupFilePath: savedFilePath,
      dataBackupId: this.backupFile.dataBackupId
    };
    await this.commandBoundary.execute(
      { entityKind: 'account', changeKind: 'update', entityGuid: updatedAccount.guid, label: 'Saving account' },
      () => this.accountHandler.update(updatedAccount, updatedAccount.guid)
    );
    await this.automaticBackupsService.inspectCurrentAccountFile();
    this.cd.detectChanges();
  }

  async saveChanges() {
    await this.commandBoundary.execute(
      { entityKind: 'account', changeKind: 'update', entityGuid: this.selectedAccount.guid, label: 'Saving account' },
      () => this.accountHandler.update(this.selectedAccount, this.selectedAccount.guid)
    );
  }

  async changeIsShared() {
    await this.saveChanges();
    this.cd.detectChanges();
  }

  async createUtilityBillFolder() {
    await this.electronService.selectFolder();
  }

  async openFolder() {
    this.electronService.checkBillFolderExists();
    this.electronService.getFolderError().pipe(skip(1), take(1)).subscribe(error => {
      if (error == 'Deleted') {
        this.folderError = error;
        console.log('Folder was deleted' + this.folderError);
      }
      else {
        this.folderError = null;
        this.electronService.openBillsFolder(this.folderPath);
      }
    });
  }
}
