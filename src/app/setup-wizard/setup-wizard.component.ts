import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { ExampleAccount } from 'src/app/shared/example-data/Better_Plants_Partner_Backup_4-20-2021';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { SetupWizardService } from './setup-wizard.service';

@Component({
  selector: 'app-setup-wizard',
  templateUrl: './setup-wizard.component.html',
  styleUrls: ['./setup-wizard.component.css']
})
export class SetupWizardComponent implements OnInit {

  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  utilityMeters: Array<IdbUtilityMeter>;
  selectedAccountSub: Subscription;
  selectedFacilitySub: Subscription;
  utilityDataSub: Subscription;

  submitSub: Subscription;
  constructor(
    private accountdbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private router: Router,
    private loadingService: LoadingService,
    private backupDataService: BackupDataService,
    private importBackupModalService: ImportBackupModalService,
    private setupWizardService: SetupWizardService
  ) { }

  ngOnInit(): void {
    this.accountdbService.selectedAccount.next(undefined);
    let newAccount: IdbAccount = this.accountdbService.getNewIdbAccount();
    this.setupWizardService.account.next(newAccount);

    this.submitSub = this.setupWizardService.submit.subscribe(val => {
      if (val) {
        this.submitData();
        this.setupWizardService.submit.next(false);
      }
    })
  }

  ngOnDestroy() {
  }

  async loadTestData() {
    this.loadingService.setLoadingMessage('Loading Example Data..');
    this.loadingService.setLoadingStatus(true);
    let newAccount: IdbAccount = await this.backupDataService.importAccountBackup(ExampleAccount);
    this.accountdbService.setAllAccounts();
    this.facilityDbService.setAllFacilities();
    this.accountdbService.setSelectedAccount(newAccount.id);
    this.loadingService.setLoadingStatus(false);
    this.router.navigateByUrl('/');
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
  }

  async submitData() {
    this.loadingService.setLoadingMessage("Creating Account...");
    this.loadingService.setLoadingStatus(true);
    let account: IdbAccount = this.setupWizardService.account.getValue();
    account = await this.accountdbService.addWithObservable(account).toPromise();
    let facilities: Array<IdbFacility> = this.setupWizardService.facilities;
    this.loadingService.setLoadingMessage("Creating Facilities...");
    let newFacility: IdbFacility;
    for (let i = 0; i < facilities.length; i++) {
      let facility: IdbFacility = facilities[i];
      facility.accountId = account.id;
      facility = await this.facilityDbService.addWithObservable(facility).toPromise();
      if (i == 0) {
        newFacility = facility;
      }
    }
    this.loadingService.setLoadingMessage("Finishing up...");
    let allAccounts: Array<IdbAccount> = await this.accountdbService.getAll().toPromise();
    this.accountdbService.allAccounts.next(allAccounts);
    this.accountdbService.selectedAccount.next(account);
    this.loadingService.setLoadingStatus(false);
    this.router.navigateByUrl('facility/' + newFacility.id + '/utility');
  }
}
