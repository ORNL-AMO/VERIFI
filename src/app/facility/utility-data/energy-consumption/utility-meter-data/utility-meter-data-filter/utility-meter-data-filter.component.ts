import { Component, Input, OnInit } from '@angular/core';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AdditionalChargesFilters, DetailedChargesFilters, ElectricityDataFilters } from 'src/app/models/electricityFilter';
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
  detailedChargesFilters: DetailedChargesFilters;
  additionalChargesFilters: AdditionalChargesFilters;
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
      this.additionalChargesFilters = electricityDataFilters.additionalCharges;
      this.detailedChargesFilters = electricityDataFilters.detailedCharges;
    }
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  async save() {
    this.checkShowSection();
    let electricityDataFilters: ElectricityDataFilters = {
      detailedCharges: this.detailedChargesFilters,
      additionalCharges: this.additionalChargesFilters
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
    this.detailedChargesFilters = {
      showSection: true,
      block1: true,
      block2: true,
      block3: true,
      other: true,
      onPeak: true,
      offPeak: true,
      powerFactor: true
    };
    this.additionalChargesFilters = {
      showSection: true,
      nonEnergyCharge: true,
      transmissionAndDelivery: true,
      localSalesTax: true,
      stateSalesTax: true,
      latePayment: true,
      otherCharge: true,
    }
    await this.save();
  }

  async hideAllColumns() {
    this.detailedChargesFilters = {
      showSection: false,
      block1: false,
      block2: false,
      block3: false,
      other: false,
      onPeak: false,
      offPeak: false,
      powerFactor: false
    };
    this.additionalChargesFilters = {
      showSection: false,
      nonEnergyCharge: false,
      transmissionAndDelivery: false,
      localSalesTax: false,
      stateSalesTax: false,
      latePayment: false,
      otherCharge: false,
    }
    await this.save();
  }

  checkShowSection() {
    this.additionalChargesFilters.showSection = (
      this.additionalChargesFilters.nonEnergyCharge || this.additionalChargesFilters.latePayment 
      || this.additionalChargesFilters.otherCharge || this.additionalChargesFilters.transmissionAndDelivery 
      || this.additionalChargesFilters.localSalesTax
      || this.additionalChargesFilters.stateSalesTax || this.additionalChargesFilters.latePayment 
      || this.additionalChargesFilters.otherCharge
    );
    this.detailedChargesFilters.showSection = (
      this.detailedChargesFilters.block1 || this.detailedChargesFilters.block2 || this.detailedChargesFilters.block3 || this.detailedChargesFilters.other ||
      this.detailedChargesFilters.onPeak || this.detailedChargesFilters.offPeak || this.detailedChargesFilters.powerFactor
    );
  }
}
