import { Injectable } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility, IdbUtilityMeter, MeterPhase, MeterSource } from 'src/app/models/idb';
import { FuelTypeOption, GasOptions, LiquidOptions, OtherEnergyOptions, SolidOptions } from 'src/app/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { ConvertUnitsService } from '../convert-units/convert-units.service';

@Injectable({
  providedIn: 'root'
})
export class EnergyUseCalculationsService {

  constructor(private convertUnitsService: ConvertUnitsService, private facilityDbService: FacilitydbService) { }

  getHeatingCapacity(source: MeterSource, startingUnit: string, meterEnergyUnit: string, selectedFuelTypeOption?: FuelTypeOption): number {
    let heatCapacity: number;
    if (source == 'Electricity') {
      heatCapacity = this.convertUnitsService.value(.003412).from('kWh').to(startingUnit);
    }
    else if (source == 'Natural Gas') {
      let tmpHeatCapacity: number = this.convertUnitsService.value(.001029).from('ft3').to(startingUnit);
      // let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      heatCapacity = this.convertUnitsService.value(tmpHeatCapacity).from('MMBtu').to(meterEnergyUnit);
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
    heatCapacity = Number((heatCapacity).toLocaleString(undefined, { maximumSignificantDigits: 5 }));
    return heatCapacity;
  }


  getSiteToSource(source: MeterSource, startingUnit: string, selectedFuelTypeOption?: FuelTypeOption): number {
    let siteToSource: number;
    if (source == 'Electricity') {
      siteToSource = 3;
      //TODO: "On-site Renewable Electricity" has siteToSource = 1;
      //don't have any way to currently set "On-site"
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

  getEmissionsOutputRate(source: MeterSource, fuel: string, phase: MeterPhase, energyUnit: string): number{
    let emissionsRate: number;
    if (source == 'Electricity') {
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      emissionsRate = selectedFacility.emissionsOutputRate;
    } else if (source == 'Natural Gas') {
      emissionsRate = this.convertEmissions(53.06, energyUnit);
    } else if (source == 'Other Fuels') {
      let fuelTypeOptions: Array<FuelTypeOption> = this.getFuelTypeOptions(source, phase);
      let selectedFuel: FuelTypeOption = fuelTypeOptions.find(option => { return option.value == fuel })
      emissionsRate = selectedFuel.emissionsOutputRate;
      emissionsRate = this.convertEmissions(emissionsRate, energyUnit);
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


}
