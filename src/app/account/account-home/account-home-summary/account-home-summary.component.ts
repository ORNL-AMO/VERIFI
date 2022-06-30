import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';

@Component({
  selector: 'app-account-home-summary',
  templateUrl: './account-home-summary.component.html',
  styleUrls: ['./account-home-summary.component.css']
})
export class AccountHomeSummaryComponent implements OnInit {

  account: IdbAccount;
  accountSub: Subscription;
  constructor(private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.accountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.account = val;
    });
  }

  ngOnDestroy(){
    this.accountSub.unsubscribe();
  }

}
