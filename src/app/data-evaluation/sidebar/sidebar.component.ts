import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { LocalStorageService } from 'ngx-webstorage';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { environment } from 'src/environments/environment';
import * as _ from 'lodash';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { DataEvaluationService } from '../data-evaluation.service';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.css'],
  standalone: false
})
export class SidebarComponent implements OnInit {
  @Output('emitToggleCollapse')
  emitToggleCollapse: EventEmitter<boolean> = new EventEmitter<boolean>(false);

  isDev: boolean;

  accountSub: Subscription;

  facilityList: Array<FacilityListItem>;
  facilityListSub: Subscription;

  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  showSidebar: boolean;
  showAllFacilities: boolean = false;
  hoverIndex: number;
  hoverAccount: boolean;
  account: IdbAccount;

  sidebarOpen: boolean;
  sidebarOpenSub: Subscription;
  url: string;
  routerSub: Subscription;
  constructor(private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService, private router: Router,
    private dataEvaluationService: DataEvaluationService) {
  }

  ngOnInit() {
    this.isDev = !environment.production;
    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.account = account;
    });

    this.facilityListSub = this.facilityDbService.accountFacilities.subscribe(val => {
      this.setFacilityList(val);
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
    })
    this.sidebarOpenSub = this.dataEvaluationService.sidebarOpen.subscribe(val => {
      this.sidebarOpen = val;
      setTimeout(() => {
        window.dispatchEvent(new Event("resize"));
      }, 100)
    });

    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.url = this.router.url;
      }
    });
    this.url = this.router.url;
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
    this.facilityListSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.routerSub.unsubscribe();
  }


  toggleSidebar() {
    this.emitToggleCollapse.emit(!this.sidebarOpen);
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

  setHoverAccount(bool: boolean) {
    this.hoverAccount = bool;
  }

  goToDataWizard() {
    this.router.navigateByUrl('/data-management/' + this.account.guid);
  }
}

export interface FacilityListItem {
  guid: string, color: string, id: number, modifiedDate: Date,
  facilityOrder: number
}