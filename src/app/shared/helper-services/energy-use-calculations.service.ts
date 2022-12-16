import { Injectable } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility, IdbUtilityMeter, MeterPhase, MeterSource } from 'src/app/models/idb';
import { FuelTypeOption, GasOptions, LiquidOptions, OtherEnergyOptions, SolidOptions } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { ConvertUnitsService } from '../convert-units/convert-units.service';
import { EGridService } from './e-grid.service';

@Injectable({
  providedIn: 'root'
})
export class EnergyUseCalculationsService {

  constructor(private convertUnitsService: ConvertUnitsService, private facilityDbService: FacilitydbService,
    private eGridService: EGridService) { }

  getHeatingCapacity(source: MeterSource, startingUnit: string, meterEnergyUnit: string, selectedFuelTypeOption?: FuelTypeOption): number {
    let heatCapacity: number;
    if (source == 'Electricity') {
      heatCapacity = this.convertUnitsService.value(.003412).from('kWh').to(startingUnit);
    }
    else if (source == 'Natural Gas') {
      // console.log(startingUnit);
      let conversionHelper: number = this.convertUnitsService.value(1).from('ft3').to(startingUnit);
      // let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let convertedHeatCapacity: number = this.convertUnitsService.value(.001029).from('MMBtu').to(meterEnergyUnit);
      heatCapacity = (convertedHeatCapacity / conversionHelper);


    }
    else if (source == 'Other Fuels' || source == 'Other Energy') {
      if (selectedFuelTypeOption) {
        //copy for conversions
        let selectedFuelTypeOptionsCpy: FuelTypeOption = JSON.parse(JSON.stringify(selectedFuelTypeOption))
        if (selectedFuelTypeOptionsCpy.value && selectedFuelTypeOptionsCpy.startingUnit) {
          //TODO: Round value to some decimal place
          selectedFuelTypeOptionsCpy.heatCapacityValue = this.convertHeatCapacity(selectedFuelTypeOptionsCpy, startingUnit, meterEnergyUnit)
        }
        heatCapacity = selectedFuelTypeOptionsCpy.heatCapacityValue;
      }
    }
    if (heatCapacity) {
      heatCapacity = Number((heatCapacity).toLocaleString(undefined, { maximumSignificantDigits: 5 }));
    }
    return heatCapacity;
  }


  getSiteToSource(source: MeterSource, selectedFuelTypeOption?: FuelTypeOption, agreementType?: number): number {
    let siteToSource: number;
    if (source == 'Electricity') {
      //grid or utility green product
      siteToSource = 3;
      //self or PPPA
      if (agreementType == 2 || agreementType == 3) {
        siteToSource = 1
      }
      //VPPA or RECs
      else if (agreementType == 4 || agreementType == 6) {
        siteToSource = 0
      }
    }
    else if (source == 'Natural Gas') {
      siteToSource = 1;
    }
    else if (source == 'Other Fuels' || source == 'Other Energy') {
      if (selectedFuelTypeOption) {
        siteToSource = selectedFuelTypeOption.siteToSourceMultiplier;
      }
    }
    return siteToSource;
  }

  getFuelTypeOptions(source: MeterSource, phase: MeterPhase): Array<FuelTypeOption> {
    if (source == 'Other Fuels') {
      if (phase == 'Solid') {
        return SolidOptions;
      } else if (phase == 'Liquid') {
        return LiquidOptions;
      } else if (phase == 'Gas') {
        return GasOptions;
      }
    } else if (source == 'Other Energy') {
      return OtherEnergyOptions;
    }
    return [];
  }

  convertHeatCapacity(fuelTypeOption: FuelTypeOption, startingUnit: string, meterEnergyUnit: string): number {
    //fuelTypeOption heat capacity units: MMBtu/option.startingUnit
    //need to convert to: Meter Energy Unit / selected starting unit
    if (fuelTypeOption.heatCapacityValue && startingUnit) {
      let convertedHeatCapacity: number = this.convertUnitsService.value(fuelTypeOption.heatCapacityValue).from('MMBtu').to(meterEnergyUnit);
      let conversionHelper: number = this.convertUnitsService.value(1).from(fuelTypeOption.startingUnit).to(startingUnit);
      return (convertedHeatCapacity / conversionHelper)
    }
    return 0;
  }

  getFuelEmissionsOutputRate(source: MeterSource, fuel: string, phase: MeterPhase, energyUnit: string): number {
    let emissionsRate: number;
    if (source == 'Natural Gas') {
      emissionsRate = this.convertEmissions(53.06, energyUnit);
    } else if (source == 'Other Fuels') {
      let fuelTypeOptions: Array<FuelTypeOption> = this.getFuelTypeOptions(source, phase);
      let selectedFuel: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == fuel })
      if (selectedFuel) {
        emissionsRate = selectedFuel.emissionsOutputRate;
        emissionsRate = this.convertEmissions(emissionsRate, energyUnit);
      }
    }
    return emissionsRate;
  }

  convertEmissions(emissionsRate: number, energyUnit: string): number {
    if (energyUnit != 'MMBtu') {
      let conversionHelper: number = this.convertUnitsService.value(1).from('MMBtu').to(energyUnit);
      emissionsRate = emissionsRate / conversionHelper;
      emissionsRate = Number((emissionsRate).toLocaleString(undefined, { maximumSignificantDigits: 5 }));
    }
    return emissionsRate;
  }

  convertElectricityEmissions(emissionsRate: number, energyUnit: string): number {
    if (energyUnit != 'kWh') {
      let conversionHelper: number = this.convertUnitsService.value(1).from('kWh').to(energyUnit);
      emissionsRate = emissionsRate / conversionHelper;
      emissionsRate = Number((emissionsRate).toLocaleString(undefined, { maximumSignificantDigits: 5 }));
    }
    return emissionsRate;
  }
}
