import { Component, Input, OnInit } from '@angular/core';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AdditionalChargesFilters, DetailedChargesFilters, ElectricityDataFilters, EmissionsFilters, GeneralInformationFilters, GeneralUtilityDataFilters, VehicleDataFilters } from 'src/app/models/meterDataFilter';
import { checkShowEmissionsOutputRate, getIsEnergyUnit } from 'src/app/shared/sharedHelperFuntions';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterDataService } from 'src/app/facility/utility-data/energy-consumption/utility-meter-data/utility-meter-data.service';

@Component({
  selector: 'app-utility-meter-data-filter',
  templateUrl: './utility-meter-data-filter.component.html',
  styleUrls: ['./utility-meter-data-filter.component.css']
})
export class UtilityMeterDataFilterComponent implements OnInit {
  @Input()
  filterType: string;
  @Input()
  meter: IdbUtilityMeter;

  detailedChargesFilters: DetailedChargesFilters;
  additionalChargesFilters: AdditionalChargesFilters;
  generalInformationFilters: GeneralInformationFilters;
  emissionsFilters: EmissionsFilters;
  generalUtilityDataFilters: GeneralUtilityDataFilters;
  displayVolumeInput: boolean;
  showEmissions: boolean;
  vehicleDataFilters: VehicleDataFilters;
  isRECs: boolean;
  constructor(private utilityMeterDataService: UtilityMeterDataService, private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService) { }

  ngOnInit(): void {
  }

  ngOnChanges() {
    if (this.meter.source == 'Electricity') {
      this.isRECs = (this.meter.agreementType == 4 || this.meter.agreementType == 6);
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
    } else if (this.meter.scope != 2) {
      this.generalUtilityDataFilters = this.utilityMeterDataService.tableGeneralUtilityFilters.getValue();
    }

    if (this.meter.source != 'Electricity') {
      this.isRECs = false;
    }

    if (this.meter.scope == 2) {
      this.vehicleDataFilters = this.utilityMeterDataService.tableVehicleDataFilters.getValue();
      this.showEmissions = true;
      this.displayVolumeInput = true;

    } else {
      this.showEmissions = checkShowEmissionsOutputRate(this.meter);
      this.displayVolumeInput = (getIsEnergyUnit(this.meter.startingUnit) == false);
    }
  }

  async save() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (this.meter.source == 'Electricity') {
      this.checkShowSection();
      let electricityDataFilters: ElectricityDataFilters = {
        detailedCharges: this.detailedChargesFilters,
        additionalCharges: this.additionalChargesFilters,
        emissionsFilters: this.emissionsFilters,
        generalInformationFilters: this.generalInformationFilters
      }

      if (this.filterType == 'table') {
        selectedFacility.tableElectricityFilters = electricityDataFilters;
      } else {
        selectedFacility.electricityInputFilters = electricityDataFilters;
      }
    } else if (this.meter.scope != 2) {
      if (this.filterType == 'table') {
        selectedFacility.tableGeneralUtilityFilters = this.generalUtilityDataFilters;
      }
    } else if (this.meter.scope == 2) {
      if (this.filterType == 'table') {
        selectedFacility.tableVehicleDataFilters = this.vehicleDataFilters;
      }
    }
    await this.dbChangesService.updateFacilities(selectedFacility);
  }

  async showAllColumns() {
    if (this.meter.source == 'Electricity') {
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
        recs: true

      }
      this.generalInformationFilters = {
        showSection: true,
        totalCost: true,
        realDemand: true,
        billedDemand: true

      }
    } else if (this.meter.scope != 2) {
      this.generalUtilityDataFilters = {
        totalVolume: true,
        totalCost: true,
        commodityCharge: true,
        deliveryCharge: true,
        otherCharge: true,
        stationaryBiogenicEmmissions: true,
        stationaryCarbonEmissions: true,
        stationaryOtherEmissions: true,
        totalEmissions: true,
      }
    } else if (this.meter.scope == 2) {
      this.vehicleDataFilters = {
        totalEnergy: true,
        totalCost: true,
        otherCharge: true,
        mobileBiogenicEmissions: true,
        mobileCarbonEmissions: true,
        mobileOtherEmissions: true,
        mobileTotalEmissions: true,
      }
    }
    await this.save();
  }

  async hideAllColumns() {
    if (this.meter.source == 'Electricity') {
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
        recs: false

      }
      this.generalInformationFilters = {
        showSection: false,
        totalCost: false,
        realDemand: false,
        billedDemand: false

      }
    } else if (this.meter.scope != 2) {
      this.generalUtilityDataFilters = {
        totalVolume: false,
        totalCost: false,
        commodityCharge: false,
        deliveryCharge: false,
        otherCharge: false,
        stationaryBiogenicEmmissions: false,
        stationaryCarbonEmissions: false,
        stationaryOtherEmissions: false,
        totalEmissions: false,
      }
    } else if (this.meter.scope == 2) {
      this.vehicleDataFilters = {
        totalEnergy: false,
        totalCost: false,
        otherCharge: false,
        mobileBiogenicEmissions: false,
        mobileCarbonEmissions: false,
        mobileOtherEmissions: false,
        mobileTotalEmissions: false,
      }
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
      this.emissionsFilters.marketEmissions || this.emissionsFilters.locationEmissions || this.emissionsFilters.recs
    )
  };
}
