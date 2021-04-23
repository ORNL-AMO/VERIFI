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
import { DashboardService } from 'src/app/dashboard/dashboard.service';

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
  viewingAccountPage: boolean;

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
    public utilityMeterDatadbService: UtilityMeterDatadbService,
    private dashboardService: DashboardService
  ) {
    // Close menus on navigation
    router.events.subscribe((event: Event) => {
      if (event instanceof NavigationStart) {
        this.accountMenu = false;
        this.facilityMenu = false;
      }

      // Displays "All Facilities" if viewing an account page
      if (event instanceof NavigationEnd) {
        this.checkIfAccountPage();
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
    this.dashboardService.bannerDropdownOpen.next(this.facilityMenu);
  }

  toggleAccountMenu() {
    this.accountMenu = !this.accountMenu;
    this.facilityMenu = false;
    this.dashboardService.bannerDropdownOpen.next(this.accountMenu);
  }

  toggleSwitchAccountsMenu() {
    this.switchAccountMenu = !this.switchAccountMenu;
    this.facilityMenu = false;
    this.accountMenu = false;
    this.dashboardService.bannerDropdownOpen.next(this.switchAccountMenu);
  }

  // close menus when user clicks outside the dropdown
  documentClick() {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.accountMenu = false;
      this.facilityMenu = false;
      this.switchAccountMenu = false;
      this.dashboardService.bannerDropdownOpen.next(false);
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
    this.switchAccountMenu = false;
    this.dashboardService.bannerDropdownOpen.next(false);
  }

  switchFacility(facility: IdbFacility) {
    this.facilitydbService.selectedFacility.next(facility);
    this.facilityMenu = false;
    this.dashboardService.bannerDropdownOpen.next(false);
  }

  selectAllFacilities() {
    this.router.navigate(['/account-summary']);
    this.facilityMenu = false;
    this.dashboardService.bannerDropdownOpen.next(false);
  }


  getAccountFacilityCount() {
    this.accountList.forEach(account => {
      account.numberOfFacilities = this.getNumberOfFacilities(account.id);
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

  checkIfAccountPage() {
    if (this.router.url === '/account-management' || this.router.url === '/account-summary') {
      this.viewingAccountPage = true;
    }
    if (this.router.url != '/account-management' && this.router.url != '/account-summary') {
      this.viewingAccountPage = false;
    }
  }

}
