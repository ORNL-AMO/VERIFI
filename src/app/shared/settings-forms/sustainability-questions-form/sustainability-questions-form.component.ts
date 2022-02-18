import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { SettingsFormsService } from '../settings-forms.service';

@Component({
  selector: 'app-sustainability-questions-form',
  templateUrl: './sustainability-questions-form.component.html',
  styleUrls: ['./sustainability-questions-form.component.css']
})
export class SustainabilityQuestionsFormComponent implements OnInit {
  @Input()
  inAccount: boolean;

  form: FormGroup;
  selectedFacilitySub: Subscription;
  selectedAccountSub: Subscription;
  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  sustainQuestionsDontMatchAccount: boolean;
  years: Array<number> = new Array();
  isFormChange: boolean = false;
  constructor(private accountDbService: AccountdbService, private settingsFormsService: SettingsFormsService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.selectedAccount = account;
      if (account && this.inAccount) {
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
        this.sustainQuestionsDontMatchAccount = this.settingsFormsService.areAccountAndFacilitySustainQuestionsDifferent(this.selectedAccount, this.selectedFacility);
        if (this.isFormChange == false) {
          this.form = this.settingsFormsService.getSustainabilityQuestionsForm(facility);
        } else {
          this.isFormChange = false;
        }
      }
    });
    for (let i = 2050; i > 2000; i--) {
      this.years.push(i);
    }
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  saveChanges() {
    this.isFormChange = true;
    if (!this.inAccount) {
      this.selectedFacility = this.settingsFormsService.updateFacilityFromSustainabilityQuestionsForm(this.form, this.selectedFacility);
      this.facilityDbService.update(this.selectedFacility);
    }
    if (this.inAccount) {
      this.selectedAccount = this.settingsFormsService.updateAccountFromSustainabilityQuestionsForm(this.form, this.selectedAccount);
      this.accountDbService.update(this.selectedAccount);
    }
  }

  setAccountSustainQuestions() {
    this.form = this.settingsFormsService.setAccountSustainQuestions(this.form, this.selectedAccount);
    this.saveChanges();
  }

  changeBaselineYear(baselineControlName: string, targetControlName: string) {
    let baselineValue: number = this.form.get(baselineControlName).value;
    if (!this.form.get(targetControlName).value || this.form.get(targetControlName).value < baselineValue) {
      let value: number = baselineValue + 10;
      if(value > 2050){
        value = 2050;
      }
      this.form.get(targetControlName).patchValue(value);
    }
    this.saveChanges();
  }
}
