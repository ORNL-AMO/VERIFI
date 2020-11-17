import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { version } from '../../../../package.json';
import { AccountService } from "../../account/account/account.service";
import { AccountdbService } from "../../indexedDB/account-db.service";
import { FacilitydbService } from "../../indexedDB/facility-db-service";

@Component({
  selector: 'app-footer',
  templateUrl: './footer.component.html',
  styleUrls: ['./footer.component.css']
})
export class FooterComponent implements OnInit {
  accountid: number;
  date: Date = new Date();
  version: string = version;
  accountCount: number = 0;
  facilityCount: number = 0;
  facilityCountTotal: number = 0;


  allAccountsSub: Subscription;
  allFacilitiesSub: Subscription;
  accountFacilitiesSub: Subscription;
  constructor(
    public accountService: AccountService,
    public accountdbService: AccountdbService,
    public facilitydbService: FacilitydbService,
  ) { 

  }

  ngOnInit() {
    // Subscribe to account ID

   this.allAccountsSub = this.accountdbService.allAccounts.subscribe(allAccounts => {
      this.accountCount = allAccounts.length;
    });

   this.allFacilitiesSub = this.facilitydbService.allFacilities.subscribe(allFacilities => {
      this.facilityCountTotal = allFacilities.length;
    });

   this.accountFacilitiesSub = this.facilitydbService.accountFacilities.subscribe(accountFacilities => {
      this.facilityCount = accountFacilities.length;
    });
  }

  ngOnDestroy(){
    this.allAccountsSub.unsubscribe();
    this.allFacilitiesSub.unsubscribe();
    this.accountFacilitiesSub.unsubscribe();
  }
}
