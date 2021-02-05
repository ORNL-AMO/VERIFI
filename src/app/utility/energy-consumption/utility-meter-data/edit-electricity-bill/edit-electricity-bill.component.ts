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
  // facilityMeters: Array<IdbUtilityMeter>;
  // selectedMeter: IdbUtilityMeter;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDataService: UtilityMeterDataService,
    private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
    // if(this.addOrEdit != 'add'){
    // let facilityMeter: IdbUtilityMeter = this.utilityMeterDbService.getFacilityMeterById(this.editMeterData.meterId);
    // this.energyUnit = facilityMeter.startingUnit
    // this.meterDataForm = this.utilityMeterDataService.getElectricityMeterDataForm(this.editMeterData);
    // }else{
    //   let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    //   this.facilityMeters = facilityMeters.filter(meter => {return meter.source == 'Electricity'});
    //   this.selectedMeter = this.facilityMeters[0];
    //   // this.selectedMeterId = selectedMeter.id;
    //   this.energyUnit = this.selectedMeter.startingUnit
    //   this.editMeterData = this.utilityMeterDataDbService.getNewIdbUtilityMeterData(this.selectedMeter.id, this.selectedMeter.facilityId, this.selectedMeter.accountId);
    //   this.meterDataForm = this.utilityMeterDataService.getElectricityMeterDataForm(this.editMeterData);
    // }

    this.electricityDataFiltersSub = this.utilityMeterDataService.electricityInputFilters.subscribe(dataFilters => {
      this.supplyDemandFilters = dataFilters.supplyDemandCharge;
      this.taxAndOtherFilters = dataFilters.taxAndOther
      this.setDisplayColumns();
    });
  }

  ngOnChanges() {
    let facilityMeter: IdbUtilityMeter = this.utilityMeterDbService.getFacilityMeterById(this.editMeterData.meterId);
    this.energyUnit = facilityMeter.startingUnit
    this.meterDataForm = this.utilityMeterDataService.getElectricityMeterDataForm(this.editMeterData);
  }

  ngOnDestroy() {
    this.electricityDataFiltersSub.unsubscribe();
  }

  cancel() {
    this.emitClose.emit(true);
  }

  // changeSelectedMeter() {
  //   this.editMeterData.meterId = this.selectedMeter.id;
  //   this.editMeterData.facilityId = this.selectedMeter.facilityId;
  //   this.editMeterData.accountId = this.selectedMeter.accountId;
  //   this.energyUnit = this.selectedMeter.startingUnit
  // }

  meterDataSave() {
    let meterDataToSave: IdbUtilityMeterData = this.utilityMeterDataService.updateElectricityMeterDataFromForm(this.editMeterData, this.meterDataForm);
    if (this.addOrEdit == 'edit') {
      this.utilityMeterDataDbService.update(meterDataToSave);
    } else {
      delete meterDataToSave.id;
      this.utilityMeterDataDbService.add(meterDataToSave);
    }
    this.cancel();
  }

  showAllFields() {
    this.electricityDataFilters = {
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

}
