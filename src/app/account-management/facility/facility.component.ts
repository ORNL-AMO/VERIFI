import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FacilitydbService } from "../../indexedDB/facility-db.service";
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { EnergyUnitOptions, MassUnitOptions, SizeUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from 'src/app/shared/unitOptions';
import { IdbAccount, IdbFacility } from 'src/app/models/idb';
import { PredictordbService } from "../../indexedDB/predictors-db.service";
import { UtilityMeterdbService } from "../../indexedDB/utilityMeter-db.service";
import { UtilityMeterDatadbService } from "../../indexedDB/utilityMeterData-db.service";
import { UtilityMeterGroupdbService } from "../../indexedDB/utilityMeterGroup-db.service";
import { LoadingService } from "../../shared/loading/loading.service";
import { AccountManagementService } from '../account-management.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { globalVariables } from "../../../environments/environment";

@Component({
  selector: 'app-facility',
  templateUrl: './facility.component.html',
  styleUrls: ['./facility.component.css']
})
export class FacilityComponent implements OnInit {
  facilityId: number;
  showDeleteFacility: boolean = false;
  facilityForm: FormGroup;
  selectedFacilitySub: Subscription;
  energyUnitOptions: Array<UnitOption> = EnergyUnitOptions;
  volumeGasOptions: Array<UnitOption> = VolumeGasOptions;
  volumeLiquidOptions: Array<UnitOption> = VolumeLiquidOptions;
  sizeUnitOptions: Array<UnitOption> = SizeUnitOptions;
  massUnitOptions: Array<UnitOption> = MassUnitOptions;
  selectedFacility: IdbFacility;
  unitsDontMatchAccount: boolean;
  sustainQuestionsDontMatchAccount: boolean;
  financialReportingDoestMatchAccount: boolean;
  years: Array<number> = [];
  globalVariables = globalVariables;
  
  constructor(
    private router: Router,
    private facilityDbService: FacilitydbService,
    private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private utilityMeterDataDbService: UtilityMeterDatadbService,
    private utilityMeterGroupDbService: UtilityMeterGroupdbService,
    private loadingService: LoadingService,
    private accountManagementService: AccountManagementService,
    private accountDbService: AccountdbService
  ) { }

  ngOnInit() {
    this.selectedFacilitySub = this.facilityDbService.selectedFacility.subscribe(facility => {
      let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
      this.unitsDontMatchAccount = this.accountManagementService.areAccountAndFacilityUnitsDifferent(account, facility);
      this.sustainQuestionsDontMatchAccount = this.accountManagementService.areAccountAndFacilitySustainQuestionsDifferent(account, facility);
      this.financialReportingDoestMatchAccount = this.accountManagementService.areAccountAndFacilityFinancialReportingDifferent(account, facility);
      this.selectedFacility = facility;
      if (facility != null) {
        this.facilityForm = this.accountManagementService.getFacilityForm(facility);
      }
    });

    for(let i=2050; i>2000; i--) {
      this.years.push(i);
    }
  }

  ngOnDestroy() {
    this.selectedFacilitySub.unsubscribe();
  }

  onFormChange(): void {
    //update facility object and put in db
    this.facilityForm = this.accountManagementService.checkCustom(this.facilityForm);
    this.selectedFacility = this.accountManagementService.updateFacilityFromForm(this.facilityForm, this.selectedFacility);
    this.facilityDbService.update(this.selectedFacility);
  }

  facilityDelete() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    this.loadingService.setLoadingStatus(true);
    this.loadingService.setLoadingMessage("Deleting Facility...");
    // Delete all info associated with account
    this.predictorDbService.deleteAllFacilityPredictors(selectedFacility.id);
    this.utilityMeterDataDbService.deleteAllFacilityMeterData(selectedFacility.id);
    this.utilityMeterDbService.deleteAllFacilityMeters(selectedFacility.id);
    this.utilityMeterGroupDbService.deleteAllFacilityMeterGroups(selectedFacility.id);
    this.facilityDbService.deleteById(selectedFacility.id);
    // Then navigate to another facility
    this.facilityDbService.setSelectedFacility();
    this.router.navigate(['/']);
    this.loadingService.setLoadingStatus(false);

  }

  editFacility() {
    this.showDeleteFacility = true;
  }

  confirmDelete() {
    this.facilityDelete();
    this.showDeleteFacility = undefined;
  }

  cancelDelete() {
    this.showDeleteFacility = undefined;
  }

  setUnitsOfMeasure() {
    this.facilityForm = this.accountManagementService.setUnitsOfMeasure(this.facilityForm);
    this.onFormChange();
  }

  setAccountSustainQuestions(){
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.facilityForm = this.accountManagementService.setAccountSustainQuestions(this.facilityForm, account);
    this.onFormChange();
  }

  setAccountFinancialReporting(){
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    this.facilityForm = this.accountManagementService.setAccountFinancialReporting(this.facilityForm, account);
    this.onFormChange();
  }
}
