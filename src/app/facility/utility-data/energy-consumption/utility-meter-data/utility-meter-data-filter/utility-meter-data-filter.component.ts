import { Component, Input, OnInit } from '@angular/core';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AdditionalChargesFilters, DetailedChargesFilters, ElectricityDataFilters, EmissionsFilters, GeneralInformationFilters, GeneralUtilityDataFilters } from 'src/app/models/meterDataFilter';
import { IdbFacility, MeterSource } from 'src/app/models/idb';
import { UtilityMeterDataService } from '../utility-meter-data.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-utility-meter-data-filter',
  templateUrl: './utility-meter-data-filter.component.html',
  styleUrls: ['./utility-meter-data-filter.component.css', '../utility-meter-data.component.css']
})
export class UtilityMeterDataFilterComponent implements OnInit {
  @Input()
  filterType: string;
  @Input()
  source: MeterSource;

  // electricityDataFilters: ElectricityDataFilters;
  showFilterDropdown: boolean = false;
  detailedChargesFilters: DetailedChargesFilters;
  additionalChargesFilters: AdditionalChargesFilters;
  generalInformationFilters: GeneralInformationFilters;
  emissionsFilters: EmissionsFilters;
  generalUtilityDataFilters: GeneralUtilityDataFilters;
  routerSub: Subscription;
  constructor(private utilityMeterDataService: UtilityMeterDataService, private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService, private router: Router) { }

  ngOnInit(): void {
    this.routerSub = this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showFilterDropdown = false;
      }
    })
  }

  ngOnDestroy(){
    this.routerSub.unsubscribe();
  }

  toggleFilterMenu() {
    if (this.showFilterDropdown == false) {
      if (this.source == 'Electricity') {
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
      } else {
        this.generalUtilityDataFilters = this.utilityMeterDataService.tableGeneralUtilityFilters.getValue();
      }
    }
    this.showFilterDropdown = !this.showFilterDropdown;
  }

  async save() {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (this.source == 'Electricity') {
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
    } else {
      if (this.filterType == 'table') {
        selectedFacility.tableGeneralUtilityFilters = this.generalUtilityDataFilters;
      }
    }
    await this.dbChangesService.updateFacilities(selectedFacility);
  }

  async showAllColumns() {
    if (this.source == 'Electricity') {
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
    } else {
      this.generalUtilityDataFilters = {
        totalVolume: true,
        totalCost: true,
        totalMarketEmissions: true,
        totalLocationEmissions: true,
        commodityCharge: true,
        deliveryCharge: true,
        otherCharge: true,
      }
    }
    await this.save();
  }

  async hideAllColumns() {
    if (this.source == 'Electricity') {
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
    } else {
      this.generalUtilityDataFilters = {
        totalVolume: false,
        totalCost: false,
        totalMarketEmissions: false,
        totalLocationEmissions: false,
        commodityCharge: false,
        deliveryCharge: false,
        otherCharge: false,
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
      this.emissionsFilters.marketEmissions || this.emissionsFilters.locationEmissions || this.emissionsFilters.recs ||
      this.emissionsFilters.excessRecs || this.emissionsFilters.excessRecsEmissions
    )
  };
}
