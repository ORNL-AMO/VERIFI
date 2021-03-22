import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDatadbService } from '../../indexedDB/utilityMeterData-db.service';

@Component({
  selector: 'app-account-overview',
  templateUrl: './account-overview.component.html',
  styleUrls: ['./account-overview.component.css', '../dashboard.component.css']
})
export class AccountOverviewComponent implements OnInit {

  todaysDate: Date;
  yearAgoDate: Date;
  utilityMeterAccountData: Array<IdbUtilityMeterData>;
  accountMeterDataSub: Subscription;
  
  constructor(public utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.todaysDate = new Date();
    this.yearAgoDate = new Date((this.todaysDate.getFullYear() - 1), this.todaysDate.getMonth());   

    this.accountMeterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(utilityMeterAccountData => {
      this.utilityMeterAccountData = utilityMeterAccountData;
    });
  }

  ngOnDestroy() {
    this.accountMeterDataSub.unsubscribe();
  }

}
