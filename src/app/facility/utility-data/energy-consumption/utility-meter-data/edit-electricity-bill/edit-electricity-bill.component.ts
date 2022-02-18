import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { ElectricityDataFilters, SupplyDemandChargeFilters, TaxAndOtherFilters } from 'src/app/models/electricityFilter';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
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
    private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService) { }

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

  saveAndQuit() {
    let meterDataToSave: IdbUtilityMeterData = this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm);
    if (this.addOrEdit == 'edit') {
      this.utilityMeterDataDbService.update(meterDataToSave);
    } else {
      delete meterDataToSave.id;
      this.utilityMeterDataDbService.add(meterDataToSave);
    }
    this.cancel();
  }

  saveAndAddAnother() {
    let meterDataToSave: IdbUtilityMeterData = this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm);
    delete meterDataToSave.id;
    this.utilityMeterDataDbService.add(meterDataToSave);
    this.editMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(this.facilityMeter);
    this.editMeterData.readDate = new Date(meterDataToSave.readDate);
    this.editMeterData.readDate.setMonth(this.editMeterData.readDate.getUTCMonth() + 1);
    this.meterDataForm = this.utilityMeterDataService.getElectricityMeterDataForm(this.editMeterData);
  }

  showAllFields() {
    this.electricityDataFilters = {
      showTotalDemand: true,
      supplyDemandCharge: {
        showSection: true,
        supplyBlockAmount: true,
        supplyBlockCharge: true,
        flatRateAmount: true,
        flatRateCharge: true,
        peakAmount: true,
        peakCharge: true,
        offPeakAmount: true,
        offPeakCharge: true,
        demandBlockAmount: true,
        demandBlockCharge: true,
      },
      taxAndOther: {
        showSection: true,
        utilityTax: true,
        latePayment: true,
        otherCharge: true,
        basicCharge: true,
        generationTransmissionCharge: true,
        deliveryCharge: true,
        transmissionCharge: true,
        powerFactorCharge: true,
        businessCharge: true
      }
    }
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    selectedFacility.electricityInputFilters = this.electricityDataFilters;
    this.facilityDbService.update(selectedFacility);
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
