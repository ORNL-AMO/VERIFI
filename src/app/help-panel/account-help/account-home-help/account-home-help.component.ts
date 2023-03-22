import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-account-home-help',
  templateUrl: './account-home-help.component.html',
  styleUrls: ['./account-home-help.component.css']
})
export class AccountHomeHelpComponent {
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
