import { Component, ElementRef, OnInit } from '@angular/core';
import { Router, Event, NavigationStart } from '@angular/router';
import { AccountdbService } from "../../indexedDB/account-db.service";
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db.service";
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { Subscription } from 'rxjs';
import * as _ from 'lodash';
import { ImportBackupModalService } from '../import-backup-modal/import-backup-modal.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { environment } from 'src/environments/environment';
import { BackupDataService } from 'src/app/shared/helper-services/backup-data.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  // host: {
  //   '(document:click)': 'documentClick($event)',
  // }
})
export class HeaderComponent implements OnInit {

  version: string = environment.version;
  // accountMenu: boolean = false;
  // switchAccountMenu: boolean;
  accountList: Array<IdbAccount>;
  // allFacilities: Array<IdbFacility>;
  activeAccount: IdbAccount;

  allAccountsSub: Subscription;
  selectedAccountSub: Subscription;
  // allFacilitiesSub: Subscription;
  showDropdown: boolean = false;
  showSearch: boolean = false;
  lastBackupDate: Date;
  
  constructor(
    private eRef: ElementRef,
    private router: Router,
    public accountdbService: AccountdbService,
    public facilitydbService: FacilitydbService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterGroupdbService: UtilityMeterGroupdbService,
    public utilityMeterDatadbService: UtilityMeterDatadbService,
    private importBackupModalService: ImportBackupModalService,
    private sharedDataService: SharedDataService,
    private backupDataService: BackupDataService
  ) {
    // Close menus on navigation
    // router.events.subscribe((event: Event) => {
    //   if (event instanceof NavigationStart) {
    //     this.accountMenu = false;
    //   }
    // });
  }

  ngOnInit() {
    this.allAccountsSub = this.accountdbService.allAccounts.subscribe(allAccounts => {
      this.accountList = allAccounts;
    });

    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(selectedAccount => {
      this.activeAccount = selectedAccount;
      if (selectedAccount) {
        this.lastBackupDate = selectedAccount.lastBackup;
      } else {
        this.lastBackupDate = undefined;
      }
    });

    // this.allFacilitiesSub = this.facilitydbService.allFacilities.subscribe(allFacilities => {
    //   this.allFacilities = allFacilities;
    //   this.getAccountFacilityCount();
    // });
  }

  ngOnDestroy() {
    this.allAccountsSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
    // this.allFacilitiesSub.unsubscribe();
  }

  // toggleAccountMenu() {
  //   this.accountMenu = !this.accountMenu;
  //   this.sharedDataService.modalOpen.next(this.accountMenu);
  // }

  // toggleSwitchAccountsMenu() {
  //   this.switchAccountMenu = !this.switchAccountMenu;
  //   this.accountMenu = false;
  //   this.sharedDataService.modalOpen.next(this.switchAccountMenu);
  // }

  // // close menus when user clicks outside the dropdown
  // documentClick() {
  //   if (!this.eRef.nativeElement.contains(event.target) && (this.accountMenu || this.switchAccountMenu)) {
  //     this.accountMenu = false;
  //     this.switchAccountMenu = false;
  //     this.sharedDataService.modalOpen.next(false);
  //   }
  // }

  // closeSwitchAccount() {
  //   this.switchAccountMenu = false;
  //   this.sharedDataService.modalOpen.next(false);
  // }

  addNewAccount() {
    // this.switchAccountMenu = false;
    this.toggleDropdown();
    this.router.navigateByUrl('/setup-wizard');
  }

  async switchAccount(account: IdbAccount) {
    // this.toggleSwitchAccountsMenu();
    this.router.navigate(['/']);
    // this.accountdbService.setSelectedAccount(account.id);
    this.accountdbService.selectedAccount.next(account);
    // this.switchAccountMenu = false;
    this.toggleDropdown();
  }


  // getAccountFacilityCount() {
  //   this.accountList.forEach(account => {
  //     account.numberOfFacilities = this.getNumberOfFacilities(account.id);
  //   });
  // }

  // getNumberOfFacilities(accountId: number): string {
  //   let count: number = 0;
  //   this.allFacilities.forEach(facility => {
  //     if (facility.accountId == accountId) {
  //       count++;
  //     }
  //   });
  //   if (count != 1) {
  //     return count + ' Facilities';
  //   } else {
  //     return count + ' Facility';
  //   }
  // }

  openImportBackup() {
    this.importBackupModalService.inFacility = false;
    this.importBackupModalService.showModal.next(true);
    // this.switchAccountMenu = false;
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    this.sharedDataService.modalOpen.next(this.showDropdown);
  }

  toggleSearch() {
    this.showSearch = !this.showSearch;
  }

  backupAccount() {
    this.backupDataService.backupAccount();
  }
}
