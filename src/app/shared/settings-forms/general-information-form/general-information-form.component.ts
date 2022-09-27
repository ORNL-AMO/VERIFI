import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Countries, Country } from 'src/app/shared/form-data/countries';
import { FirstNaicsList, NAICS, SecondNaicsList, ThirdNaicsList } from 'src/app/shared/form-data/naics-data';
import { State, States } from 'src/app/shared/form-data/states';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { SettingsFormsService } from '../settings-forms.service';
import { SetupWizardService } from 'src/app/setup-wizard/setup-wizard.service';

@Component({
  selector: 'app-general-information-form',
  templateUrl: './general-information-form.component.html',
  styleUrls: ['./general-information-form.component.css']
})
export class GeneralInformationFormComponent implements OnInit {
  @Input()
  inAccount: boolean;
  @Input()
  inWizard: boolean;



  form: FormGroup;
  unitsOfMeasure: string;
  formNameLabel: string = "Account";
  selectedFacilitySub: Subscription;
  selectedAccountSub: Subscription;
  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  firstNaicsList: Array<NAICS> = FirstNaicsList;
  secondNaicsList: Array<NAICS> = SecondNaicsList;
  thirdNaicsList: Array<NAICS> = ThirdNaicsList;
  countries: Array<Country> = Countries;
  states: Array<State> = States;
  isFormChange: boolean = false;
  constructor(private accountDbService: AccountdbService, private settingsFormsService: SettingsFormsService, private facilityDbService: FacilitydbService,
    private setupWizardService: SetupWizardService) { }

  ngOnInit(): void {
    if (this.inAccount) {
      if (!this.inWizard) {
        this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
          this.selectedAccount = account;
          if (account && this.inAccount) {
            if (this.isFormChange == false) {
              this.form = this.settingsFormsService.getGeneralInformationForm(account);
              this.unitsOfMeasure = this.selectedAccount.unitsOfMeasure;
            } else {
              this.isFormChange = false;
            }
          }
        });
      } else {
        this.selectedAccountSub = this.setupWizardService.account.subscribe(account => {
          this.selectedAccount = account;
          if (account && this.inAccount) {
            if (this.isFormChange == false) {
              this.form = this.settingsFormsService.getGeneralInformationForm(account);
              this.unitsOfMeasure = this.selectedAccount.unitsOfMeasure;
            } else {
              this.isFormChange = false;
            }
          }
        });
      }
    } else if (!this.inAccount) {
      this.formNameLabel = "Facility";
      if (!this.inWizard) {
        this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
          this.selectedFacility = facility;
          if (facility) {
            if (this.isFormChange == false) {
              this.form = this.settingsFormsService.getGeneralInformationForm(facility);
              this.unitsOfMeasure = this.selectedFacility.unitsOfMeasure;
            } else {
              this.isFormChange = false;
            }
          }
        });
      } else {
        this.selectedFacilitySub = this.setupWizardService.selectedFacility.subscribe(facility => {
          this.selectedFacility = facility;
          if (facility) {
            if (this.isFormChange == false) {
              this.form = this.settingsFormsService.getGeneralInformationForm(facility);
              this.unitsOfMeasure = this.selectedFacility.unitsOfMeasure;
            } else {
              this.isFormChange = false;
            }
          }
        });
      }
    }
  }

  ngOnDestroy() {
    if (this.inAccount) {
      this.selectedAccountSub.unsubscribe();
    }
    if (!this.inAccount) {
      this.selectedFacilitySub.unsubscribe();
    }
  }

  async saveChanges() {
    this.isFormChange = true;
    if (!this.inAccount) {
      if (!this.inWizard) {
        this.selectedFacility = this.settingsFormsService.updateFacilityFromGeneralInformationForm(this.form, this.selectedFacility);
        let updatedFacility: IdbFacility = await this.facilityDbService.updateWithObservable(this.selectedFacility).toPromise();
        let allFacilities: Array<IdbFacility> = await this.facilityDbService.getAll().toPromise();
        this.facilityDbService.selectedFacility.next(updatedFacility);
        let accountFacilities: Array<IdbFacility> = allFacilities.filter(facility => { return facility.accountId == this.selectedFacility.accountId });
        this.facilityDbService.accountFacilities.next(accountFacilities);
      } else {
        this.selectedFacility = this.settingsFormsService.updateFacilityFromGeneralInformationForm(this.form, this.selectedFacility);
        this.setupWizardService.selectedFacility.next(this.selectedFacility);
      }
    }
    if (this.inAccount) {
      if (!this.inWizard) {
        this.selectedAccount = this.settingsFormsService.updateAccountFromGeneralInformationForm(this.form, this.selectedAccount);
        let updatedAccount: IdbAccount = await this.accountDbService.updateWithObservable(this.selectedAccount).toPromise();
        let allAccounts: Array<IdbAccount> = await this.accountDbService.getAll().toPromise();
        this.accountDbService.selectedAccount.next(updatedAccount);
        this.accountDbService.allAccounts.next(allAccounts);
      } else {
        this.selectedAccount = this.settingsFormsService.updateAccountFromGeneralInformationForm(this.form, this.selectedAccount);
        this.setupWizardService.account.next(this.selectedAccount);
      }
    }
  }

  checkNAICS() {
    //make sure sublist selections are a part of selected parent
    if (this.form.controls.naics1.value && this.form.controls.naics2.value) {
      let naicsItem: NAICS = this.secondNaicsList.find(item => { return item.code == this.form.controls.naics2.value });
      if (naicsItem && naicsItem.matchNum != this.form.controls.naics1.value) {
        this.form.controls.naics2.patchValue(null);
        this.form.controls.naics2.updateValueAndValidity();
      }
    }

    if (this.form.controls.naics2.value && this.form.controls.naics3.value) {
      let naicsItem: NAICS = this.thirdNaicsList.find(item => { return item.code == this.form.controls.naics3.value });
      if (naicsItem && naicsItem.matchNum != this.form.controls.naics2.value) {
        this.form.controls.naics3.patchValue(null);
        this.form.controls.naics3.updateValueAndValidity();
      }
    }
    this.saveChanges();
  }
}
