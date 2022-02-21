import { Component, OnInit } from '@angular/core';
import { Router, Event } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  open: boolean = true;
  isDev: boolean;

  account: IdbAccount;
  accountName: string;
  accountSub: Subscription;

  facilityList: Array<IdbFacility>;
  facilityListSub: Subscription;

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;

  constructor(private localStorageService: LocalStorageService, private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService, private router: Router,
    private sharedDataService: SharedDataService) {
    let sidebarOpen: boolean = this.localStorageService.retrieve("sidebarOpen");
    if (sidebarOpen != undefined) {
      this.open = sidebarOpen;
      this.sharedDataService.sidebarOpen.next(this.open);
    }
  }

  ngOnInit() {
    this.isDev = !environment.production;
    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
      if (this.account) {
        this.accountName = this.account.name;
      }
    });

    this.facilityListSub = this.facilityDbService.accountFacilities.subscribe(val => {
      this.facilityList = val;
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    })
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.facilityListSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  toggleSidebar() {
    this.open = !this.open;
    window.dispatchEvent(new Event("resize"));
    this.localStorageService.store('sidebarOpen', this.open);
    this.sharedDataService.sidebarOpen.next(this.open);
  }

  checkHideFacility(facility: IdbFacility): boolean {
    if (this.open) {
      return false;
    } else if (this.router.url.includes('account')) {
      return false;
    } else if (this.selectedFacility) {
      if (this.selectedFacility == facility) {
        return false;
      }
    }
    return true;
  }

  checkHideFacilityLinks(facility: IdbFacility): boolean {
    if (this.open) {
      return false;
    } else if (this.router.url.includes('account')) {
      return true;
    } else if (this.selectedFacility) {
      if (this.selectedFacility.id != facility.id) {
        return true;
      }
    }
    return false;
  }

  checkHideAccountLinks(): boolean {
    if (this.open) {
      return false;
    } else if (!this.router.url.includes('account')) {
      return true;
    }
    return false;
  }

}
