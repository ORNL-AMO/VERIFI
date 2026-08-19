import { AccountWorkspaceStore } from '@data/account-workspace/account-workspace.store';
import { AccountWorkspaceQueryService } from '@data/account-workspace/account-workspace-query.service';
import { Component, Input, inject } from '@angular/core';
import { getEmissionsRate, getFuelEmissionsOutputRate } from '@domain/calculations/emissions-calculations/emissions';
import { EmissionElectricity, EmissionOthers } from '@v0/data-evaluation/facility/facility-reports/report-results/facility-emission-factors-report-results/facility-emission-factors-report-results.component';
import { SubregionEmissions } from '@data/models/eGridEmissions';
import { IdbAccountReport } from '@data/models/idbModels/accountReport';
import { IdbCustomFuel } from '@data/models/idbModels/customFuel';
import { IdbFacility } from '@data/models/idbModels/facility';
import { IdbUtilityMeter } from '@data/models/idbModels/utilityMeter';
import { FuelTypeOption } from '@app/shared/fuel-options/fuelTypeOption';
import { getMobileFuelTypes } from '@app/shared/fuel-options/getFuelTypeOptions';
import { EGridService } from '@app/shared/helper-services/e-grid.service';

@Component({
  selector: 'app-account-emission-factors-report-table',
  standalone: false,

  templateUrl: './account-emission-factors-report-table.component.html',
  styleUrl: './account-emission-factors-report-table.component.css'
})
export class AccountEmissionFactorsReportTableComponent {
  private readonly accountWorkspaceStore = inject(AccountWorkspaceStore);
  private readonly accountWorkspaceQuery = inject(AccountWorkspaceQueryService);

  @Input()
  accountFacilities: Array<IdbFacility>;
  @Input()
  selectedReport: IdbAccountReport;

  customFuels: Array<IdbCustomFuel>;
  emissionReportData: Array<EmissionFactorsReportData> = [];

  constructor(
    private eGridService: EGridService

  ) { }

  ngOnInit(): void {
    this.customFuels = [...this.accountWorkspaceStore.customFuels()];
    this.accountFacilities.forEach(facility => {
      let facilityMeters = this.accountWorkspaceQuery.getFacilityMeters(facility.guid);
      this.calculateFacilitiesSummary(facility, facilityMeters);
    });
  }

  calculateFacilitiesSummary(facility: IdbFacility, facilityMeters: Array<IdbUtilityMeter>) {
    let emissionDataElectricity: Array<EmissionElectricity> = [];
    let emissionData: Array<EmissionOthers> = [];
    let electricityMeters: Array<string> = [];

    let co2EmissionsRates: Array<SubregionEmissions> = this.eGridService.co2Emissions.map(rate => { return rate });

    facilityMeters.forEach(meter => {
      if (meter.source === 'Electricity') {
        electricityMeters.push(meter.name);
      }
      if (meter.source === 'Electricity' && emissionDataElectricity.length === 0) {
        for (let year = this.selectedReport.startYear; year <= this.selectedReport.endYear; year++) {
          let emissionsRate = getEmissionsRate(facility.eGridSubregion, year, co2EmissionsRates);
          if (emissionsRate) {
            emissionDataElectricity.push({
              source: meter.source,
              year: year,
              marketRate: emissionsRate.marketRate,
              locationRate: emissionsRate.locationRate,
              directEmissionsRate: emissionsRate.directEmissionsRate
            });
          }
        }
      }
      if (meter.source == 'Natural Gas' || (meter.source == 'Other Fuels' && meter.scope != 2) || meter.source == 'Other Energy') {
        let emissionsOutputRate = getFuelEmissionsOutputRate(meter.source, meter.fuel, meter.phase, this.customFuels, meter.scope, meter.vehicleCategory, meter.vehicleType);
        let selectedUnit;
        if (meter.source == 'Other Fuels') {
          selectedUnit = meter.vehicleCollectionUnit;
        }
        else {
          selectedUnit = meter.energyUnit;
        }
        emissionData.push({
          meterName: meter.name,
          source: meter.source,
          fuelValue: meter.fuel ? meter.fuel : '',
          CO2: emissionsOutputRate.CO2,
          CH4: emissionsOutputRate.CH4,
          N2O: emissionsOutputRate.N2O,
          unit: selectedUnit
        });
      }

      if (meter.source == 'Other Fuels' && meter.scope == 2) {
        let fuelOptions: Array<FuelTypeOption> = getMobileFuelTypes(meter.vehicleCategory, meter.vehicleType, this.customFuels);
        let meterFuel: FuelTypeOption = fuelOptions.find(option => {
          return option.value == meter.vehicleFuel
        });

        let selectedUnit;
        if (meterFuel.isOnRoad) {
          selectedUnit = meter.vehicleDistanceUnit;
        } else {
          selectedUnit = meter.vehicleCollectionUnit;
        }

        emissionData.push({
          meterName: meter.name,
          source: meter.source,
          fuelValue: meterFuel.value,
          CO2: meterFuel.CO2,
          CH4: meterFuel.CH4,
          N2O: meterFuel.N2O,
          unit: selectedUnit
        });
      }
    });
    this.emissionReportData.push({
      facility: facility,
      emissionsElectricity: emissionDataElectricity,
      otherEmissions: emissionData,
      electricityMeters: electricityMeters
    });
  }
}

export interface EmissionFactorsReportData {
  facility: IdbFacility;
  emissionsElectricity: Array<EmissionElectricity>;
  otherEmissions: Array<EmissionOthers>;
  electricityMeters: Array<string>;
}

