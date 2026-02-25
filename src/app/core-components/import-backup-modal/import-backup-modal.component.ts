import { Component, OnInit } from '@angular/core';
import { Subscription, firstValueFrom } from 'rxjs';
import { BackupDataService, BackupFile } from 'src/app/shared/helper-services/backup-data.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { LoadingService } from '../loading/loading.service';
import { ImportBackupModalService } from './import-backup-modal.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { Router } from '@angular/router';
import { ToastNotificationsService } from '../toast-notifications/toast-notifications.service';
import { DeleteDataService } from 'src/app/indexedDB/delete-data.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { PredictorDbService } from 'src/app/indexedDB/predictor-db.service';
import { PredictorDataDbService } from 'src/app/indexedDB/predictor-data-db.service';
import { IdbPredictor } from 'src/app/models/idbModels/predictor';
import { IdbPredictorData } from 'src/app/models/idbModels/predictorData';

@Component({
  selector: 'app-import-backup-modal',
  templateUrl: './import-backup-modal.component.html',
  styleUrls: ['./import-backup-modal.component.css'],
  standalone: false
})
export class ImportBackupModalComponent implements OnInit {

  inFacility: boolean;
  backupFile: any;
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
  constructor(private loadingService: LoadingService,
    private backupDataService: BackupDataService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private importBackupModalService: ImportBackupModalService,
    private dbChangesService: DbChangesService,
    private router: Router,
    private toastNotificationService: ToastNotificationsService,
    private deleteDataService: DeleteDataService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private predictorDbService: PredictorDbService,
    private predictorDataDbService: PredictorDataDbService) { }

