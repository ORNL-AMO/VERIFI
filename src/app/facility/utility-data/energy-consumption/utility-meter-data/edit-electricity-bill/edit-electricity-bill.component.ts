import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { ElectricityDataFilters, SupplyDemandChargeFilters, TaxAndOtherFilters } from 'src/app/models/electricityFilter';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { UtilityMeterDataService } from '../utility-meter-data.service';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { ThisReceiver } from '@angular/compiler';

@Component({
  selector: 'app-edit-electricity-bill',
  templateUrl: './edit-electricity-bill.component.html',
  styleUrls: ['./edit-electricity-bill.component.css']
})
export class EditElectricityBillComponent implements OnInit {
  @Input()
  editMeterData: IdbUtilityMeterData;
  @Input()
  addOrEdit: 'add' | 'edit';
  @Input()
  meterDataForm: FormGroup;
  @Input()
  editMeter: IdbUtilityMeter;
  @Input()
  invalidDate: boolean;

  electricityDataFilters: ElectricityDataFilters;
  electricityDataFiltersSub: Subscription;
  displaySupplyDemandColumnOne: boolean;
  displaySupplyDemandColumnTwo: boolean;
  displayTaxAndOthersColumnOne: boolean;
  displayTaxAndOthersColumnTwo: boolean;
  supplyDemandFilters: SupplyDemandChargeFilters;
  taxAndOtherFilters: TaxAndOtherFilters;
  energyUnit: string;
  totalEmissions: number = 0;
  RECs: number = 0;
  GHGOffsets: number = 0;
  facility: IdbFacility;
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private utilityMeterDataService: UtilityMeterDataService,
    private calanderizationService: CalanderizationService, private facilityDbService: FacilitydbService) { }

  ngOnInit(): void {
    this.electricityDataFiltersSub = this.utilityMeterDataService.electricityInputFilters.subscribe(dataFilters => {
      this.supplyDemandFilters = dataFilters.supplyDemandCharge;
      this.taxAndOtherFilters = dataFilters.taxAndOther
      this.setDisplayColumns();
    });
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    this.facility = accountFacilities.find(facility => {return facility.guid == this.editMeter.facilityId});
    this.setTotalEmissions();
  }

  ngOnChanges() {
    this.energyUnit = this.editMeter.startingUnit;
    this.checkDate();
    this.setTotalEmissions();
  }

  ngOnDestroy() {
    this.electricityDataFiltersSub.unsubscribe();
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
      this.invalidDate = this.utilityMeterDataDbService.checkMeterReadingExistForDate(this.meterDataForm.controls.readDate.value, this.editMeter) != undefined;
    } else {
      //edit meter needs to allow year/month combo of the meter being edited
      let currentMeterItemDate: Date = new Date(this.editMeterData.readDate);
      let changeDate: Date = new Date(this.meterDataForm.controls.readDate.value);
      if (currentMeterItemDate.getUTCFullYear() == changeDate.getUTCFullYear() && currentMeterItemDate.getUTCMonth() == changeDate.getUTCMonth() && currentMeterItemDate.getUTCDate() == changeDate.getUTCDate()) {
        this.invalidDate = false;
      } else {
        this.invalidDate = this.utilityMeterDataDbService.checkMeterReadingExistForDate(this.meterDataForm.controls.readDate.value, this.editMeter) != undefined;
      }
    }
  }

  setTotalEmissions(){
    if(this.meterDataForm.controls.totalEnergyUse.value && this.facility){
      let emissionsValues: { RECs: number, totalEmissions: number, GHGOffsets: number } = this.calanderizationService.getEmissions(this.editMeter, this.meterDataForm.controls.totalEnergyUse.value, this.editMeter.energyUnit, this.facility.energyIsSource);
      this.totalEmissions = emissionsValues.totalEmissions;
      this.RECs = emissionsValues.RECs;
      this.GHGOffsets = emissionsValues.GHGOffsets;
    }else{
      this.totalEmissions = 0;
      this.RECs = 0;
      this.GHGOffsets = 0;
    }
  }

}
