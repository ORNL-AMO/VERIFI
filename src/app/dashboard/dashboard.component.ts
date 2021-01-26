import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from '../indexedDB/account-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from '../models/idb';
import { Router, Event, NavigationEnd } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit {

  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  selectedFacility: IdbFacility;
  selectedFacilitySub: Subscription;
  isFacilityDashboard: boolean;
  breadcrumbFacilityId: number;

  accountFacilitiesSub: Subscription;
  facilityList: Array<IdbFacility>;

  constructor(
    private accountDbService: AccountdbService, 
    private facilityDbService: FacilitydbService,
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
