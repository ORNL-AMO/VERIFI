import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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
})
export class AccountComponent implements OnInit {
  facilityList: Array<IdbFacility> = [];
  facilityMenuOpen: number;
  showDeleteAccount: boolean;
  facilityToEdit: IdbFacility;
  facilityToDelete: IdbFacility;

  selectedAccountSub: Subscription;
  accountFacilitiesSub: Subscription;
  selectedAccount: IdbAccount;

  constructor(
    private router: Router,
    private accountDbService: AccountdbService,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private loadingService: LoadingService
  ) { }

  ngOnInit() {
    this.selectedAccountSub = this.accountDbService.selectedAccount.subscribe(val => {
      this.selectedAccount = val;
    });

    this.accountFacilitiesSub = this.facilityDbService.accountFacilities.subscribe(val => {
      this.facilityList = val;
    });
  }

  ngOnDestroy() {
    this.selectedAccountSub.unsubscribe();
    this.accountFacilitiesSub.unsubscribe();
  }

  switchFacility(facility: IdbFacility) {
    this.facilityDbService.selectedFacility.next(facility);
    this.router.navigate(['/facility-management']);
  }

  addNewFacility() {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    let idbFacility: IdbFacility = this.facilityDbService.getNewIdbFacility(selectedAccount);
    this.facilityDbService.add(idbFacility);
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
