import { AccountWorkspaceService } from 'src/app/account-workspace/account-workspace.service';
import { AccountWorkspaceStore } from 'src/app/account-workspace/account-workspace.store';
import { Component, Input, OnInit, inject } from '@angular/core';
import { DbChangesService } from 'src/app/indexedDB/db-changes.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { ElectricityDataFilters, EmissionsFilters, GeneralInformationFilters, GeneralUtilityDataFilters, VehicleDataFilters } from 'src/app/models/meterDataFilter';
import { checkShowEmissionsOutputRate, checkShowHeatCapacity, getIsEnergyUnit } from 'src/app/shared/sharedHelperFunctions';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterDataService } from 'src/app/shared/shared-meter-content/utility-meter-data.service';
import { firstValueFrom } from 'rxjs';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';

@Component({
  selector: 'app-utility-meter-data-filter',
  templateUrl: './utility-meter-data-filter.component.html',
  styleUrls: ['./utility-meter-data-filter.component.css'],
  standalone: false
})
export class UtilityMeterDataFilterComponent implements OnInit {
  private readonly accountWorkspaceService = inject(AccountWorkspaceService);
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  @Input()
  meter: IdbUtilityMeter;

  generalInformationFilters: GeneralInformationFilters;
  emissionsFilters: EmissionsFilters;
  generalUtilityDataFilters: GeneralUtilityDataFilters;
  displayVolumeInput: boolean;
  showEmissions: boolean;
  vehicleDataFilters: VehicleDataFilters;
  isRECs: boolean;
  account: IdbAccount;
  showHeatCapacity: boolean;
  showFuelEfficiency: boolean;
  private lastMeterId: string;

  constructor(private utilityMeterDataService: UtilityMeterDataService, private facilityDbService: FacilitydbService,
    private dbChangesService: DbChangesService,
    private utilityMeterDbService: UtilityMeterdbService,
    private accountDbService: AccountdbService) { }

  ngOnInit(): void {
    this.account = this.accountWorkspaceStore.account();
  }

  ngOnChanges() {
    if (!this.meter) {
      return;
    }
    if (this.meter.guid != this.lastMeterId) {
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
        this.showFuelEfficiency = (this.meter.vehicleCategory == 2);
      } else {
        this.showEmissions = checkShowEmissionsOutputRate(this.meter);
        this.displayVolumeInput = (getIsEnergyUnit(this.meter.startingUnit) == false);
        this.showHeatCapacity = checkShowHeatCapacity(this.meter.source, this.meter.startingUnit, this.meter.scope);
      }
      this.lastMeterId = this.meter.guid;
    }
  }

  async save() {
    let selectedFacility: IdbFacility = this.accountWorkspaceStore.selectedFacility();
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
    await this.dbChangesService.updateFacility(selectedFacility);
  }

  async showAllColumns() {
    if (this.meter.source == 'Electricity') {
      if (this.account.displayEmissions) {
        this.emissionsFilters = {
          showSection: true,
          marketEmissions: true,
          locationEmissions: true,
          recs: true,
          excessRECs: true,
          excessRECsEmissions: true

        }
      }
      this.generalInformationFilters = {
        showSection: true,
        totalCost: true,
        realDemand: true,
        billedDemand: true,
        powerFactor: true

      }
    } else if (this.meter.scope != 2) {
      this.generalUtilityDataFilters = {
        totalVolume: true,
        totalCost: true,
        stationaryBiogenicEmmissions: this.account.displayEmissions ? true : false,
        stationaryCarbonEmissions: this.account.displayEmissions ? true : false,
        stationaryOtherEmissions: this.account.displayEmissions ? true : false,
        totalEmissions: this.account.displayEmissions ? true : false,
        heatCapacity: checkShowHeatCapacity(this.meter.source, this.meter.startingUnit, this.meter.scope)
      }
    } else if (this.meter.scope == 2) {
      this.vehicleDataFilters = {
        totalEnergy: true,
        totalCost: true,
        mobileBiogenicEmissions: this.account.displayEmissions ? true : false,
        mobileCarbonEmissions: this.account.displayEmissions ? true : false,
        mobileOtherEmissions: this.account.displayEmissions ? true : false,
        mobileTotalEmissions: this.account.displayEmissions ? true : false,
        fuelEfficiency: (this.meter.vehicleCategory == 2) ? true : false
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
        billedDemand: false,
        powerFactor: false

      }
    } else if (this.meter.scope != 2) {
      this.generalUtilityDataFilters = {
        totalVolume: false,
        totalCost: false,
        stationaryBiogenicEmmissions: false,
        stationaryCarbonEmissions: false,
        stationaryOtherEmissions: false,
        totalEmissions: false,
        heatCapacity: false
      }
    } else if (this.meter.scope == 2) {
      this.vehicleDataFilters = {
        totalEnergy: false,
        totalCost: false,
        mobileBiogenicEmissions: false,
        mobileCarbonEmissions: false,
        mobileOtherEmissions: false,
        mobileTotalEmissions: false,
        fuelEfficiency: false
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
      this.generalInformationFilters.totalCost || this.generalInformationFilters.realDemand || this.generalInformationFilters.billedDemand || this.generalInformationFilters.powerFactor);

    this.emissionsFilters.showSection = (
      this.emissionsFilters.marketEmissions || this.emissionsFilters.locationEmissions || this.emissionsFilters.recs
    )
  };

  async changeCharge() {
    await firstValueFrom(this.utilityMeterDbService.updateWithObservable(this.meter));
    this.accountWorkspaceService.selectMeter((this.meter)?.guid);
    await this.accountWorkspaceService.reloadActiveWorkspace(true);
    this.save();
  }
}
