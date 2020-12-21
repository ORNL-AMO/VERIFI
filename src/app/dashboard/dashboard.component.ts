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
  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService,
    router: Router) {
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
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

}
