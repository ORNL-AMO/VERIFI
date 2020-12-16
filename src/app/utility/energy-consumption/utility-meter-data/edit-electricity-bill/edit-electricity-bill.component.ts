import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { ElectricityDataFilters, SupplyDemandChargeFilters, TaxAndOtherFilters } from 'src/app/models/electricityFilter';
import { IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
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
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDataService: UtilityMeterDataService,
    private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.meterDataForm = this.utilityMeterDataService.getElectricityMeterDataForm(this.editMeterData);
    this.electricityDataFiltersSub = this.utilityMeterDataService.electricityInputFilters.subscribe(dataFilters => {
      this.supplyDemandFilters = dataFilters.supplyDemandCharge;
      this.taxAndOtherFilters = dataFilters.taxAndOther
      this.setDisplayColumns();
    });
  }

  ngOnDestroy() {
    this.electricityDataFiltersSub.unsubscribe();
  }

  cancel() {
    this.emitClose.emit(true);
  }

  meterDataSave() {
    if (this.addOrEdit == 'edit') {
      this.utilityMeterDataDbService.update(this.meterDataForm.value);
    } else {
      let meterData: IdbUtilityMeterData = this.meterDataForm.value;
      delete meterData.id;
      this.utilityMeterDataDbService.add(meterData);
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
