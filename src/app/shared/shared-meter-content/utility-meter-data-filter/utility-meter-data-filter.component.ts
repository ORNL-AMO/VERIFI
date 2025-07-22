import { Component, Input, OnInit } from '@angular/core';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { ElectricityDataFilters, EmissionsFilters, GeneralInformationFilters, GeneralUtilityDataFilters, VehicleDataFilters } from 'src/app/models/meterDataFilter';
import { checkShowEmissionsOutputRate, getIsEnergyUnit } from 'src/app/shared/sharedHelperFuntions';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterDataService } from 'src/app/shared/shared-meter-content/utility-meter-data.service';
import { firstValueFrom } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';

@Component({
  selector: 'app-utility-meter-data-filter',
  templateUrl: './utility-meter-data-filter.component.html',
  styleUrls: ['./utility-meter-data-filter.component.css'],
  standalone: false
})
export class UtilityMeterDataFilterComponent implements OnInit {
  @Input()
  meter: IdbUtilityMeter;

  generalInformationFilters: GeneralInformationFilters;
  emissionsFilters: EmissionsFilters;
  generalUtilityDataFilters: GeneralUtilityDataFilters;
  displayVolumeInput: boolean;
  showEmissions: boolean;
  vehicleDataFilters: VehicleDataFilters;
  isRECs: boolean;
  constructor(private utilityMeterDataService: UtilityMeterDataService, private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private utilityMeterDbService: UtilityMeterdbService) { }

  ngOnInit(): void {
  }

  ngOnChanges() {
    if (this.meter.source == 'Electricity') {
      this.isRECs = (this.meter.agreementType == 4 || this.meter.agreementType == 6);
      let electricityDataFilters: ElectricityDataFilters;
      electricityDataFilters = this.utilityMeterDataService.tableElectricityFilters.getValue();
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
        emissionsFilters: this.emissionsFilters,
        generalInformationFilters: this.generalInformationFilters
      }

      selectedFacility.tableElectricityFilters = electricityDataFilters;
    } else if (this.meter.scope != 2) {
      selectedFacility.tableGeneralUtilityFilters = this.generalUtilityDataFilters;
    } else if (this.meter.scope == 2) {
      selectedFacility.tableVehicleDataFilters = this.vehicleDataFilters;
    }
    await this.dbChangesService.updateFacilities(selectedFacility);
  }

  async showAllColumns() {
    if (this.meter.source == 'Electricity') {
      this.emissionsFilters = {
        showSection: true,
        marketEmissions: true,
        locationEmissions: true,
        recs: true,
        excessRECs: true,
        excessRECsEmissions: true

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
        stationaryBiogenicEmmissions: true,
        stationaryCarbonEmissions: true,
        stationaryOtherEmissions: true,
        totalEmissions: true,
      }
    } else if (this.meter.scope == 2) {
      this.vehicleDataFilters = {
        totalEnergy: true,
        totalCost: true,
        mobileBiogenicEmissions: true,
        mobileCarbonEmissions: true,
        mobileOtherEmissions: true,
        mobileTotalEmissions: true,
      }
    }

    this.meter.charges.forEach(charge => {
      charge.displayChargeInTable = true;
      charge.displayUsageInTable = true;
    })
    this.changeCharge();
  }

  async hideAllColumns() {
    if (this.meter.source == 'Electricity') {
      this.emissionsFilters = {
        showSection: false,
        marketEmissions: false,
        locationEmissions: false,
        recs: false,
        excessRECs: false,
        excessRECsEmissions: false

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
        stationaryBiogenicEmmissions: false,
        stationaryCarbonEmissions: false,
        stationaryOtherEmissions: false,
        totalEmissions: false,
      }
    } else if (this.meter.scope == 2) {
      this.vehicleDataFilters = {
        totalEnergy: false,
        totalCost: false,
        mobileBiogenicEmissions: false,
        mobileCarbonEmissions: false,
        mobileOtherEmissions: false,
        mobileTotalEmissions: false,
      }
    }
    this.meter.charges.forEach(charge => {
      charge.displayChargeInTable = false;
      charge.displayUsageInTable = false;
    })
    this.changeCharge();
  }

  checkShowSection() {
    this.generalInformationFilters.showSection = (
      this.generalInformationFilters.totalCost || this.generalInformationFilters.realDemand || this.generalInformationFilters.billedDemand);

    this.emissionsFilters.showSection = (
      this.emissionsFilters.marketEmissions || this.emissionsFilters.locationEmissions || this.emissionsFilters.recs
    )
  };

  async changeCharge() {
    await firstValueFrom(this.utilityMeterDbService.updateWithObservable(this.meter));
    let meters: Array<IdbUtilityMeter> = await firstValueFrom(this.utilityMeterDbService.getAll());
    let accountMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return this.meter.accountId == meter.accountId });
    this.utilityMeterDbService.accountMeters.next(accountMeters);
    let facilityMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == this.meter.facilityId });
    this.utilityMeterDbService.facilityMeters.next(facilityMeters);
    this.utilityMeterDbService.selectedMeter.next(this.meter);
    this.save();
  }
}
