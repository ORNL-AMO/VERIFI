import { AccountWorkspaceQueryService } from 'src/app/account-workspace/account-workspace-query.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { Component, OnInit, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { BackupDataService } from 'src/app/backup/backup-data.service';
import { LoadingService } from '../loading/loading.service';
import { ImportBackupModalService } from './import-backup-modal.service';
import { Router } from '@angular/router';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { DeleteDataService } from 'src/app/indexedDB/delete-data.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';
import { FutureBackupVersionError, PreparedBackupFile } from 'src/app/backup/backup-preparation.service';
import { BackupImportCoordinator } from 'src/app/backup/backup-import-coordinator.service';

@Component({
  selector: 'app-import-backup-modal',
  templateUrl: './import-backup-modal.component.html',
  styleUrls: ['./import-backup-modal.component.css'],
  standalone: false
})
export class ImportBackupModalComponent implements OnInit {
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);

  inFacility: boolean;
  backupFile: PreparedBackupFile;
  backupFileError: string;
  importIsAccount: boolean;
  overwriteData: boolean | 'selective_import' = false;
  selectedAccount: IdbAccount;
  accountFacilities: Array<IdbFacility>;
  overwriteFacility: IdbFacility;
  backupName: string;
  backupType: string;
  showModalSub: Subscription;
  showModal: boolean;
  loadingSub: Subscription;
  backupFacilities: Array<IdbFacility>;
  selectedFacilitiesToImport: Array<IdbFacility> = [];
  facilityImportSelections: { [facilityName: string]: { importAs: 'new' | 'replace', replacedFacility?: string } } = {};
  duplicateFacilityError: boolean = false;
  accountGroups: Array<IdbUtilityMeterGroup>;
  differencesList: { facilityName: string, differences: Array<string> }[] = [];
  accountFacilityNames: Array<string> = [];
  constructor(
    private loadingService: LoadingService,
    private backupDataService: BackupDataService,
    private importBackupModalService: ImportBackupModalService,
    private router: Router,
    private toastNotificationService: ToastNotificationsService,
    private deleteDataService: DeleteDataService,
    private backupImportCoordinator: BackupImportCoordinator
  ) { }

  ngOnInit(): void {
    this.showModalSub = this.importBackupModalService.showModal.subscribe(value => {
      this.showModal = value;
      this.inFacility = this.importBackupModalService.inFacility;
      if (this.showModal == true) {
        this.backupFile = undefined;
        this.backupFileError = undefined;
        this.backupName = undefined;
        if (this.router.url.includes('import-data')) {
          this.overwriteData = 'selective_import';
        } else {
          this.overwriteData = false;
        }
        this.selectedAccount = this.accountWorkspaceStore.account();
        this.accountFacilities = [...this.accountWorkspaceStore.facilities()];
        this.accountFacilityNames = this.accountFacilities.map(facility => facility.name);
        this.accountGroups = [...this.accountWorkspaceStore.meterGroups()];
        this.duplicateFacilityError = false;
        if (!this.selectedAccount) {
          this.overwriteData = false;
        }
      }
    });

    this.loadingSub = this.loadingService.navigationAfterLoading.subscribe((context) => {
      if (context === 'import-account-backup' || context === 'import-facility-backup' || context === 'import-selected-facility-backup') {
        this.navigateToUrl();
        this.loadingService.navigationAfterLoading.next(undefined);
      }
    });
  }

  ngOnDestroy(): void {
    this.showModalSub.unsubscribe();
    this.loadingSub.unsubscribe();
  }

  cancelImportBackup() {
    this.importBackupModalService.showModal.next(false);
  }

  getMatchingSelections() {
    if (this.backupFacilities && this.accountFacilities) {
      this.backupFacilities.forEach(facility => {
        const match = this.accountFacilities.find(accFac => accFac.name === facility.name);
        if (match) {
          this.facilityImportSelections[facility.name] = {
            importAs: 'new',
            replacedFacility: match.name
          };
        }
      });
    }
  }

  setImportFile(event: EventTarget) {
    this.selectedFacilitiesToImport = [];
    let files: FileList = (event as HTMLInputElement).files;
    if (files) {
      if (files.length !== 0) {
        let fr: FileReader = new FileReader();
        fr.readAsText(files[0]);
        fr.onloadend = () => {
          try {
            let testBackup = this.backupImportCoordinator.prepareTextBackup(String(fr.result));
            this.backupFile = testBackup;
            this.backupFacilities = testBackup.facilities;
            this.facilityImportSelections = {};
            this.backupFacilities?.forEach(facility => {
              if (!this.facilityImportSelections[facility.name]) {
                this.facilityImportSelections[facility.name] = { importAs: 'new', replacedFacility: this.accountFacilities[0]?.name };
              }
            });
            this.getMatchingSelections();
            if (!testBackup.origin || testBackup.origin != "VERIFI") {
              this.backupFileError = "Selected file does not come from VERIFI and cannot be imported."
            } else {
              this.importIsAccount = (testBackup.backupFileType == "Account");
              //facility
              if (!this.importIsAccount) {
                this.backupType = "Facility";
                if (this.selectedAccount) {
                  this.backupName = testBackup.facility.name;
                  if (this.accountFacilities.length != 0) {
                    let testFacility: IdbFacility = this.accountFacilities.find(facility => { return this.backupName == facility.name });
                    if (testFacility) {
                      this.overwriteFacility = testFacility;
                    } else {
                      this.overwriteFacility = this.accountFacilities[0];
                    }
                  }
                  this.backupFileError = undefined;
                } else {
                  this.backupFileError = "You are trying to import a facility without an account created or selected. Select an account to import this facility into."
                }
              }
              //account
              else if (this.importIsAccount) {
                if (!this.inFacility) {
                  this.backupType = "Account"
                  this.backupName = testBackup.account.name;
                  this.backupFileError = undefined;
                } else {
                  this.backupFileError = "You are trying to import an account in the facility management page. Please use the account management section to import accounts.";
                }
                if (this.backupFileError === undefined) {
                  this.checkDifferences();
                }
              }
            }
          } catch (err) {
            console.log(err);
            this.backupFile = undefined;
            this.backupFileError = err instanceof FutureBackupVersionError
              ? err.message
              : err instanceof Error ? err.message : 'Selected file is not a valid VERIFI backup.';
          }
        };
      }
    }
  }

  async importBackupFile() {
    this.cancelImportBackup();
    if (this.importIsAccount) {
      if (this.overwriteData === 'selective_import') {
        this.loadingService.setContext('import-selected-facility-backup');
        this.loadingService.setTitle("Importing selected facilities from backup file");
        this.setSelectedFacilitiesMessages();
        this.loadingService.setCurrentLoadingIndex(0);
      }
      else {
        this.loadingService.setContext('import-account-backup');
        this.loadingService.setTitle("Importing account backup file");
        this.loadingService.addLoadingMessage("Adding account");
        this.backupDataService.accountBackupMessages();
        this.loadingService.setCurrentLoadingIndex(0);
      }
    } else {
      this.loadingService.setContext('import-facility-backup');
      this.loadingService.setTitle("Importing facility backup file");
      this.backupDataService.facilityBackupMessages();
    }
    try {
      let tmpBackupFile: PreparedBackupFile = structuredClone(this.backupFile);
      if (this.importIsAccount) {
        if (this.overwriteData === 'selective_import') {
          await this.importSelectedFacilities(tmpBackupFile);
        }
        else if (this.overwriteData) {
          await this.importExistingAccount(tmpBackupFile);
        }
        else {
          await this.importNewAccount(tmpBackupFile);
        }
      } else {
        if (this.overwriteData) {
          await this.importExistingFacility(tmpBackupFile);
        } else {
          await this.importNewFacility(tmpBackupFile)
        }
      }
      this.loadingService.isLoadingComplete.next(true);
    } catch (err) {
      console.log(err);
      this.loadingService.clearLoadingMessages();
      this.loadingService.setContext(undefined);
      this.loadingService.setTitle('');
      this.loadingService.isLoadingComplete.next(true);
      this.toastNotificationService.showToast('Error importing backup', 'There was an error importing this data file.', 15000, false, 'alert-danger');
    }
  }

  navigateToUrl() {
    this.router.navigateByUrl('/data-evaluation/account');
  }

  async importNewAccount(backupFile: PreparedBackupFile) {
    await this.backupImportCoordinator.importNewAccount(backupFile);
  }

  async importExistingAccount(backupFile: PreparedBackupFile) {
    await this.backupImportCoordinator.replaceActiveAccount(backupFile);
  }

  async importNewFacility(backupFile: PreparedBackupFile, currIdx?: number) {
    await this.backupImportCoordinator.importNewFacility(backupFile, this.selectedAccount.guid, currIdx);
  }

  async importExistingFacility(backupFile: PreparedBackupFile) {
    await this.backupImportCoordinator.replaceFacility(backupFile, this.selectedAccount, this.overwriteFacility);
  }

  clearSelectedFacilities() {
    this.selectedFacilitiesToImport = [];
  }

  onSelectedFacilityChange(event: Event, facility: IdbFacility) {
    let isChecked = (event.target as HTMLInputElement).checked;
    if (isChecked) {
      this.selectedFacilitiesToImport.push(facility);
      this.facilityImportSelections[facility.name] = { importAs: 'new', replacedFacility: this.accountFacilityNames?.includes(facility.name) ? facility.name : this.accountFacilityNames[0] };
    }
    else {
      this.facilityImportSelections[facility.name] = { importAs: 'new', replacedFacility: this.accountFacilityNames?.includes(facility.name) ? facility.name : this.accountFacilityNames[0] };
      this.selectedFacilitiesToImport = this.selectedFacilitiesToImport.filter(f => f !== facility);
    }
    this.checkDuplicate();
  }

  setFacilityImportOption(option: string, facility: IdbFacility) {
    if (option === 'new') {
      this.facilityImportSelections[facility.name].importAs = 'new';
    } else if (option === 'replace') {
      this.facilityImportSelections[facility.name].importAs = 'replace';
    }
    this.checkDuplicate();
  }

  setFacilityToReplace(selected: string, facility: IdbFacility) {
    let selectedName = selected;
    if (this.facilityImportSelections[facility.name]) {
      this.facilityImportSelections[facility.name].replacedFacility = selectedName;
    }
    this.checkDuplicate();
  }

  checkDuplicate() {
    let replacedFacilities: Array<string> = [];
    for (let facilityName in this.facilityImportSelections) {
      let selection = this.facilityImportSelections[facilityName];
      if (selection.importAs === 'replace' && selection.replacedFacility) {
        replacedFacilities.push(selection.replacedFacility);
      }
    }
    let hasDuplicates = replacedFacilities.some((item, index) => replacedFacilities.indexOf(item) !== index);
    if (hasDuplicates) {
      this.duplicateFacilityError = true;
    }
    else {
      this.duplicateFacilityError = false;
    }
  }

  setSelectedFacilitiesMessages() {
    this.loadingService.addLoadingMessage("Deleting replaced facilities");
    for (let facility of this.selectedFacilitiesToImport) {
      const name = facility.name;
      this.loadingService.addLoadingMessage("Adding facility: " + name);
      this.backupDataService.facilityBackupMessages();
    }
  }

  async importSelectedFacilities(backupFile: PreparedBackupFile) {
    const preparedFacilities = this.selectedFacilitiesToImport.map(facility => {
      return {
        selectedFacility: facility,
        backup: this.backupImportCoordinator.extractFacility(backupFile, facility.guid)
      };
    });
    await this.backupImportCoordinator.importSelectedFacilities(
      this.selectedAccount,
      preparedFacilities,
      this.facilityImportSelections,
      this.accountFacilities
    );
  }

  checkDifferences() {
    this.differencesList = this.backupImportCoordinator.comparePreparedAccountBackup(this.backupFile)
      .map(entry => ({ facilityName: entry.facilityName, differences: [...entry.differences] }));
  }

  getYMD(md: any) {
    if ('readDate' in md && md.readDate) {
      const d = new Date(md.readDate);
      return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
    } else if ('year' in md && md.year && 'month' in md && md.month && 'day' in md && md.day) {
      return { year: md.year, month: md.month, day: md.day };
    } else {
      return { year: null, month: null, day: null };
    }
  }

  getPredictorYM(pd: any) {
    if ('date' in pd && pd.date) {
      const d = new Date(pd.date);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    } else if ('year' in pd && pd.year && 'month' in pd && pd.month) {
      return { year: pd.year, month: pd.month };
    } else {
      return { year: null, month: null };
    }
  }

  lookupDifferences(facilityName: string): Array<string> {
    let differencesEntry = this.differencesList.find(d => d.facilityName === facilityName);
    return differencesEntry ? differencesEntry.differences : [];
  }
}
