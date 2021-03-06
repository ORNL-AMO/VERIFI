import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { globalVariables } from 'src/environments/environment';
import { AccountManagementService } from '../account-management.service';

@Component({
  selector: 'app-general-information-form',
  templateUrl: './general-information-form.component.html',
  styleUrls: ['./general-information-form.component.css']
})
export class GeneralInformationFormComponent implements OnInit {
  @Input()
  inAccount: boolean;



  form: FormGroup;
  unitsOfMeasure: string;
  formNameLabel: string = "Account";
  globalVariables = globalVariables;
  selectedFacilitySub: Subscription;
  selectedAccountSub: Subscription;
  selectedAccount: IdbAccount;
  selectedFacility: IdbFacility;
  isFormChange: boolean = false;
  constructor(private accountDbService: AccountdbService, private accountManagementService: AccountManagementService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(account => {
      this.selectedAccount = account;
      if (account && this.inAccount) {
        if (this.isFormChange == false) {
          this.form = this.accountManagementService.getGeneralInformationForm(account);
          this.unitsOfMeasure = this.selectedAccount.unitsOfMeasure;
        } else {
          this.isFormChange = false;
        }
      }
    });


    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      this.selectedFacility = facility;
      if (facility && !this.inAccount) {
        if (this.isFormChange == false) {
          this.form = this.accountManagementService.getGeneralInformationForm(facility);
          this.unitsOfMeasure = this.selectedFacility.unitsOfMeasure;
        } else {
          this.isFormChange = false;
        }

      }
    });

    if (!this.inAccount) {
      this.formNameLabel = "Facility";
    }
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }

  saveChanges() {
    this.isFormChange = true;
    if (!this.inAccount) {
      this.selectedFacility = this.accountManagementService.updateFacilityFromGeneralInformationForm(this.form, this.selectedFacility);
      this.facilityDbService.update(this.selectedFacility);
    }
    if (this.inAccount) {
      this.selectedAccount = this.accountManagementService.updateAccountFromGeneralInformationForm(this.form, this.selectedAccount);
      this.accountDbService.update(this.selectedAccount);
    }
  }
}
