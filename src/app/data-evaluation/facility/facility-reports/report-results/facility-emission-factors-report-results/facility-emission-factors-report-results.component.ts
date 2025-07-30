import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { FacilityReportsDbService } from 'src/app/indexedDB/facility-reports-db.service';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbFacilityReport, EmissionFactorsReportSettings } from 'src/app/models/idbModels/facilityReport';
import { EGridService } from 'src/app/shared/helper-services/e-grid.service';
import { FacilityReportsService } from '../../facility-reports.service';
import { EmissionsRate, SubregionEmissions } from 'src/app/models/eGridEmissions';
import { getEmissionsRate, getFuelEmissionsOutputRate } from 'src/app/calculations/emissions-calculations/emissions';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbCustomFuel } from 'src/app/models/idbModels/customFuel';
import { CustomFuelDbService } from 'src/app/indexedDB/custom-fuel-db.service';
import { FuelTypeOption } from 'src/app/shared/fuel-options/fuelTypeOption';
import { getMobileFuelTypes } from 'src/app/shared/fuel-options/getFuelTypeOptions';

@Component({
  selector: 'app-facility-emission-factors-report-results',
  standalone: false,

  templateUrl: './facility-emission-factors-report-results.component.html',
  styleUrl: './facility-emission-factors-report-results.component.css'
})
export class FacilityEmissionFactorsReportResultsComponent {

  facilityReport: IdbFacilityReport;
  emissionFactorsReportSettings: EmissionFactorsReportSettings;
  facilityReportSub: Subscription;
  print: boolean;
  printSub: Subscription;

  facility: IdbFacility;
  facilityMeters: Array<IdbUtilityMeter>;
  customFuels: Array<IdbCustomFuel>;
  electricityMeters: Array<string> = [];
  emissionDataElectricity: Array<EmissionElectricity> = [];
  emissionData: Array<EmissionOthers> = [];

  constructor(private facilityReportsDbService: FacilityReportsDbService,
    private facilityReportsService: FacilityReportsService,
    private utilityMeterDbService: UtilityMeterdbService,
    private facilityDbService: FacilitydbService,
    private customFuelDbService: CustomFuelDbService,
    private eGridService: EGridService) {
  }

  ngOnInit() {
    this.customFuels = this.customFuelDbService.accountCustomFuels.getValue();
    this.facilityReportSub = this.facilityReportsDbService.selectedReport.subscribe(report => {
      this.facilityReport = report;
      this.facilityMeters = this.utilityMeterDbService.getFacilityMetersByFacilityGuid(this.facilityReport.facilityId);
      this.emissionFactorsReportSettings = this.facilityReport.emissionFactorsReportSettings;
      this.calculateFacilitiesSummary();
    });
    this.printSub = this.facilityReportsService.print.subscribe(print => {
      this.print = print;
    });
  }

  ngOnDestroy() {
    this.facilityReportSub.unsubscribe();
    this.printSub.unsubscribe();
  }

  calculateFacilitiesSummary() {
    this.facility = this.facilityDbService.getFacilityById(this.facilityReport.facilityId);
    let co2EmissionsRates: Array<SubregionEmissions> = this.eGridService.co2Emissions.map(rate => { return rate });

    this.facilityMeters.forEach(meter => {
      if (meter.source === 'Electricity') {
        this.electricityMeters.push(meter.name);
      }
      if (meter.source === 'Electricity' && this.emissionDataElectricity.length === 0) {
        for (let year = this.emissionFactorsReportSettings.startYear; year <= this.emissionFactorsReportSettings.endYear; year++) {
          let emissionsRate = getEmissionsRate(this.facility.eGridSubregion, year, co2EmissionsRates);
          if (emissionsRate) {
            this.emissionDataElectricity.push({
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
        this.emissionData.push({
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

        this.emissionData.push({
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
  }
}

export interface EmissionElectricity {
  source: string;
  year: number;
  marketRate: EmissionsRate;
  locationRate: EmissionsRate;
  directEmissionsRate: boolean;
}

export interface EmissionOthers {
  meterName: string;
  source: string;
  fuelValue: string;
  CO2: number;
  CH4: number;
  N2O: number;
  unit: string;
}
