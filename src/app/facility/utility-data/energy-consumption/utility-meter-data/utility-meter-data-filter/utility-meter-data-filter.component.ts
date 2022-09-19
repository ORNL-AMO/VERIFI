import { Component, Input, OnInit } from '@angular/core';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AdditionalChargesFilters, DetailedChargesFilters, ElectricityDataFilters, EmissionsFilters, GeneralInformationFilters } from 'src/app/models/electricityFilter';
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
  generalInformationFilters: GeneralInformationFilters;
  emissionsFilters: EmissionsFilters;
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
      this.emissionsFilters = electricityDataFilters.emissionsFilters;
      this.generalInformationFilters = electricityDataFilters.generalInformationFilters;
    }
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  async save() {
    this.checkShowSection();
    let electricityDataFilters: ElectricityDataFilters = {
      detailedCharges: this.detailedChargesFilters,
      additionalCharges: this.additionalChargesFilters,
      emissionsFilters: this.emissionsFilters,
      generalInformationFilters: this.generalInformationFilters
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
    this.emissionsFilters = {
      showSection: true,
      marketEmissions: true,
      locationEmissions: true,
      recs: true,
      excessRecs: true,
      excessRecsEmissions: true

    }
    this.generalInformationFilters = {
      showSection: true,
      totalCost: true,
      realDemand: true,
      billedDemand: true

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
    this.emissionsFilters = {
      showSection: false,
      marketEmissions: false,
      locationEmissions: false,
      recs: false,
      excessRecs: false,
      excessRecsEmissions: false

    }
    this.generalInformationFilters = {
      showSection: false,
      totalCost: false,
      realDemand: false,
      billedDemand: false

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

    this.generalInformationFilters.showSection = (
      this.generalInformationFilters.totalCost || this.generalInformationFilters.realDemand || this.generalInformationFilters.billedDemand);

    this.emissionsFilters.showSection = (
      this.emissionsFilters.marketEmissions || this.emissionsFilters.locationEmissions || this.emissionsFilters.recs ||
      this.emissionsFilters.excessRecs || this.emissionsFilters.excessRecsEmissions
    )
  };
}
