import { Component, Input, OnInit, ViewChild } from '@angular/core';
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
  naicsFirstList = globalVariables.naicsFirstList;
  naicsSecondList = globalVariables.naicsSecondList;
  naicsThirdList = globalVariables.naicsThirdList;
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
    this.updateNaicsList(this.form.controls.naics1.value, "2");
    this.updateNaicsList(this.form.controls.naics2.value, "3");
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.selectedFacilitySub.unsubscribe();
  }


  updateNaicsList(entryStr: string, numStr: string) {
    let results = [];
    var naicsList;
    console.log(entryStr);
    var entry = entryStr;

    // value sometimes displays with index: value and sometimes with just value
    if (entry.search(":") !== -1) {
      entry = entryStr.split(":")[1].trim();
    }
    console.log(entry);
    if (numStr == "2") {
      naicsList = this.globalVariables.naicsSecondList;
    }
    else if (numStr == "3") {
      naicsList = this.globalVariables.naicsThirdList;
    }
    for (let naics of naicsList) {
      if (naics.matchNum.search(entry) != -1) {
        results.push(naics);
      }
      else if (naics.matchNum.search("-") != -1) {
        var numLen = naics.matchNum.trim().length;
        var numEntry = parseInt(entry.trim().substring(0, numLen));
        var rangeNums = [parseInt(naics.matchNum.split("-")[0].trim()), parseInt(naics.matchNum.split("-")[1].trim())]
        if (numEntry >= rangeNums[0] && numEntry <= rangeNums[1]) {
          results.push(naics);
        }
      }
    }
    if (numStr == "2") {
      this.naicsSecondList = results;
      // updates third select to only show acceptable values given the first
      this.updateNaicsList(results[0].code + "-" + results[results.length-1].code, "3");
    }
    if (numStr == "3") {
      this.naicsThirdList = results;
    }
    this.saveChanges();
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
