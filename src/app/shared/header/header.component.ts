import { Component, ElementRef, OnInit } from '@angular/core';
import { Router, Event, NavigationStart, NavigationEnd } from '@angular/router';
import { AccountdbService } from "../../indexedDB/account-db.service";
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db.service";
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { Subscription } from 'rxjs';
import * as _ from 'lodash';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css'],
  host: {
    '(document:click)': 'documentClick($event)',
  }
})
export class HeaderComponent implements OnInit {

  accountMenu: boolean = false;
  facilityMenu: boolean = false;
  switchAccountMenu: boolean;
  accountList: Array<IdbAccount>;
  allFacilities: Array<IdbFacility>;
  facilityList: Array<IdbFacility>;
  activeAccount: IdbAccount;
  activeFacility: IdbFacility;
  viewingAccountManagementPage: boolean;

  allAccountsSub: Subscription;
  selectedAccountSub: Subscription;
  allFacilitiesSub: Subscription;
  accountFacilitiesSub: Subscription;
  selectedFacilitySub: Subscription;

  constructor(
    private eRef: ElementRef,
    private router: Router,
    public accountdbService: AccountdbService,
    public facilitydbService: FacilitydbService,
    public utilityMeterdbService: UtilityMeterdbService,
    public utilityMeterGroupdbService: UtilityMeterGroupdbService,
    public utilityMeterDatadbService: UtilityMeterDatadbService
  ) {
    // Close menus on navigation
    router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {
        this.accountMenu = false;
        this.facilityMenu = false;
      }
      if (event instanceof NavigationEnd && this.router.url === '/account-management') {
        this.viewingAccountManagementPage = true;
      }
      if (event instanceof NavigationEnd && this.router.url != '/account-management') {
        this.viewingAccountManagementPage = false;
      }
    });
  }

  ngOnInit() {
    this.allAccountsSub = this.accountdbService.allAccounts.subscribe(allAccounts => {
      this.accountList = allAccounts;
    });

    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(selectedAccount => {
      this.activeAccount = selectedAccount;
    });

    this.allFacilitiesSub = this.facilitydbService.allFacilities.subscribe(allFacilities => {
      this.allFacilities = allFacilities;
    });

    this.accountFacilitiesSub = this.facilitydbService.accountFacilities.subscribe(accountFacilities => {
      this.facilityList = accountFacilities;
      this.getAccountFacilityCount();
    });

    this.selectedFacilitySub = this.facilitydbService.selectedFacility.subscribe(selectedFacility => {
      this.activeFacility = selectedFacility;
    });
  }

  ngOnDestroy() {
    this.allAccountsSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
    this.accountFacilitiesSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.allFacilitiesSub.unsubscribe();
  }

  toggleFacilityMenu() {
    this.facilityMenu = !this.facilityMenu;
    this.accountMenu = false;
  }

  toggleAccountMenu() {
    this.accountMenu = !this.accountMenu;
    this.facilityMenu = false;
  }

  toggleSwitchAccountsMenu() {
    this.switchAccountMenu = !this.switchAccountMenu;
    this.facilityMenu = false;
    this.accountMenu = false;
  }

  // close menus when user clicks outside the dropdown
  documentClick() {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.accountMenu = false;
      this.facilityMenu = false;
      this.switchAccountMenu = false;
    }
  }

  addNewAccount() {
    this.switchAccountMenu = false;
    let newAccount: IdbAccount = this.accountdbService.getNewIdbAccount();
    this.accountdbService.add(newAccount);
    this.router.navigate(['/account-management']);
  }

  addNewFacility() {
    let newFacility: IdbFacility = this.facilitydbService.getNewIdbFacility(this.activeAccount);
    this.facilitydbService.add(newFacility);
  }

  switchAccount(account: IdbAccount) {
    this.toggleSwitchAccountsMenu();
    this.router.navigate(['/']);
    this.accountdbService.setSelectedAccount(account.id);
  }

  switchFacility(facility: IdbFacility) {
    //this.toggleFacilityMenu();
    this.facilitydbService.selectedFacility.next(facility);
  }

  selectAllFacilities() {
    //this.toggleFacilityMenu();
    this.router.navigate(['/account-summary']);
  }


  getAccountFacilityCount() {
    this.accountList.forEach(account => {
      account.numberOfFacilities = this.getNumberOfFacilities(account.id);
      console.log(account.numberOfFacilities);
    });
  }

  getNumberOfFacilities(accountId: number): string {
    let count: number = 0;
    this.allFacilities.forEach(facility => {
      if (facility.accountId == accountId) {
        count++;
      }
    });
    if(count != 1){
      return count + ' Facilities';
    }else{
      return count + ' Facility';
    }
  }

}
