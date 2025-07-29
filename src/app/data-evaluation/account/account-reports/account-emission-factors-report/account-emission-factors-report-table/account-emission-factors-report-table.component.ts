import { Component, Input } from '@angular/core';
import { getEmissionsRate, getFuelEmissionsOutputRate } from 'src/app/calculations/emissions-calculations/emissions';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { EmissionsRate, SubregionEmissions } from 'src/app/models/eGridEmissions';
import { IdbAccountReport } from 'src/app/models/idbModels/accountReport';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';
import { getMobileFuelTypes } from 'src/app/shared/fuel-options/getFuelTypeOptions';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';

@Component({
  selector: 'app-account-emission-factors-report-table',
  standalone: false,

  templateUrl: './account-emission-factors-report-table.component.html',
  styleUrl: './account-emission-factors-report-table.component.css'
})
export class AccountEmissionFactorsReportTableComponent {

  @Input()
  accountFacilities: Array<IdbFacility>;
  @Input()
  selectedReport: IdbAccountReport;

  customFuels: Array<IdbCustomFuel>;
  facilityEmissionData: Array<{ facility: IdbFacility, emissionsElectricity: Array<{ source: string, year: number, marketRate: EmissionsRate, locationRate: EmissionsRate, directEmissionsRate: boolean }>, otherEmissions: Array<{ meterName: string, source: string, fuelValue: string, CO2: number, CH4: number, N2O: number, unit: string }>, electricityMeters: Array<string> }> = [];

  constructor(private customFuelDbService: CustomFuelDbService,
    private utilityMeterDbService: UtilityMeterdbService,
    private eGridService: EGridService
  ) { }

  ngOnInit(): void {
    this.customFuels = this.customFuelDbService.accountCustomFuels.getValue();
    this.accountFacilities.forEach(facility => {
      let facilityMeters = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(facility.guid);
      this.calculateFacilitiesSummary(facility, facilityMeters);
    });
  }

  calculateFacilitiesSummary(facility: IdbFacility, facilityMeters: Array<IdbUtilityMeter>) {
    let emissionDataElectricity: Array<{ source: string, year: number, marketRate: EmissionsRate, locationRate: EmissionsRate, directEmissionsRate: boolean }> = [];
    let emissionData: Array<{ meterName: string, source: string, fuelValue: string, CO2: number, CH4: number, N2O: number, unit: string }> = [];
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
    this.facilityEmissionData.push({
      facility: facility,
      emissionsElectricity: emissionDataElectricity,
      otherEmissions: emissionData,
      electricityMeters: electricityMeters
    });
  }
}
