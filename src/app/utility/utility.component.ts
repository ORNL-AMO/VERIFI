import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountdbService } from '../indexedDB/account-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from '../models/idb';
import { MeterGroupingService } from './meter-grouping/meter-grouping.service';

@Component({
  selector: 'app-utility',
  templateUrl: './utility.component.html',
  styleUrls: ['./utility.component.css']
})
export class UtilityComponent implements OnInit {

  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;

  selectedAccountSub: Subscription;
  selectedFacilitySub: Subscription;
  showSiteToSourceOption: boolean;
  constructor(
    private accountdbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private meterGroupingService: MeterGroupingService,
    private router: Router
  ) {
  }

  ngOnInit() {
    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(selectedAccount => {
      this.selectedAccount = selectedAccount;
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });

    this.router.events.subscribe((val) => {
      if (val instanceof NavigationEnd) {
        this.setShowSiteToSourceOption(val.url);
      }
    });
    this.setShowSiteToSourceOption(this.router.url);
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.meterGroupingService.dateRange.next({ minDate: undefined, maxDate: undefined })
  }

  setShowSiteToSourceOption(url: string) {
    if (url.includes('monthly-meter-data') || url.includes('meter-groups') || url.includes('visualization')) {
      this.showSiteToSourceOption = true;
    } else {
      this.showSiteToSourceOption = false;
    }
  }

}