  ngOnInit(): void {
    this.showModalSub = this.importBackupModalService.showModal.subscribe(value => {
      this.showModal = value;
      this.inFacility = this.importBackupModalService.inFacility;
      if (this.showModal == true) {
        this.backupFile = undefined;
        this.backupFileError = undefined;
        this.backupName = undefined;
        this.overwriteData = false;
        this.selectedAccount = this.accountDbService.selectedAccount.getValue();
        this.accountFacilities = this.facilityDbService.accountFacilities.getValue();
        this.accountFacilityNames = this.accountFacilities.map(facility => facility.name);
        this.accountGroups = this.utilityMeterGroupDbService.accountMeterGroups.getValue();
        this.duplicateFacilityError = false;
        if (!this.selectedAccount) {
          this.overwriteData = false;
        }
      }
    });

    this.loadingSub = this.loadingService.navigationAfterLoading.subscribe((context) => {
      if (context === 'import-account-backup' || context === 'import-facility-backup') {
        this.navigateToUrl();
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
        fr.onloadend = (e) => {
          try {
            this.backupFile = JSON.parse(JSON.stringify(fr.result));
            let testBackup = JSON.parse(this.backupFile);
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
        this.loadingService.setCurrentLoadingIndex(0);
        this.loadingService.addLoadingMessage("Deleting replaced facilities");
      }
      else {
        this.loadingService.setContext('import-account-backup');
        this.loadingService.setTitle("Importing account backup file");
        this.loadingService.setCurrentLoadingIndex(0);
        this.loadingService.addLoadingMessage("Adding account");
      }
    } else {
      this.loadingService.setContext('import-facility-backup');
      this.loadingService.setTitle("Importing facility backup file");
      this.loadingService.setCurrentLoadingIndex(0);
      this.loadingService.addLoadingMessage("Adding facility");
    }
    try {
      let tmpBackupFile: BackupFile = JSON.parse(this.backupFile);
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

  async importNewAccount(backupFile: BackupFile) {
    this.deleteDataService.pauseDelete.next(true);
    let newAccount: IdbAccount = await this.backupDataService.importAccountBackupFile(backupFile, 0);
    await this.dbChangesService.updateAccount(newAccount);
    await this.dbChangesService.selectAccount(newAccount, false);
    this.deleteDataService.pauseDelete.next(false);
    this.deleteDataService.gatherAndDelete();
  }

  async importExistingAccount(backupFile: BackupFile) {
    //delete existing account and data
    this.deleteDataService.pauseDelete.next(true);
    this.selectedAccount.deleteAccount = true;
    await firstValueFrom(this.accountDbService.updateWithObservable(this.selectedAccount));
    let accounts: Array<IdbAccount> = await firstValueFrom(this.accountDbService.getAll());
    this.accountDbService.allAccounts.next(accounts);
    await this.importNewAccount(backupFile);
    this.deleteDataService.pauseDelete.next(false);
    this.deleteDataService.gatherAndDelete();
  }

  async importNewFacility(backupFile: BackupFile) {
    let { facility: newFacility } = await this.backupDataService.importFacilityBackupFile(backupFile, this.selectedAccount.guid, 0);
    let currentAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.selectAccount(currentAccount, false);
    this.dbChangesService.selectFacility(newFacility);
  }

  async importExistingFacility(backupFile: BackupFile) {
    //delete selected facility and data
    await this.dbChangesService.deleteFacility(this.overwriteFacility, this.selectedAccount);
    await this.importNewFacility(backupFile)
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

  async importSelectedFacilities(backupFile: BackupFile) {
    let idx = 1;

    // delete facilities to be replaced
    for (let facility of this.selectedFacilitiesToImport) {
      let importSelection = this.facilityImportSelections[facility.name];

      if (importSelection.importAs === 'replace' && importSelection.replacedFacility) {
        const facilityToReplace = this.accountFacilities.find(f => f.name === importSelection.replacedFacility);
        if (facilityToReplace) {
          await this.dbChangesService.deleteFacility(facilityToReplace, this.selectedAccount, false);
        }
      }
    }

    // import selected facilities
    for (let facility of this.selectedFacilitiesToImport) {
      const facilityBackup = backupFile.facilities.find(f => f.name === facility.name);
      const facilityBackupFile: BackupFile = {
        ...backupFile,
        facility: facilityBackup,
        meters: backupFile.meters.filter(m => m.facilityId === facilityBackup?.guid),
        meterData: backupFile.meterData.filter(md => md.facilityId === facilityBackup?.guid),
        groups: backupFile.groups.filter(g => g.facilityId === facilityBackup?.guid),
        facilityAnalysisItems: backupFile.facilityAnalysisItems.filter(fa => fa.facilityId === facilityBackup?.guid),
        predictorData: backupFile.predictorData.filter(pd => pd.facilityId === facilityBackup?.guid),
        predictorDataV2: backupFile.predictorDataV2.filter(pd => pd.facilityId === facilityBackup?.guid),
        predictors: backupFile.predictors.filter(p => p.facilityId === facilityBackup?.guid)
      };

      //import all selected facilities as new
      this.loadingService.setCurrentLoadingIndex(idx);
      this.loadingService.addLoadingMessage("Adding facility: " + facilityBackupFile.facility.name);
      const { facility: newFacility, index } = await this.backupDataService.importFacilityBackupFile(facilityBackupFile, this.selectedAccount.guid, idx);
      idx = index + 1;
    }

    let currentAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.selectAccount(currentAccount, false);
  }

  checkDifferences() {
    this.differencesList = [];
    let backupData = JSON.parse(this.backupFile);
    let facilityMapping = new Map<string, { backupFacility: IdbFacility, accountFacility: IdbFacility }>();
    for (let facility of backupData.facilities) {
      let accountFacility = this.accountFacilities.find(f => f.name === facility.name);
      facilityMapping.set(facility.name, { backupFacility: facility, accountFacility });
    }
    let backupGroups: Array<IdbUtilityMeterGroup> = backupData.groups || [];

    facilityMapping.forEach(f => {
      let differences: Array<string> = [];
      if (!f.accountFacility) {
        differences.push('New Facility');
      }
      else {
        // check for differences in groups
        let facilityBackupGroups: Array<IdbUtilityMeterGroup> = backupGroups.filter(g => g.facilityId === f.backupFacility.guid);
        let facilityAccountGroups = this.accountGroups.filter(g => g.facilityId === f.accountFacility.guid);
        const groupDifferenceFound =
          facilityBackupGroups.some(bg => !facilityAccountGroups.some(ag => ag.name === bg.name && ag.groupType === bg.groupType)) ||
          facilityAccountGroups.some(ag => !facilityBackupGroups.some(bg => bg.name === ag.name && bg.groupType === ag.groupType));

        if (groupDifferenceFound) {
          differences.push('Meter Groups');
        }

        // check for differences in meters
        let facilityBackupMeters: Array<IdbUtilityMeter> = backupData.meters?.filter(m => m.facilityId === f.backupFacility.guid);
        let facilityAccountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(f.accountFacility.guid);
        const meterDifferenceFound =
          facilityBackupMeters.some(bm => !facilityAccountMeters.some(am => am.name === bm.name && am.meterNumber === bm.meterNumber)) ||
          facilityAccountMeters.some(am => !facilityBackupMeters.some(bm => bm.name === am.name && bm.meterNumber === am.meterNumber));

        if (meterDifferenceFound) {
          differences.push('Meters');
        }

        // check for differences in meter data
        let facilityBackupMeterData: Array<IdbUtilityMeterData> = backupData.meterData?.filter(md => md.facilityId === f.backupFacility.guid);
        let facilityAccountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.getFacilityMeterDataByFacilityGuid(f.accountFacility.guid);

        const meterDataDifferenceFound =
          facilityBackupMeterData.some(bmd => !facilityAccountMeterData.some(amd => {
            const bmdYMD = this.getYMD(bmd);
            return amd.totalEnergyUse === bmd.totalEnergyUse &&
              amd.meterNumber === bmd.meterNumber &&
              bmdYMD.year === amd.year &&
              bmdYMD.month === amd.month &&
              bmdYMD.day === amd.day;
          })) ||
          facilityAccountMeterData.some(amd => !facilityBackupMeterData.some(bmd => {
            const bmdYMD = this.getYMD(bmd);
            return amd.totalEnergyUse === bmd.totalEnergyUse &&
              bmd.meterNumber === amd.meterNumber &&
              bmdYMD.year === amd.year &&
              bmdYMD.month === amd.month &&
              bmdYMD.day === amd.day;
          }));

        if (meterDataDifferenceFound) {
          differences.push('Meter Data');
        }


        // check for differences in predictors
        let facilityBackupPredictors: Array<IdbPredictor> = backupData.predictors?.filter(p => p.facilityId === f.backupFacility.guid);
        let facilityAccountPredictors: Array<IdbPredictor> = this.predictorDbService.getByFacilityId(f.accountFacility.guid);
        const predictorDifferenceFound =
          facilityBackupPredictors.some(bp => !facilityAccountPredictors.some(ap => ap.name === bp.name)) ||
          facilityAccountPredictors.some(ap => !facilityBackupPredictors.some(bp => bp.name === ap.name));
        if (predictorDifferenceFound) {
          differences.push('Predictors');
        }

        // check for differences in predictor data
        let facilityBackupPredictorData: Array<IdbPredictorData> = backupData.predictorDataV2?.filter(pd => pd.facilityId === f.backupFacility.guid);
        let facilityAccountPredictorData: Array<IdbPredictorData> = this.predictorDataDbService.getByFacilityId(f.accountFacility.guid);

        const predictorDataDifferenceFound =
          facilityBackupPredictorData.some(bpd => !facilityAccountPredictorData.some(apd => {
            const bpdYM = this.getPredictorYM(bpd);
            return apd.amount === bpd.amount &&
              apd.year === bpdYM.year &&
              apd.month === bpdYM.month;
          })) ||
          facilityAccountPredictorData.some(apd => !facilityBackupPredictorData.some(bpd => {
            const bpdYM = this.getPredictorYM(bpd);
            return apd.amount === bpd.amount &&
              apd.year === bpdYM.year &&
              apd.month === bpdYM.month;
          }));

        if (predictorDataDifferenceFound) {
          differences.push('Predictor Data');
        }
      }
      this.differencesList.push({ facilityName: f.backupFacility.name, differences });
    });
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
