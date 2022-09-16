import { Component, OnInit } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';
import { SettingsFormsService } from 'src/app/shared/settings-forms/settings-forms.service';
import { SetupWizardService } from '../setup-wizard.service';
import { Subscription } from 'rxjs';
@Component({
  selector: 'app-setup-account',
  templateUrl: './setup-account.component.html',
  styleUrls: ['./setup-account.component.css']
})
export class SetupAccountComponent implements OnInit {


  generalInformationInvalid: boolean;
  unitsValid: boolean;
  reportingValid: boolean;
  accountSub: Subscription
  constructor(private accountdbService: AccountdbService, private setupWizardService: SetupWizardService,
    private settingsFormService: SettingsFormsService) { }

  ngOnInit(): void {
    if (this.setupWizardService.account.getValue() == undefined) {
      let newAccount: IdbAccount = this.accountdbService.getNewIdbAccount();
      this.setupWizardService.account.next(newAccount);
    }

    // this.accountSub = this.setupWizardService.account.subscribe(val => {
    //   this.setValidation(val);
    // })
  }

  // ngOnDestroy() {
  //   this.accountSub.unsubscribe();
  // }

  setValidation(account: IdbAccount) {
    // this.settingsFormService.getUnitsForm(account);
    console.log(account);
    this.generalInformationInvalid = this.settingsFormService.getGeneralInformationForm(account).invalid;
    // this.settingsFormService.getSustainabilityQuestionsForm(account);
    console.log(this.generalInformationInvalid);

    let canContinue: boolean = (this.generalInformationInvalid && this.unitsValid && this.reportingValid);
    this.setupWizardService.canContinue.next(canContinue);
  }


}
