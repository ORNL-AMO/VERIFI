import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { BackupDataService, BackupFile } from 'src/app/shared/helper-services/backup-data.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { LoadingService } from '../loading/loading.service';
import { ImportBackupModalService } from './import-backup-modal.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-import-backup-modal',
  templateUrl: './import-backup-modal.component.html',
  styleUrls: ['./import-backup-modal.component.css']
})
export class ImportBackupModalComponent implements OnInit {

  inFacility: boolean;
  backupFile: any;
  backupFileError: string;
  importIsAccount: boolean;
  overwriteData: boolean = true;
  selectedAccount: IdbAccount;
  accountFacilities: Array<IdbFacility>;
  overwriteFacility: IdbFacility;
  backupName: string;
  backupType: string;
  showModalSub: Subscription;
  showModal: boolean;
  constructor(private loadingService: LoadingService,
    private backupDataService: BackupDataService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private importBackupModalService: ImportBackupModalService,
    private dbChangesService: DbChangesService,
    private router: Router) { }

  ngOnInit(): void {
    this.showModalSub = this.importBackupModalService.showModal.subscribe(value => {
      this.showModal = value;
      this.inFacility = this.importBackupModalService.inFacility;
      if (this.showModal == true) {
        this.selectedAccount = this.accountDbService.selectedAccount.getValue();
        this.accountFacilities = this.facilityDbService.accountFacilities.getValue();
        if (!this.selectedAccount) {
          this.overwriteData = false;
        }
      }
    })
  }

  cancelImportBackup() {
    this.importBackupModalService.showModal.next(false);
  }

  setImportFile(event: EventTarget) {
    let files: FileList = (event as HTMLInputElement).files;
    if (files) {
      if (files.length !== 0) {
        let fr: FileReader = new FileReader();
        fr.readAsText(files[0]);
        fr.onloadend = (e) => {
          try {
            this.backupFile = JSON.parse(JSON.stringify(fr.result));
            let testBackup = JSON.parse(this.backupFile)
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
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Importing backup file...")
    let tmpBackupFile: BackupFile = JSON.parse(this.backupFile);
    if (this.importIsAccount) {
      if (this.overwriteData) {
        await this.importExistingAccount(tmpBackupFile);
      } else {
        await this.importNewAccount(tmpBackupFile);
      }
    } else {
      if (this.overwriteData) {
        await this.importExistingFacility(tmpBackupFile);
      } else {
        await this.importNewFacility(tmpBackupFile)
      }
    }
    this.loadingService.setLoadingStatus(false);
    this.router.navigateByUrl('account');
  }

  async importNewAccount(backupFile: BackupFile) {
    let newAccount: IdbAccount = await this.backupDataService.importAccountBackupFile(backupFile);
    await this.dbChangesService.updateAccount(newAccount);
    await this.dbChangesService.selectAccount(newAccount);
  }

  async importExistingAccount(backupFile: BackupFile) {
    //delete existing account and data
    await this.backupDataService.deleteAccountData(this.selectedAccount);
    await this.importNewAccount(backupFile);
  }

  async importNewFacility(backupFile: BackupFile) {
    let newFacility: IdbFacility = await this.backupDataService.importFacilityBackupFile(backupFile, this.selectedAccount.guid);
    let currentAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.selectAccount(currentAccount);
    this.dbChangesService.selectFacility(newFacility);

  }

  async importExistingFacility(backupFile: BackupFile) {
    //delete selected facility and data
    await this.backupDataService.deleteFacilityData(this.overwriteFacility);
    await this.importNewFacility(backupFile)
  }
}
