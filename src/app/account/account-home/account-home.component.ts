import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { AccountHomeService } from './account-home.service';

@Component({
  selector: 'app-account-home',
  templateUrl: './account-home.component.html',
  styleUrls: ['./account-home.component.css']
})
export class AccountHomeComponent implements OnInit {

  accountFacilities: Array<IdbFacility>;
  accountMeterDataSub: Subscription;
  constructor(private facilityDbService: FacilitydbService, private accountDbService: AccountdbService,
    private accountHomeService: AccountHomeService, private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
      this.accountHomeService.setCalanderizedMeters();
      this.accountHomeService.setAnalysisSummary(selectedAccount);
      this.accountFacilities = this.facilityDbService.accountFacilities.getValue();
    })
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
  }

}
