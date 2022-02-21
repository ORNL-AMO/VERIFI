import { Component, OnInit } from '@angular/core';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { SetupWizardService } from '../setup-wizard.service';

@Component({
  selector: 'app-setup-confirmation',
  templateUrl: './setup-confirmation.component.html',
  styleUrls: ['./setup-confirmation.component.css']
})
export class SetupConfirmationComponent implements OnInit {

  account: IdbAccount;
  facilities: Array<IdbFacility>;
  constructor(private setupWizardService: SetupWizardService) { }

  ngOnInit(): void {
    this.account = this.setupWizardService.account.getValue();
    this.facilities = this.setupWizardService.facilities;
  }

  submit(){
    
  }
}
