import { Component, OnInit } from '@angular/core';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';

@Component({
  selector: 'app-account-overview-banner',
  templateUrl: './account-overview-banner.component.html',
  styleUrls: ['./account-overview-banner.component.css']
})
export class AccountOverviewBannerComponent implements OnInit {

  modalOpenSub: Subscription;
  modalOpen: boolean;
  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  constructor(private sharedDataService: SharedDataService, private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
    })
  }

  ngOnDestroy() {
    this.modalOpenSub.unsubscribe();
    this.selectedAccountSub.unsubscribe();
  }


  async setAccountEnergyIsSource(energyIsSource: boolean) {
    if (this.selectedAccount.energyIsSource != energyIsSource) {
      this.selectedAccount.energyIsSource = energyIsSource;
      let updatedAccount: IdbAccount = await this.accountDbService.updateWithObservable(this.selectedAccount).toPromise();
      let allAccounts: Array<IdbAccount> = await this.accountDbService.getAll().toPromise();
      this.accountDbService.allAccounts.next(allAccounts);
      this.accountDbService.selectedAccount.next(this.selectedAccount);
    }
  }

}
