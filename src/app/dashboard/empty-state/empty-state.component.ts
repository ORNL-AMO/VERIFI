import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { LoadingService } from 'src/app/core-components/loading/loading.service';
import { UtilityMeterdbService } from '../../indexedDB/utilityMeter-db.service';
import { ExampleAccount } from 'src/app/shared/example-data/Better_Plants_Partner_Backup_4-20-2021';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { ImportBackupModalService } from 'src/app/core-components/import-backup-modal/import-backup-modal.service';
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
  constructor(
    private accountdbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private router: Router,
    private loadingService: LoadingService,
    private backupDataService: BackupDataService,
    private importBackupModalService: ImportBackupModalService
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

  async addAccount() {
    if (!this.selectedAccount) {
      this.loadingService.setLoadingMessage('Creating Account..');
      this.loadingService.setLoadingStatus(true);
      let newAccount: IdbAccount = this.accountdbService.getNewIdbAccount();
      newAccount = await this.accountdbService.addWithObservable(newAccount).toPromise();
      this.accountdbService.selectedAccount.next(newAccount);
      this.loadingService.setLoadingStatus(false);
    }
    this.router.navigate(['/account-management']);
  }

  async addFacility() {
    if (!this.selectedFacility) {
      this.loadingService.setLoadingMessage('Creating Facility..');
      this.loadingService.setLoadingStatus(true);
      let newFacility: IdbFacility = this.facilityDbService.getNewIdbFacility(this.selectedAccount);
      newFacility = await this.facilityDbService.addWithObservable(newFacility).toPromise();
      this.facilityDbService.selectedFacility.next(newFacility);
      this.loadingService.setLoadingStatus(false);
    }
    this.router.navigate(['/facility-management']);
  }

  addUtilityData() {
    this.router.navigate(['/utility/energy-consumption']);
  }

  async loadTestData() {
    this.loadingService.setLoadingMessage('Loading Example Data..');
    this.loadingService.setLoadingStatus(true);
    let newAccount: IdbAccount = await this.backupDataService.importAccountBackup(ExampleAccount);
    this.accountdbService.setAllAccounts();
    this.facilityDbService.setAllFacilities();
    this.accountdbService.setSelectedAccount(newAccount.id);
    this.loadingService.setLoadingStatus(false);
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
  }
}
