import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { AccountHomeService } from './account-home.service';
import * as _ from 'lodash';

@Component({
  selector: 'app-account-home',
  templateUrl: './account-home.component.html',
  styleUrls: ['./account-home.component.css']
})
export class AccountHomeComponent implements OnInit {

  accountFacilities: Array<IdbFacility>;
  selectedAccountSub: Subscription;
  account: IdbAccount;
  constructor(private facilityDbService: FacilitydbService, private accountDbService: AccountdbService,
    private accountHomeService: AccountHomeService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val
      this.accountHomeService.setCalanderizedMeters();
      this.accountFacilities = this.facilityDbService.accountFacilities.getValue();
    })
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
  }
}
