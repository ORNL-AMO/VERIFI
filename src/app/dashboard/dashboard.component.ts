import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from '../indexedDB/account-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from '../models/idb';

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
  constructor(private accountDbService: AccountdbService, private facilityDbService: FacilitydbService, private activatedRoute: ActivatedRoute) {
  }

  ngOnInit() {
    this.activatedRoute.firstChild.url.subscribe(val => {
      this.facilityDashboard = (val[0].path != 'account-summary')
    })

    this.activatedRoute.data.subscribe(val => {
      console.log(val);
    })
    this.activatedRoute.url.subscribe(val => {
      console.log(val)
    })


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
