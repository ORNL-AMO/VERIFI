import { Component, ElementRef, Input, OnInit } from '@angular/core';
import { Router, Event, NavigationStart } from '@angular/router';
import { AccountdbService } from "../../indexedDB/account-db.service";
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db.service";
import { IdbAccount } from 'src/app/models/idb';
import { Subscription } from 'rxjs';
import * as _ from 'lodash';
import { ImportBackupModalService } from '../import-backup-modal/import-backup-modal.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { environment } from 'src/environments/environment';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';
import { LoadingService } from '../loading/loading.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';

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
  showDropdown: boolean = false;
  showSearch: boolean = false;
  lastBackupDate: Date;
  resetDatabase: boolean = false;
  constructor(
    private router: Router,
    public accountdbService: AccountdbService,
    public facilitydbService: FacilitydbService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterGroupdbService: UtilityMeterGroupdbService,
    public utilityMeterDatadbService: UtilityMeterDatadbService,
    private importBackupModalService: ImportBackupModalService,
    private sharedDataService: SharedDataService,
    private backupDataService: BackupDataService,
    private loadingService: LoadingService,
    private dbChangesService: DbChangesService
  ) {
  }

  ngOnInit() {
    this.allAccountsSub = this.accountdbService.allAccounts.subscribe(allAccounts => {
      this.accountList = allAccounts;
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
  }

  ngOnDestroy() {
    this.allAccountsSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }

  addNewAccount() {
    this.toggleDropdown();
    this.router.navigateByUrl('/setup-wizard');
  }

  async switchAccount(account: IdbAccount) {
    this.loadingService.setLoadingMessage("Switching accounts...");
    this.loadingService.setLoadingStatus(true);
    await this.dbChangesService.selectAccount(account);
    this.router.navigate(['/']);
    this.loadingService.setLoadingStatus(false);
    this.toggleDropdown();
  }

  openImportBackup() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    this.sharedDataService.modalOpen.next(this.showDropdown);
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
  }

  async backupAccount() {
    this.backupDataService.backupAccount();
    let selectedAccount: IdbAccount = this.accountdbService.selectedAccount.getValue();
    selectedAccount.lastBackup = new Date();
    await this.accountdbService.updateWithObservable(selectedAccount).toPromise();
    this.accountdbService.selectedAccount.next(selectedAccount);
  }

  async deleteDatabase() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage('Resetting Database, if this takes too long restart application..');
    this.accountdbService.deleteDatabase();
  }

  toggleResetDatabase(){
    this.resetDatabase = !this.resetDatabase;
  }
}
