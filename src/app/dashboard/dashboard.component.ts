import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from '../indexedDB/account-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from '../models/idb';
import { Router, Event, NavigationStart, NavigationEnd } from '@angular/router';

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
  facilityDashboard: boolean;
  breadcrumbFacility: number;

  accountFacilitiesSub: Subscription;
  facilityList: Array<IdbFacility>;

  constructor(
    private accountDbService: AccountdbService, 
    private facilityDbService: FacilitydbService,
    private router: Router
    ) {
    // Close menus on navigation
    router.events.subscribe((event: Event) => {
      if (event instanceof NavigationEnd) {
        this.facilityDashboard = event.urlAfterRedirects.includes('facility-summary');
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
        this.breadcrumbFacility = -1;
      } else if (this.selectedFacility) {
        this.breadcrumbFacility = this.selectedFacility.id;
      }
    });

    this.accountFacilitiesSub = this.facilityDbService.accountFacilities.subscribe(accountFacilities => {
      this.facilityList = accountFacilities;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  switchFacility(facility: number) {
    if (facility == -1) {
      this.router.navigateByUrl('/account-summary');
    } else {
      const index = this.facilityList.map(function(e) { return e.id; }).indexOf(+facility);
      this.facilityDbService.selectedFacility.next(this.facilityList[index]);
      this.router.navigateByUrl('/facility-summary');
    }
  }
}
