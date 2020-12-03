import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AccountdbService } from "../../indexedDB/account-db.service";
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { Subscription } from 'rxjs';
import { FacilitydbService } from "../../indexedDB/facility-db.service";


@Component({
  selector: 'app-account',
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.css'],
  host: {
    '(document:click)': 'documentClick($event)',
  }
})
export class AccountComponent implements OnInit {
  facilityList: Array<IdbFacility> = [];
  facilityMenuOpen: number;

  accountForm: FormGroup = new FormGroup({
    id: new FormControl('', [Validators.required]),
    name: new FormControl('', [Validators.required]),
    industry: new FormControl('', [Validators.required]),
    naics: new FormControl('', [Validators.required]),
    notes: new FormControl('', [Validators.required])
  });

  selectedAccountSub: Subscription;
  accountFacilitiesSub: Subscription;

  constructor(
    private router: Router,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
  ) { }

  ngOnInit() {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.setAccountForm(val);
    });

    this.accountFacilitiesSub = this.facilityDbService.accountFacilities.subscribe(val => {
      this.facilityList = val;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.accountFacilitiesSub.unsubscribe();
  }

  // Close menus when user clicks outside the dropdown
  documentClick() {
    this.facilityMenuOpen = null;
  }

  setAccountForm(idbAccount: IdbAccount) {
    if (idbAccount != null) {
      this.accountForm.controls.id.setValue(idbAccount.id);
      this.accountForm.controls.name.setValue(idbAccount.name);
      this.accountForm.controls.industry.setValue(idbAccount.industry);
      this.accountForm.controls.naics.setValue(idbAccount.naics);
      this.accountForm.controls.notes.setValue(idbAccount.notes);
      // Needs image
    }
  }

  facilityToggleMenu(index) {
    if (this.facilityMenuOpen === index) {
      this.facilityMenuOpen = null;
    } else {
      this.facilityMenuOpen = index;
    }
  }

  facilityEdit(facility: IdbFacility) {
    this.facilityDbService.selectedFacility.next(facility);
    this.router.navigate(['account/facility']);
  }

  facilityDelete(facitilyId: number) {
    this.facilityDbService.deleteById(facitilyId);
  }

  addNewFacility() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let idbFacility: IdbFacility = this.facilityDbService.getNewIdbFacility(selectedAccount.id);
    this.facilityDbService.add(idbFacility);
  }

  onFormChange(): void {
    this.accountDbService.update(this.accountForm.value);
  }

}
