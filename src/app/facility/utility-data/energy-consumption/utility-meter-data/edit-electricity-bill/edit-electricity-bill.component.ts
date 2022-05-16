import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { ElectricityDataFilters, SupplyDemandChargeFilters, TaxAndOtherFilters } from 'src/app/models/electricityFilter';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDataService } from '../utility-meter-data.service';

@Component({
  selector: 'app-edit-electricity-bill',
  templateUrl: './edit-electricity-bill.component.html',
  styleUrls: ['./edit-electricity-bill.component.css']
})
export class EditElectricityBillComponent implements OnInit {
  @Input()
  editMeterData: IdbUtilityMeterData;
  @Input()
  addOrEdit: string;
  @Output('emitClose')
  emitClose: EventEmitter<boolean> = new EventEmitter<boolean>();

  meterDataForm: FormGroup;
  electricityDataFilters: ElectricityDataFilters;
  electricityDataFiltersSub: Subscription;
  displaySupplyDemandColumnOne: boolean;
  displaySupplyDemandColumnTwo: boolean;
  displayTaxAndOthersColumnOne: boolean;
  displayTaxAndOthersColumnTwo: boolean;
  supplyDemandFilters: SupplyDemandChargeFilters;
  taxAndOtherFilters: TaxAndOtherFilters;
  energyUnit: string;
  invalidDate: boolean;
  facilityMeter: IdbUtilityMeter;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDataService: UtilityMeterDataService,
    private utilityMeterDbService: UtilityMeterdbService, private dbChangesService: DbChangesService, private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.electricityDataFiltersSub = this.utilityMeterDataService.electricityInputFilters.subscribe(dataFilters => {
      this.supplyDemandFilters = dataFilters.supplyDemandCharge;
      this.taxAndOtherFilters = dataFilters.taxAndOther
      this.setDisplayColumns();
    });
  }

  ngOnChanges() {
    this.facilityMeter = this.utilityMeterDbService.getFacilityMeterById(this.editMeterData.meterId);
    this.energyUnit = this.facilityMeter.startingUnit;
    this.meterDataForm = this.utilityMeterDataService.getElectricityMeterDataForm(this.editMeterData);
    this.checkDate();
  }

  ngOnDestroy() {
    this.electricityDataFiltersSub.unsubscribe();
  }

  cancel() {
    this.emitClose.emit(true);
  }

  async saveAndQuit() {
    let meterDataToSave: IdbUtilityMeterData = this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm);
    if (this.addOrEdit == 'edit') {
      await this.utilityMeterDataDbService.updateWithObservable(meterDataToSave).toPromise();
    } else {
      delete meterDataToSave.id;
      meterDataToSave = await this.utilityMeterDataDbService.addWithObservable(meterDataToSave).toPromise();
    }
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeterData(selectedAccount, selectedFacility);
    this.cancel();
  }

  async saveAndAddAnother() {
    let meterDataToSave: IdbUtilityMeterData = this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm);
    delete meterDataToSave.id;
    meterDataToSave = await this.utilityMeterDataDbService.addWithObservable(meterDataToSave).toPromise();
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    await this.dbChangesService.setMeterData(selectedAccount, selectedFacility);
    this.editMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(this.facilityMeter);
    this.editMeterData.readDate = new Date(meterDataToSave.readDate);
    this.editMeterData.readDate.setMonth(this.editMeterData.readDate.getUTCMonth() + 1);
    this.meterDataForm = this.utilityMeterDataService.getElectricityMeterDataForm(this.editMeterData);
  }

  setDisplayColumns() {
    this.displaySupplyDemandColumnOne = (
      this.supplyDemandFilters.peakAmount || this.supplyDemandFilters.peakCharge || this.supplyDemandFilters.offPeakAmount || this.supplyDemandFilters.offPeakCharge
      || this.supplyDemandFilters.demandBlockAmount || this.supplyDemandFilters.demandBlockCharge
    );

    this.displaySupplyDemandColumnTwo = (
      this.supplyDemandFilters.supplyBlockAmount || this.supplyDemandFilters.supplyBlockCharge || this.supplyDemandFilters.flatRateAmount || this.supplyDemandFilters.flatRateCharge
    );

    this.displayTaxAndOthersColumnOne = (
      this.taxAndOtherFilters.businessCharge || this.taxAndOtherFilters.utilityTax || this.taxAndOtherFilters.latePayment ||
      this.taxAndOtherFilters.otherCharge || this.taxAndOtherFilters.basicCharge
    );

    this.displayTaxAndOthersColumnTwo = (
      this.taxAndOtherFilters.generationTransmissionCharge || this.taxAndOtherFilters.deliveryCharge || this.taxAndOtherFilters.powerFactorCharge
    );
  }

  checkDate() {
    if (this.addOrEdit == 'add') {
      //new meter entry should have any year/month combo of existing meter reading
      this.invalidDate = this.utilityMeterDataDbService.checkMeterReadingExistForDate(this.meterDataForm.controls.readDate.value, this.facilityMeter) != undefined;
    } else {
      //edit meter needs to allow year/month combo of the meter being edited
      let currentMeterItemDate: Date = new Date(this.editMeterData.readDate);
      let changeDate: Date = new Date(this.meterDataForm.controls.readDate.value);
      if (currentMeterItemDate.getUTCFullYear() == changeDate.getUTCFullYear() && currentMeterItemDate.getUTCMonth() == changeDate.getUTCMonth() && currentMeterItemDate.getUTCDate() == changeDate.getUTCDate()) {
        this.invalidDate = false;
      } else {
        this.invalidDate = this.utilityMeterDataDbService.checkMeterReadingExistForDate(this.meterDataForm.controls.readDate.value, this.facilityMeter) != undefined;
      }
    }
  }

}
