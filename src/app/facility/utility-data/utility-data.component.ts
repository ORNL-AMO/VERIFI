import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from '../../indexedDB/account-db.service';
import { FacilitydbService } from '../../indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from '../../models/idb';
import { MeterGroupingService } from './meter-grouping/meter-grouping.service';

@Component({
  selector: 'app-utility-data',
  templateUrl: './utility-data.component.html',
  styleUrls: ['./utility-data.component.css']
})
export class UtilityDataComponent implements OnInit {

  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;

  selectedAccountSub: Subscription;
  selectedFacilitySub: Subscription;
  constructor(
    private accountdbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private meterGroupingService: MeterGroupingService
  ) {
  }

  ngOnInit() {
    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(selectedAccount => {
      this.selectedAccount = selectedAccount;
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
    this.meterGroupingService.dateRange.next({ minDate: undefined, maxDate: undefined })
  }
}
