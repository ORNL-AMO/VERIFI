import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { SetupWizardService } from 'src/app/setup-wizard/setup-wizard.service';
import { SettingsFormsService } from '../settings-forms.service';

@Component({
  selector: 'app-sustainability-questions-form',
  templateUrl: './sustainability-questions-form.component.html',
  styleUrls: ['./sustainability-questions-form.component.css']
})
export class SustainabilityQuestionsFormComponent implements OnInit {
  @Input()
  inAccount: boolean;
  @Input()
  inWizard: boolean;

  form: FormGroup;
  selectedFacilitySub: Subscription;
  selectedAccountSub: Subscription;
  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  sustainQuestionsDontMatchAccount: boolean;
  years: Array<number> = new Array();
  isFormChange: boolean = false;
  fiscalYearOption: "calendarYear" | "nonCalendarYear";
  constructor(private accountDbService: AccountdbService, private settingsFormsService: SettingsFormsService, private facilityDbService: FacilitydbService,
    private setupWizardService: SetupWizardService) { }

  ngOnInit(): void {
    if (!this.inWizard) {
      this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
        this.selectedAccount = account;
        if (account && this.inAccount) {
          this.fiscalYearOption = account.fiscalYear;
          if (this.isFormChange == false) {
            this.form = this.settingsFormsService.getSustainabilityQuestionsForm(account);
          } else {
            this.isFormChange = false;
          }
        }
      });


      this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
        this.selectedFacility = facility;
        if (facility && !this.inAccount) {
          this.fiscalYearOption = facility.fiscalYear;
          this.sustainQuestionsDontMatchAccount = this.settingsFormsService.areAccountAndFacilitySustainQuestionsDifferent(this.selectedAccount, this.selectedFacility);
          if (this.isFormChange == false) {
            this.form = this.settingsFormsService.getSustainabilityQuestionsForm(facility);
          } else {
            this.isFormChange = false;
          }
        }
      });
    } else {
      this.selectedAccountSub = this.setupWizardService.account.subscribe(account => {
        this.selectedAccount = account;
        if (account && this.inAccount) {
          this.fiscalYearOption = account.fiscalYear;
          if (this.isFormChange == false) {
            this.form = this.settingsFormsService.getSustainabilityQuestionsForm(account);
          } else {
            this.isFormChange = false;
          }
        }
      });

      this.selectedFacilitySub = this.setupWizardService.selectedFacility.subscribe(facility => {
        this.selectedFacility = facility;
        if (facility && !this.inAccount) {
          this.fiscalYearOption = facility.fiscalYear;
          this.sustainQuestionsDontMatchAccount = this.settingsFormsService.areAccountAndFacilitySustainQuestionsDifferent(this.selectedAccount, this.selectedFacility);
          if (this.isFormChange == false) {
            this.form = this.settingsFormsService.getSustainabilityQuestionsForm(facility);
          } else {
            this.isFormChange = false;
          }
        }
      });
    }
    for (let i = 2050; i > 2000; i--) {
      this.years.push(i);
    }
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  async saveChanges() {
    this.isFormChange = true;
    if (!this.inWizard) {
      if (!this.inAccount) {
        this.selectedFacility = this.settingsFormsService.updateFacilityFromSustainabilityQuestionsForm(this.form, this.selectedFacility);
        let updatedFacility: IdbFacility = await this.facilityDbService.updateWithObservable(this.selectedFacility).toPromise();
        let allFacilities: Array<IdbFacility> = await this.facilityDbService.getAll().toPromise();
        this.facilityDbService.selectedFacility.next(updatedFacility);
        let accountFacilities: Array<IdbFacility> = allFacilities.filter(facility => { return facility.accountId == this.selectedFacility.accountId });
        this.facilityDbService.accountFacilities.next(accountFacilities);
      }
      if (this.inAccount) {
        this.selectedAccount = this.settingsFormsService.updateAccountFromSustainabilityQuestionsForm(this.form, this.selectedAccount);
        let updatedAccount: IdbAccount = await this.accountDbService.updateWithObservable(this.selectedAccount).toPromise();
        let allAccounts: Array<IdbAccount> = await this.accountDbService.getAll().toPromise();
        this.accountDbService.selectedAccount.next(updatedAccount);
        this.accountDbService.allAccounts.next(allAccounts);
      }
    } else {
      if (!this.inAccount) {
        this.selectedFacility = this.settingsFormsService.updateFacilityFromSustainabilityQuestionsForm(this.form, this.selectedFacility);
        this.setupWizardService.selectedFacility.next(this.selectedFacility);
      }
      if (this.inAccount) {
        this.selectedAccount = this.settingsFormsService.updateAccountFromSustainabilityQuestionsForm(this.form, this.selectedAccount);
        this.setupWizardService.account.next(this.selectedAccount);
      }
    }
  }

  setAccountSustainQuestions() {
    this.form = this.settingsFormsService.setAccountSustainQuestions(this.form, this.selectedAccount);
    this.saveChanges();
  }

  changeBaselineYear(baselineControlName: string, targetControlName: string) {
    let baselineValue: number = this.form.get(baselineControlName).value;
    let value: number = baselineValue + 10;
    if (value > 2050) {
      value = 2050;
    }
    this.form.get(targetControlName).patchValue(value);
    this.saveChanges();
  }
}
