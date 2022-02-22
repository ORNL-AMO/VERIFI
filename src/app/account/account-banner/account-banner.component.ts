import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { HelpPanelService } from 'src/app/help-panel/help-panel.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbUtilityMeterData } from 'src/app/models/idb';

@Component({
  selector: 'app-account-banner',
  templateUrl: './account-banner.component.html',
  styleUrls: ['./account-banner.component.css']
})
export class AccountBannerComponent implements OnInit {

  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  meterDataSub: Subscription;
  meterData: Array<IdbUtilityMeterData>;
  constructor(private helpPanelService: HelpPanelService, private accountDbService: AccountdbService,
    private router: Router, private utilityMeterDataDbService: UtilityMeterDatadbService) { }

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

  toggleHelpPanel() {
    let helpPanelOpen: boolean = this.helpPanelService.helpPanelOpen.getValue();
    this.helpPanelService.helpPanelOpen.next(!helpPanelOpen);
  }

}
