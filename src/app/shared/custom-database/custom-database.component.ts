import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { SharedDataService } from 'src/app/shared/helper-services/shared-data.service';

@Component({
    selector: 'app-custom-database',
    templateUrl: './custom-database.component.html',
    styleUrls: ['./custom-database.component.css'],
    standalone: false
})
export class CustomDatabaseComponent implements OnInit {

  modalOpen: boolean;
  modalOpenSub: Subscription;

  account: IdbAccount;
  accountSub: Subscription;
  constructor(private sharedDataService: SharedDataService,
    private accountDbService: AccountdbService
  ) { }

  ngOnInit(): void {
    this.modalOpenSub = this.sharedDataService.modalOpen.subscribe(val => {
      this.modalOpen = val;
    });
    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.account = account;
    });
  }

  ngOnDestroy(){
    this.modalOpenSub.unsubscribe();
    this.accountSub.unsubscribe();
  }


}
