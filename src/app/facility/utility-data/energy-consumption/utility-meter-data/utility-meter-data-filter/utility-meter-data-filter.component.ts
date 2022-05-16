import { Component, Input, OnInit } from '@angular/core';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { ElectricityDataFilters, SupplyDemandChargeFilters, TaxAndOtherFilters } from 'src/app/models/electricityFilter';
import { IdbFacility } from 'src/app/models/idb';
import { UtilityMeterDataService } from '../utility-meter-data.service';

@Component({
  selector: 'app-utility-meter-data-filter',
  templateUrl: './utility-meter-data-filter.component.html',
  styleUrls: ['./utility-meter-data-filter.component.css', '../utility-meter-data.component.css']
})
export class UtilityMeterDataFilterComponent implements OnInit {
  @Input()
  filterType: string;

  // electricityDataFilters: ElectricityDataFilters;
  showFilterDropdown: boolean = false;
  supplyDemandCharge: SupplyDemandChargeFilters;
  taxAndOther: TaxAndOtherFilters;
  showTotalDemand: boolean;
  constructor(private utilityMeterDataService: UtilityMeterDataService, private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService) { }

  ngOnInit(): void {

  }

  toggleFilterMenu() {
    if (this.showFilterDropdown == false) {
      let electricityDataFilters: ElectricityDataFilters;
      if (this.filterType == 'table') {
        electricityDataFilters = this.utilityMeterDataService.tableElectricityFilters.getValue();
      } else {
        electricityDataFilters = this.utilityMeterDataService.electricityInputFilters.getValue();
      }
      this.supplyDemandCharge = electricityDataFilters.supplyDemandCharge;
      this.taxAndOther = electricityDataFilters.taxAndOther;
      this.showTotalDemand = electricityDataFilters.showTotalDemand;
    }
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  async save() {
    this.checkShowSection();
    let electricityDataFilters: ElectricityDataFilters = {
      showTotalDemand: this.showTotalDemand,
      supplyDemandCharge: this.supplyDemandCharge,
      taxAndOther: this.taxAndOther
    }
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (this.filterType == 'table') {
      selectedFacility.tableElectricityFilters = electricityDataFilters;
    } else {
      selectedFacility.electricityInputFilters = electricityDataFilters;
    }
    await this.dbChangesService.updateFacilities(selectedFacility);
  }

  async showAllColumns() {
    this.showTotalDemand = true;
    this.supplyDemandCharge = {
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
    };
    this.taxAndOther = {
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
    await this.save();
  }

  async hideAllColumns() {
    this.showTotalDemand = false;
    this.supplyDemandCharge = {
      showSection: false,
      supplyBlockAmount: false,
      supplyBlockCharge: false,
      flatRateAmount: false,
      flatRateCharge: false,
      peakAmount: false,
      peakCharge: false,
      offPeakAmount: false,
      offPeakCharge: false,
      demandBlockAmount: false,
      demandBlockCharge: false,
    },
      this.taxAndOther = {
        showSection: false,
        utilityTax: false,
        latePayment: false,
        otherCharge: false,
        basicCharge: false,
        generationTransmissionCharge: false,
        deliveryCharge: false,
        transmissionCharge: false,
        powerFactorCharge: false,
        businessCharge: false
      }
    await this.save();
  }

  checkShowSection() {
    this.taxAndOther.showSection = (
      this.taxAndOther.utilityTax || this.taxAndOther.latePayment || this.taxAndOther.otherCharge || this.taxAndOther.basicCharge || this.taxAndOther.generationTransmissionCharge
      || this.taxAndOther.deliveryCharge || this.taxAndOther.transmissionCharge || this.taxAndOther.powerFactorCharge || this.taxAndOther.businessCharge
    );
    this.supplyDemandCharge.showSection = (
      this.supplyDemandCharge.supplyBlockAmount || this.supplyDemandCharge.supplyBlockCharge || this.supplyDemandCharge.flatRateAmount || this.supplyDemandCharge.flatRateCharge
      || this.supplyDemandCharge.peakAmount || this.supplyDemandCharge.peakCharge || this.supplyDemandCharge.offPeakAmount
      || this.supplyDemandCharge.offPeakCharge || this.supplyDemandCharge.demandBlockAmount || this.supplyDemandCharge.demandBlockCharge
    );
  }
}
