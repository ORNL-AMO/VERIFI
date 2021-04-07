import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BackupDataService, BackupFile } from 'src/app/account-management/backup-data.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { LoadingService } from 'src/app/shared/loading/loading.service';
import { UtilityMeterdbService } from '../../indexedDB/utilityMeter-db.service';

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.css']
})
export class EmptyStateComponent implements OnInit {

  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  utilityMeters: Array<IdbUtilityMeter>;
  selectedAccountSub: Subscription;
  selectedFacilitySub: Subscription;
  utilityDataSub: Subscription;
  showImportFile: boolean = false;
  backupFile: any;
  backupFileError: string;
  constructor(
    public accountdbService: AccountdbService,
    public facilityDbService: FacilitydbService,
    public utilityMeterDbService: UtilityMeterdbService,
    private router: Router,
    private loadingService: LoadingService,
    private backupDataService: BackupDataService
  ) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(selectedAccount => {
      this.selectedAccount = selectedAccount;
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });

    this.utilityDataSub = this.utilityMeterDbService.facilityMeters.subscribe(utilityMeters => {
      this.utilityMeters = utilityMeters;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.utilityDataSub.unsubscribe();
  }

  addAccount() {
    if (!this.selectedAccount) {
      let newAccount: IdbAccount = this.accountdbService.getNewIdbAccount();
      this.accountdbService.add(newAccount);
    }
    this.router.navigate(['/account-management']);
  }

  addFacility() {
    if (!this.selectedFacility) {
      let newFacility: IdbFacility = this.facilityDbService.getNewIdbFacility(this.selectedAccount);
      this.facilityDbService.add(newFacility);
    }
    this.router.navigate(['/facility-management']);
  }

  addUtilityData() {
    this.router.navigate(['/utility/energy-consumption']);
  }

  loadTestData() {
    this.loadingService.setLoadingMessage('Loading Example Data..');
    this.loadingService.setLoadingStatus(true);
    this.accountdbService.addTestData();
    this.accountdbService.getAll().subscribe(allAccounts => {
      this.accountdbService.allAccounts.next(allAccounts);
      this.facilityDbService.addTestData(allAccounts);
      this.facilityDbService.getAll().subscribe(val => {
        this.facilityDbService.allFacilities.next(val);
        this.accountdbService.setSelectedAccount(allAccounts[0].id);
        this.loadingService.setLoadingStatus(false);
      })
    })
  }

  openImportBackup() {
    this.showImportFile = true;
  }

  cancelImportBackup() {
    this.showImportFile = false;
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
            } else if (testBackup.backupFileType == "Facility") {
              this.backupFileError = "Oops it looks like you are trying to import a facility backup. Only account backup files can be loaded in this context. Once an account is created you can import facility backups in the next screen.";
            } else {
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
    let tmpBackupFile: BackupFile = JSON.parse(this.backupFile);
    let newAccount: IdbAccount = await this.backupDataService.importAccountBackup(tmpBackupFile.accountBackup);
    this.accountdbService.setSelectedAccount(newAccount.id);
    this.facilityDbService.setAllFacilities();
    this.accountdbService.setAllAccounts();
    this.loadingService.setLoadingStatus(false);
    this.cancelImportBackup();
  }

}
