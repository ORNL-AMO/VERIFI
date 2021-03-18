import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from '../indexedDB/account-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from '../indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeterData } from '../models/idb';

@Component({
  selector: 'app-utility',
  templateUrl: './utility.component.html',
  styleUrls: ['./utility.component.css']
})
export class UtilityComponent implements OnInit {

  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  appRendered: boolean;
  utilityMeterData: Array<IdbUtilityMeterData>;

  selectedAccountSub: Subscription;
  selectedFacilitySub: Subscription;
  utilityDataSub: Subscription;
  
  constructor(
    public accountdbService: AccountdbService,
    public facilityDbService: FacilitydbService,
    public utilityMeterDataDbService: UtilityMeterDatadbService,
  ) { }

  ngOnInit() {
    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(selectedAccount => {
      this.selectedAccount = selectedAccount;
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });

    this.utilityDataSub = this.utilityMeterDataDbService.facilityMeterData.subscribe(utilityMeterData => {
      this.utilityMeterData = utilityMeterData;
    });

    // TEMP MANUAL DELAY TO PREVENT PAGE FLICKERING.
    // ADDING TICKET TO FIX THIS BUG
    const self = this;
    setTimeout(function(){ self.appRendered = true}, 200);
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

}
