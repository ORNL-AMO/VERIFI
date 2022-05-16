import { Component, OnInit } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';
import { SetupWizardService } from '../setup-wizard.service';

@Component({
  selector: 'app-setup-account',
  templateUrl: './setup-account.component.html',
  styleUrls: ['./setup-account.component.css']
})
export class SetupAccountComponent implements OnInit {

  constructor(private accountdbService: AccountdbService, private setupWizardService: SetupWizardService) { }

  ngOnInit(): void {
    if(this.setupWizardService.account.getValue() == undefined){
      let newAccount: IdbAccount = this.accountdbService.getNewIdbAccount();
      this.setupWizardService.account.next(newAccount);
    }
  }

}
