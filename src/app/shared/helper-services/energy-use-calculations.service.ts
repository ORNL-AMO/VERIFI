import { Injectable } from '@angular/core';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbFacility, IdbUtilityMeter, MeterPhase, MeterSource } from 'src/app/models/idb';
import { FuelTypeOption, GasOptions, LiquidOptions, OtherEnergyOptions, SolidOptions } from 'src/app/utility/energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { ConvertUnitsService } from '../convert-units/convert-units.service';

@Injectable({
  providedIn: 'root'
})
export class EnergyUseCalculationsService {

  constructor(private convertUnitsService: ConvertUnitsService, private facilityDbService: FacilitydbService) { }

  getHeatingCapacity(source: MeterSource, startingUnit: string, selectedFuelTypeOption?: FuelTypeOption): number {
    let heatCapacity: number;
    if (source == 'Electricity') {
      heatCapacity = this.convertUnitsService.value(.003412).from('kWh').to(startingUnit);
    } 
    else if (source == 'Natural Gas') {
      let tmpHeatCapacity: number = this.convertUnitsService.value(.001029).from('ft3').to(startingUnit);
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      heatCapacity = this.convertUnitsService.value(tmpHeatCapacity).from('MMBtu').to(selectedFacility.energyUnit);
    } 
    else if (source == 'Other Fuels' || source == 'Other Energy') {
      if (selectedFuelTypeOption) {
        //copy for conversions
        let selectedFuelTypeOptionsCpy: FuelTypeOption = JSON.parse(JSON.stringify(selectedFuelTypeOption))
        if (selectedFuelTypeOptionsCpy.value && selectedFuelTypeOptionsCpy.startingUnit) {
          //TODO: Round value to some decimal place
          selectedFuelTypeOptionsCpy.heatCapacityValue = this.convertHeatCapacity(selectedFuelTypeOptionsCpy, startingUnit)
        }
        heatCapacity = selectedFuelTypeOptionsCpy.heatCapacityValue;
      }
    }
    heatCapacity = this.convertUnitsService.roundVal(heatCapacity, 4)
    return heatCapacity;
  }


  getSiteToSource(source: MeterSource, startingUnit: string, selectedFuelTypeOption?: FuelTypeOption): number{
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

  convertHeatCapacity(fuelTypeOption: FuelTypeOption, startingUnit: string): number {
    //fuelTypeOption heat capacity units: MMBtu/option.startingUnit
    //need to convert to: Facility Energy Unit / selected starting unit
    if (fuelTypeOption.heatCapacityValue && startingUnit) {
      let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
      let convertedHeatCapacity: number = this.convertUnitsService.value(fuelTypeOption.heatCapacityValue).from('MMBtu').to(selectedFacility.energyUnit);
      let conversionHelper: number = this.convertUnitsService.value(1).from(fuelTypeOption.startingUnit).to(startingUnit);
      return (convertedHeatCapacity / conversionHelper)
    }
    return 0;
  }


}
