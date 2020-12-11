import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { AccountdbService } from "../../indexedDB/account-db.service";
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { Subscription } from 'rxjs';
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { PredictordbService } from "../../indexedDB/predictors-db.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db.service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { LoadingService } from "../../shared/loading/loading.service";

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
  showDeleteAccount: boolean;
  facilityToEdit: IdbFacility;
  facilityToDelete: IdbFacility;

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
    private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private loadingService: LoadingService
  ) {}

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

  addNewFacility() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let idbFacility: IdbFacility = this.facilityDbService.getNewIdbFacility(selectedAccount.id);
    this.facilityDbService.add(idbFacility);
  }

  onFormChange(): void {
    this.accountDbService.update(this.accountForm.value);
  }

  facilityDelete() {
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Deleting Facility...");

    // Delete all info associated with account
    this.predictorDbService.deleteAllFacilityPredictors(this.facilityToDelete.id);
    this.utilityMeterDataDbService.deleteAllFacilityMeterData(this.facilityToDelete.id);
    this.utilityMeterDbService.deleteAllFacilityMeters(this.facilityToDelete.id);
    this.utilityMeterGroupDbService.deleteAllFacilityMeterGroups(this.facilityToDelete.id);
    this.facilityDbService.deleteById(this.facilityToDelete.id);

    // Then navigate to another facility
    this.facilityDbService.setSelectedFacility();
    this.loadingService.setLoadingStatus(false);
    
  }

  accountDelete() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();

    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Deleting Account...");

    // Delete all info associated with account
    this.predictorDbService.deleteAllAccountPredictors(selectedAccount.id);
    this.utilityMeterDataDbService.deleteAllAccountMeterData(selectedAccount.id);
    this.utilityMeterDbService.deleteAllAccountMeters(selectedAccount.id);
    this.utilityMeterGroupDbService.deleteAllAccountMeterGroups(selectedAccount.id);
    this.facilityDbService.deleteAllAccountFacilities();
    this.accountDbService.deleteById(selectedAccount.id);

    // Then navigate to another account
    this.accountDbService.setSelectedAccount(undefined);
    this.router.navigate(['/']);
    this.loadingService.setLoadingStatus(false);
  }


  setEditFacilityEntry(facility: IdbFacility) {
    this.facilityToEdit = facility;
  }

  setDeleteFacilityEntry(facility: IdbFacility) {
    this.facilityToDelete = facility;
  }

  closeEditFacility() {
    this.facilityToEdit = undefined;
  }

  editAccount() {
    this.showDeleteAccount = true;
  }

  confirmFacilityDelete() {
    this.facilityDelete();
    this.facilityToDelete = undefined;
  }

  confirmAccountDelete() {
    this.accountDelete();
    this.showDeleteAccount = undefined;
  }

  cancelAccountDelete() {
    this.showDeleteAccount = undefined;
  }

  cancelFacilityDelete() {
    this.facilityToDelete = undefined;
  }

}
