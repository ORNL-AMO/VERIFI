import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility } from 'src/app/models/idb';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { environment } from 'src/environments/environment';
import * as _ from 'lodash';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css']
})
export class SidebarComponent implements OnInit {
  open: boolean = true;
  isDev: boolean;

  accountName: string;
  accountSub: Subscription;

  facilityList: Array<FacilityListItem>;
  facilityListSub: Subscription;

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  showSidebar: boolean;
  showAllFacilities: boolean = false;
  hoverIndex: number;
  hoverAccount: boolean;
  constructor(private localStorageService: LocalStorageService, private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService, private router: Router,
    private sharedDataService: SharedDataService) {
    let sidebarOpen: boolean = this.localStorageService.retrieve("sidebarOpen");
    if (sidebarOpen != undefined) {
      this.open = sidebarOpen;
      this.sharedDataService.sidebarOpen.next(this.open);
    }
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.setShowSidebar();
      }
    });
  }

  ngOnInit() {
    this.isDev = !environment.production;
    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      if (account) {
        this.accountName = account.name;
      }
    });

    this.facilityListSub = this.facilityDbService.accountFacilities.subscribe(val => {
      this.setFacilityList(val);
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    })
    this.setShowSidebar();
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


  checkHideFacilityLinks(facilityId: string, index: number): boolean {
    if (this.showAllFacilities && index > 0 && index != this.hoverIndex) {
      return true;
    } else {
      if (this.open && !this.showAllFacilities) {
        return false;
      } else if (this.router.url.includes('account') && !this.router.url.includes('facility')) {
        if (index == this.hoverIndex) {
          return false;
        }else{
          return true;
        }
      } else if (this.selectedFacility) {
        if (index == this.hoverIndex) {
          return false;
        } else if (this.selectedFacility.guid != facilityId) {
          return true;
        }
      }
    }
    return false;
  }

  checkHideAccountLinks(): boolean {
    if (this.open || this.hoverAccount) {
      return false;
    } else if (!this.router.url.includes('account') || this.router.url.includes('facility')) {
      return true;
    }
    return false;
  }

  setShowSidebar() {
    this.showSidebar = !this.router.url.includes('setup-wizard');
  }

  setFacilityList(accountFacilities: Array<IdbFacility>) {
    if (!this.facilityList) {
      this.facilityList = accountFacilities.map(facility => { return { guid: facility.guid, color: facility.color, id: facility.id, modifiedDate: facility.modifiedDate, facilityOrder: facility.facilityOrder } });
    } else {
      let tmpList: Array<string> = accountFacilities.map(facility => { return facility.guid });
      let currentIdList: Array<string> = this.facilityList.map(listItem => { return listItem.guid });
      let missingVals: Array<string> = _.xor(tmpList, currentIdList);
      if (missingVals.length != 0) {
        this.facilityList = accountFacilities.map(facility => { return { guid: facility.guid, color: facility.color, id: facility.id, modifiedDate: facility.modifiedDate, facilityOrder: facility.facilityOrder } });
      } else {
        let tmpList: Array<string> = accountFacilities.map(facility => { return facility.color });
        let currentColorList: Array<string> = this.facilityList.map(listItem => { return listItem.color });
        let missingVals: Array<string> = _.xor(tmpList, currentColorList);
        if (missingVals.length != 0) {
          this.facilityList.forEach(item => {
            item.color = accountFacilities.find(facility => { return facility.guid == item.guid }).color;
          })
        } else {
          let tmpList: Array<Date> = accountFacilities.map(facility => { return facility.modifiedDate });
          let currentColorList: Array<Date> = this.facilityList.map(listItem => { return listItem.modifiedDate });
          let missingVals: Array<Date> = _.xor(tmpList, currentColorList);
          if (missingVals.length != 0) {
            this.facilityList.forEach(item => {
              item.facilityOrder = accountFacilities.find(facility => { return facility.guid == item.guid }).facilityOrder;
            })
          }
        }
      }
    }
  }

  toggleShowAllFacilities() {
    this.showAllFacilities = !this.showAllFacilities;
  }

  setHoverIndex(index: number) {
    this.hoverIndex = index;
  }

  setHoverAccount(bool: boolean){
    this.hoverAccount = bool;
  }
}

export interface FacilityListItem {
  guid: string, color: string, id: number, modifiedDate: Date,
  facilityOrder: number
}