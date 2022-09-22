import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { IdbAccount } from 'src/app/models/idb';
import { SettingsFormsService } from 'src/app/shared/settings-forms/settings-forms.service';
import { SetupWizardService } from '../setup-wizard.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
@Component({
  selector: 'app-setup-account',
  templateUrl: './setup-account.component.html',
  styleUrls: ['./setup-account.component.css']
})
export class SetupAccountComponent implements OnInit {


  generalInformationInvalid: boolean;
  unitsInvalid: boolean;
  reportingInvalid: boolean;
  missingEmissions: boolean;
  missingEnergyReductionGoal: boolean;
  accountSub: Subscription;
  unitsClass: 'badge-danger' | 'badge-success' | 'badge-warning';
  reportingClass: 'badge-danger' | 'badge-success' | 'badge-warning';
  constructor(private accountdbService: AccountdbService, private setupWizardService: SetupWizardService,
    private settingsFormService: SettingsFormsService, private router: Router, private cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    if (this.setupWizardService.account.getValue() == undefined) {
      let newAccount: IdbAccount = this.accountdbService.getNewIdbAccount();
      this.setupWizardService.account.next(newAccount);
    }

    this.accountSub = this.setupWizardService.account.subscribe(val => {
      this.setValidation(val);
      this.setUnitsClass();
      this.setReportsClass();

    })
  }

  ngOnDestroy() {
    this.accountSub.unsubscribe();
  }

  setValidation(account: IdbAccount) {
    this.unitsInvalid = this.settingsFormService.getUnitsForm(account).invalid;
    this.reportingInvalid = this.settingsFormService.getSustainabilityQuestionsForm(account).invalid;
    this.generalInformationInvalid = this.settingsFormService.getGeneralInformationForm(account).invalid;
    this.missingEmissions = !account.eGridSubregion;
    this.missingEnergyReductionGoal = !account.sustainabilityQuestions.energyReductionGoal;
    if (this.router.url.includes('information-setup')) {
      this.setupWizardService.canContinue.next(!this.generalInformationInvalid);
    } else if (this.router.url.includes('units-setup')) {
      this.setupWizardService.canContinue.next(!this.unitsInvalid);
    } else if (this.router.url.includes('reporting-setup')) {
      this.setupWizardService.canContinue.next(!this.reportingInvalid);
    }
  }

  setUnitsClass() {
    let badgeClass: 'badge-danger' | 'badge-success' | 'badge-warning' = 'badge-success';
    if (this.unitsInvalid) {
      badgeClass = 'badge-danger';
    } else if (this.missingEmissions) {
      badgeClass = 'badge-warning';
    }
    this.unitsClass = badgeClass;
    this.cd.detectChanges();
  }

  setReportsClass() {
    let badgeClass: 'badge-danger' | 'badge-success' | 'badge-warning' = 'badge-success';
    if (this.reportingInvalid) {
      badgeClass = 'badge-danger';
    } else if (this.missingEnergyReductionGoal) {
      badgeClass = 'badge-warning';
    }
    this.reportingClass = badgeClass;
    this.cd.detectChanges();
  }


}
