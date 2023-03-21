import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-account-overview-help',
  templateUrl: './account-overview-help.component.html',
  styleUrls: ['./account-overview-help.component.css']
})
export class AccountOverviewHelpComponent {

  selectedAccount: IdbAccount;
  selectedAccountSub: Subscription;
  constructor(private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(selectedAccount => {
      this.selectedAccount = selectedAccount;
    });
  }

  ngOnDestroy(){
    this.selectedAccountSub.unsubscribe();
  }

}
