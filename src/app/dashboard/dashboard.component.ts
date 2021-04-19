import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from '../indexedDB/account-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from '../models/idb';
import { Router, Event, NavigationEnd } from '@angular/router';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';

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
  // appRendered: boolean = false;

  constructor(
    private accountDbService: AccountdbService, 
    private facilityDbService: FacilitydbService,
    public utilityMeterDbService: UtilityMeterdbService,
    private router: Router
    ) {
    router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.isFacilityDashboard = event.urlAfterRedirects.includes('facility-summary');
        if(this.isFacilityDashboard && this.selectedFacility){
          this.breadcrumbFacilityId = this.selectedFacility.id
        }else{
          this.breadcrumbFacilityId = undefined;
        }
      }
    });
  }

  ngOnInit() {
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

    // TEMP MANUAL DELAY TO PREVENT PAGE FLICKERING.
    // ADDING TICKET TO FIX THIS BUG
    // const self = this;
    // setTimeout(function(){ self.appRendered = true}, 300);
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.accountFacilitiesSub.unsubscribe();
  }

  switchFacility() {
    if (this.breadcrumbFacilityId == undefined) {
      this.router.navigateByUrl('/account-summary');
    } else {
      let selectedFacility: IdbFacility = this.facilityList.find(facility => {return facility.id == this.breadcrumbFacilityId});
      this.facilityDbService.selectedFacility.next(selectedFacility);
      this.router.navigateByUrl('/facility-summary');
    }
  }
}
