import { Component, ElementRef, OnInit } from '@angular/core';
import { Router, Event, NavigationStart } from '@angular/router';
import { AccountdbService } from "../../indexedDB/account-db.service";
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db.service";
import { LocalStorageService } from 'ngx-webstorage';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { Subscription } from 'rxjs';

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
  devtools: boolean = false;

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
    private localStorage: LocalStorageService
  ) {
    // Close menus on navigation
    router.events.subscribe((event: Event) => {
      console.log(event);
      if (event instanceof NavigationStart) {
        this.accountMenu = false;
        this.facilityMenu = false;
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
    this.toggleSwitchAccountsMenu();
    let newAccount: IdbAccount = this.accountdbService.getNewIdbAccount();
    this.accountdbService.add(newAccount);
    this.router.navigate(['account/account']);
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
    this.toggleFacilityMenu();
    this.facilitydbService.selectedFacility.next(facility);
  }

  getAccountFacilityCount() {
    var res = this.allFacilities.reduce(function(obj, v) {
      obj[v.accountId] = (obj[v.accountId] || 0) + 1;
      return obj;
    }, {});

    
    for(const property in res) {
      const index = this.accountList.map(function(e) { return e.id; }).indexOf(+property);
      if (res[property] === 1) {
        this.accountList[index]['facilityCount'] = res[property] + " Facility";
      } else {
        this.accountList[index]['facilityCount'] = res[property] + " Facilities";
      }
    }
  }

  /* DEV TOOLS BELOW 
  *******************************************************************************/
  loadTestData() {
    this.accountdbService.addTestData();
    this.facilitydbService.addTestData()
    // .then(
    //   data => {
    //     location.reload();
    //   }
    // );
    //location.reload();
    console.log("Data loaded");
  }

  getAllAccounts() {
    this.accountdbService.getAll().subscribe(
      data => {
        console.log(data);
      }
    );
  }

  getAllFacilities() {
    this.facilitydbService.getAll().subscribe(
      data => {
        console.log(data);
      }
    );
  }

  getAllMeters() {
    this.utilityMeterdbService.getAll().subscribe(
      data => {
        console.log(data);
      }
    );
  }

  getAllMeterData() {
    this.utilityMeterDatadbService.getAll().subscribe(
      data => {
        console.log(data);
      }
    );
  }

  getAllMeterGroups() {
    this.utilityMeterGroupdbService.getAll().subscribe(
      data => {
        console.log(data);
      }
    );
  }

  clearLocalstorage() {
    this.localStorage.clear('accountid');
    this.localStorage.clear('facilityid');
    console.log("data cleared");
  }

}
