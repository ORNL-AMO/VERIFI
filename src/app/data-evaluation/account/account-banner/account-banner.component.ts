import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';

@Component({
  selector: 'app-account-banner',
  templateUrl: './account-banner.component.html',
  styleUrls: ['./account-banner.component.css'],
  standalone: false
})
export class AccountBannerComponent implements OnInit {

  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  meterDataSub: Subscription;
  meterData: Array<IdbUtilityMeterData>;
  constructor(private accountDbService: AccountdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.selectedAccount = account;
    });

    this.meterDataSub = this.utilityMeterDataDbService.accountMeterData.subscribe(val => {
      this.meterData = val;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.meterDataSub.unsubscribe();
  }
}
