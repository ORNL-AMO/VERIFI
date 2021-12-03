import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from '../indexedDB/account-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from '../models/idb';
import { Router, Event, NavigationEnd } from '@angular/router';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { DashboardService } from './dashboard.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {
  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  facilityList: Array<IdbFacility>;
  isFacilityDashboard: boolean;
  breadcrumbFacilityId: number;
  utilityMeters: Array<IdbUtilityMeter>;

  selectedAccountSub: Subscription;
  selectedFacilitySub: Subscription;
  utilityDataSub: Subscription;
  accountFacilitiesSub: Subscription;

  graphDisplay: "cost" | "usage" | "emissions";
  graphDisplaySub: Subscription;
  bannerDropdownOpen: boolean;
  bannerDropdownOpenSub: Subscription;
  constructor(
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    public utilityMeterDbService: UtilityMeterdbService,
    private router: Router,
    private dashboardService: DashboardService
  ) {
    router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.isFacilityDashboard = event.urlAfterRedirects.includes('facility-summary');
        if (this.isFacilityDashboard && this.selectedFacility) {
          this.breadcrumbFacilityId = this.selectedFacility.id
        } else {
          this.breadcrumbFacilityId = undefined;
        }
      }
    });
  }

  ngOnInit() {
    if (this.router.url.includes('facility-summary')) {
      this.isFacilityDashboard = true;
    }
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(val => {
      this.selectedFacility = val;
      if (this.router.url.indexOf('account-summary') > -1) {
        this.breadcrumbFacilityId = undefined;
      } else if (this.selectedFacility) {
        this.breadcrumbFacilityId = this.selectedFacility.id;
      }
    });

    this.accountFacilitiesSub = this.facilityDbService.accountFacilities.subscribe(accountFacilities => {
      this.facilityList = accountFacilities;
    });

    this.utilityDataSub = this.utilityMeterDbService.facilityMeters.subscribe(utilityMeters => {
      this.utilityMeters = utilityMeters;
    });

    this.graphDisplaySub = this.dashboardService.graphDisplay.subscribe(val => {
      this.graphDisplay = val;
    });

    this.bannerDropdownOpenSub = this.dashboardService.bannerDropdownOpen.subscribe(val => {
      this.bannerDropdownOpen = val;
    })
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.accountFacilitiesSub.unsubscribe();
    this.graphDisplaySub.unsubscribe();
    this.bannerDropdownOpenSub.unsubscribe();
  }

  switchFacility() {
    if (this.breadcrumbFacilityId == undefined) {
      this.router.navigateByUrl('/account-summary');
    } else {
      let selectedFacility: IdbFacility = this.facilityList.find(facility => { return facility.id == this.breadcrumbFacilityId });
      this.facilityDbService.selectedFacility.next(selectedFacility);
      this.router.navigateByUrl('/facility-summary');
    }
  }

  setGraphDisplay(str: "cost" | "usage" | "emissions") {
    this.dashboardService.graphDisplay.next(str);
  }

  setAccountEnergyIsSource(energyIsSource: boolean) {
    this.selectedAccount.energyIsSource = energyIsSource;
    this.accountDbService.update(this.selectedAccount);
  }

  setFacilityEnergyIsSource(energyIsSource: boolean) {
    this.selectedFacility.energyIsSource = energyIsSource;
    this.facilityDbService.update(this.selectedFacility);
  }
}
