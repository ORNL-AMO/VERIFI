import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';

@Component({
  selector: 'app-data-wizard-home',
  standalone: false,
  
  templateUrl: './data-wizard-home.component.html',
  styleUrl: './data-wizard-home.component.css'
})
export class DataWizardHomeComponent {

  account: IdbAccount;
  accountSub: Subscription;
  constructor(private accountDbService: AccountdbService){

  }

  ngOnInit(){
    this.accountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.account = account;
    })
  }

  ngOnDestroy(){
    this.accountSub.unsubscribe();
  }
}
