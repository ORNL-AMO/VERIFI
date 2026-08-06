import { toObservable } from '@angular/core/rxjs-interop';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, Input, OnInit, inject, Injector } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Countries, Country } from 'src/app/shared/form-data/countries';
import { FirstNaicsList, NAICS, SecondNaicsList, ThirdNaicsList } from 'src/app/shared/form-data/naics-data';
import { State, States } from 'src/app/shared/form-data/states';
import { SettingsFormsService } from '../settings-forms.service';
import { FacilityClassification, FacilityClassifications } from 'src/app/models/constantsAndTypes';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { GeneralInformationService } from './general-information.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { ApplicationLifecycleService } from 'src/app/application-lifecycle/application-lifecycle.service';

@Component({
  selector: 'app-general-information-form',
  templateUrl: './general-information-form.component.html',
  styleUrls: ['./general-information-form.component.css'],
  standalone: false
})
export class GeneralInformationFormComponent implements OnInit {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly dbChangesService = inject(DbChangesService);
  private readonly applicationLifecycleService = inject(ApplicationLifecycleService);
  @Input()
  inAccount: boolean;

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
  facilityClassifications: Array<FacilityClassification> = FacilityClassifications;

  addressOptions: any[] = [];
  showModal: boolean = false;
  addressDisplayed: string;
  isSuccessful: boolean = true;
  modalAddress = new FormControl('');
  selectedCountry: string;

  constructor(
    private settingsFormsService: SettingsFormsService,
    private generalInformationService: GeneralInformationService,
    private injector: Injector
  ) { }

  ngOnInit(): void {
    if (this.inAccount) {
      this.selectedAccountSub = toObservable(this.accountWorkspaceStore.account, { injector: this.injector }).subscribe(account => {
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
    } else if (!this.inAccount) {
      this.formNameLabel = "Facility";
      this.selectedFacilitySub = toObservable(this.accountWorkspaceStore.selectedFacility, { injector: this.injector }).subscribe(facility => {
        this.selectedFacility = facility;
        if (facility) {
          if (this.isFormChange == false) {
            this.form = this.settingsFormsService.getGeneralInformationForm(facility);
            this.form.addControl('facilityClassification', new FormControl(this.selectedFacility.classification));
            this.unitsOfMeasure = this.selectedFacility.unitsOfMeasure;
          } else {
            this.isFormChange = false;
          }
        }
      });
    }
  }

  async getAddressInfo() {
    this.selectedCountry = this.form.get('country')?.value;
    const addressString = this.modalAddress?.value;
    if (addressString) {
      const response = await this.generalInformationService.getCompleteAddress(addressString);
      if (response && response.length > 0) {
        this.addressOptions = response.filter(data =>
          data.address?.country_code == this.selectedCountry.toLowerCase());
        if (this.addressOptions.length == 0)
          this.isSuccessful = false;
        else this.isSuccessful = true;
      }
      else {
        this.addressOptions = [];
        this.isSuccessful = false;
      }
    }
  }

  selectAddress(addressOption: any) {
    let houseNo: string;
    let road: string;
    if (addressOption) {
      houseNo = addressOption.address?.house_number || '';
      road = addressOption.address?.road || '';
      this.addressDisplayed = houseNo + " " + road;
      if (this.addressDisplayed.length == 1)
        this.addressDisplayed = addressOption.display_name;
      this.form.patchValue({
        address: this.addressDisplayed,
        city: addressOption.address.city || addressOption.address.town,
        state: addressOption.address.state,
        zip: addressOption.address.postcode
      }, { emitEvent: false });
    }
    this.saveChanges();
    this.isSuccessful = true;
    this.showModal = false;
    this.addressOptions = [];
  }

  openModal() {
    this.modalAddress.reset();
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.isSuccessful = true;
    this.addressOptions = [];
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
      this.selectedFacility = this.settingsFormsService.updateFacilityFromGeneralInformationForm(this.form, this.selectedFacility);
      await this.dbChangesService.updateFacility({ ...this.selectedFacility });
    }
    if (this.inAccount) {
      this.selectedAccount = this.settingsFormsService.updateAccountFromGeneralInformationForm(this.form, this.selectedAccount);
      await this.dbChangesService.updateAccount({ ...this.selectedAccount });
      await this.applicationLifecycleService.refreshAccountCatalog();
    }
  }

  checkNAICS() {
    //make sure sublist selections are a part of selected parent
    if (this.form.controls.naics1.value && this.form.controls.naics2.value) {
      let naicsItem: NAICS = this.secondNaicsList.find(item => { return item.code == this.form.controls.naics2.value });
      if (naicsItem && naicsItem.matchNum != this.form.controls.naics1.value) {
        this.form.controls.naics2.patchValue(null);
        this.form.controls.naics2.updateValueAndValidity();
        this.form.controls.naics3.patchValue(null);
        this.form.controls.naics3.updateValueAndValidity();
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

  formatPhone(event: Event) {
    let country = this.form.get('country')?.value;
    if (country == 'US') {
      let input = (event.target as HTMLInputElement).value;

      input = input.replace(/\D/g, '');
      if (input.length > 3 && input.length <= 6) {
        input = input.replace(/(\d{3})(\d+)/, '$1-$2');
      }
      else if (input.length > 6) {
        input = input.replace(/(\d{3})(\d{3})(\d+)/, '$1-$2-$3');
      }

      input = input.substring(0, 12);
      this.form.get('contactPhone')?.setValue(input, { emitEvent: false });
    }
    this.saveChanges();
  }
}
