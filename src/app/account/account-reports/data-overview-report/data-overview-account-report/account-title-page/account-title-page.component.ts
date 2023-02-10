import { Component } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';
import { getNAICS } from 'src/app/shared/form-data/naics-data';

@Component({
  selector: 'app-account-title-page',
  templateUrl: './account-title-page.component.html',
  styleUrls: ['./account-title-page.component.css']
})
export class AccountTitlePageComponent {
  account: IdbAccount;
  
  naics: string;
  constructor(private accountDbService: AccountdbService) {

  }

  ngOnInit() {
    this.account = this.accountDbService.selectedAccount.getValue();
    this.naics = getNAICS(this.account);
  }
}
