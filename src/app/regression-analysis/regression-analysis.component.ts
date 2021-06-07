import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from '../indexedDB/account-db.service';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from '../models/idb';

@Component({
  selector: 'app-regression-analysis',
  templateUrl: './regression-analysis.component.html',
  styleUrls: ['./regression-analysis.component.css']
})
export class RegressionAnalysisComponent implements OnInit {

  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;

  selectedAccountSub: Subscription;
  selectedFacilitySub: Subscription;

  
  constructor(
    public accountdbService: AccountdbService,
    public facilityDbService: FacilitydbService,
  ) { }

  ngOnInit() {
    this.selectedAccountSub = this.accountdbService.selectedAccount.subscribe(selectedAccount => {
      this.selectedAccount = selectedAccount;
    });

    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(selectedFacility => {
      this.selectedFacility = selectedFacility;
    });
}

ngOnDestroy(){
  this.selectedAccountSub.unsubscribe();
  this.selectedFacilitySub.unsubscribe();
}


}
