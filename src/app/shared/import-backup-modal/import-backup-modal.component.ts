import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { BackupDataService, BackupFile } from 'src/app/account-management/backup-data.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { LoadingService } from '../loading/loading.service';

@Component({
  selector: 'app-import-backup-modal',
  templateUrl: './import-backup-modal.component.html',
  styleUrls: ['./import-backup-modal.component.css']
})
export class ImportBackupModalComponent implements OnInit {
  @Output('emitClose')
  emitClose = new EventEmitter<boolean>();

  backupFile: any;
  backupFileError: string;
  importIsAccount: boolean;
  overwriteData: boolean = true;

  selectedAccount: IdbAccount;

  showImportFile: boolean = false;
  accountFacilities: Array<IdbFacility>;
  overwriteFacility: IdbFacility;
  backupName: string;
  constructor(private loadingService: LoadingService,
    private backupDataService: BackupDataService,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedAccount = this.accountDbService.selectedAccount.getValue();
    if(!this.selectedAccount){
      this.overwriteData = false;
    }else{
      this.accountFacilities = this.facilityDbService.accountFacilities.getValue();
    }
  }

  ngAfterViewInit() {
    this.showImportFile = true;
  }

  cancelImportBackup() {
    this.emitClose.emit(false);
  }

  setImportFile(files: FileList) {
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
              if (testBackup.backupFileType == "Facility" && this.accountFacilities.length != 0) {
                this.backupName = testBackup.facilityBackup.facility.name;
                let testFacility: IdbFacility = this.accountFacilities.find(facility => { return testBackup.facilityBackup.facility.name == facility.name });
                if (testFacility) {
                  this.overwriteFacility = testFacility;
                } else {
                  this.overwriteFacility = this.accountFacilities[0];
                }
              } else {
                this.backupName = testBackup.accountBackup.account.name;
              }
              this.backupFileError = undefined;
            }
          } catch (err) {
            console.log(err);
          }
        };
      }
    }
  }

  async importBackupFile() {
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
    this.facilityDbService.setAllFacilities();
    this.accountDbService.setAllAccounts();
    this.loadingService.setLoadingStatus(false);
    this.cancelImportBackup();
  }

  async importNewAccount(backupFile: BackupFile) {
    let newAccount: IdbAccount = await this.backupDataService.importAccountBackup(backupFile.accountBackup);
    this.accountDbService.setSelectedAccount(newAccount.id);
  }

  async importExistingAccount(backupFile: BackupFile) {
    //delete existing account and data
    await this.backupDataService.deleteAccountData(this.selectedAccount);
    this.importNewAccount(backupFile);
  }

  async importNewFacility(backupFile: BackupFile) {
    let newFacility: IdbFacility = await this.backupDataService.importFacilityBackup(backupFile.facilityBackup, this.selectedAccount.id);
    this.accountDbService.setSelectedAccount(this.selectedAccount.id);
  }

  async importExistingFacility(backupFile: BackupFile) {
    //delete selected facility and data
    await this.backupDataService.deleteFacilityData(this.overwriteFacility);
    this.importNewFacility(backupFile)
  }
}
