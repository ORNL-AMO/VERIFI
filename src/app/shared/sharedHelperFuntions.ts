import { ConvertValue } from "../calculations/conversions/convertValue";
import { MeterPhase, MeterSource } from "../models/constantsAndTypes";
import { IdbUtilityMeter } from "../models/idbModels/utilityMeter";
import { FuelTypeOption } from "./fuel-options/fuelTypeOption";
import { StationaryOtherEnergyOptions } from "./fuel-options/stationaryOtherEnergyOptions";
import { ChilledWaterUnitOptions, EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from "./unitOptions";

export function getGUID(): string {
    return Math.random().toString(36).substr(2, 9);
}

export function getIsEnergyUnit(unit: string): boolean {
    let findEnergyUnit: UnitOption = EnergyUnitOptions.find(unitOption => { return unitOption.value == unit });
    return findEnergyUnit != undefined;
}

export function getIsEnergyMeter(source: MeterSource): boolean {
    if (source == 'Electricity' || source == 'Natural Gas' || source == 'Other Fuels' || source == 'Other Energy') {
        return true;
    } else {
        return false;
    }
}

export function getHeatingCapacity(source: MeterSource, startingUnit: string, meterEnergyUnit: string, selectedFuelTypeOption?: FuelTypeOption): number {
    let heatCapacity: number;
    if (source == 'Electricity') {
        heatCapacity = new ConvertValue(.003412, 'kWh', startingUnit).convertedValue;
    }
    else if (source == 'Natural Gas') {
        let conversionHelper: number = new ConvertValue(1, 'ft3', startingUnit).convertedValue;
        let convertedHeatCapacity: number = new ConvertValue(.001029, 'MMBtu', meterEnergyUnit).convertedValue;
        heatCapacity = (convertedHeatCapacity / conversionHelper);
    }
    else if (source == 'Other Fuels' || source == 'Other Energy') {
        if (selectedFuelTypeOption) {
            //copy for conversions
            let selectedFuelTypeOptionsCpy: FuelTypeOption = JSON.parse(JSON.stringify(selectedFuelTypeOption))
            if (selectedFuelTypeOptionsCpy.value && selectedFuelTypeOptionsCpy.startingUnit) {
                selectedFuelTypeOptionsCpy.heatCapacityValue = convertHeatCapacity(selectedFuelTypeOptionsCpy, startingUnit, meterEnergyUnit)
            }
            heatCapacity = selectedFuelTypeOptionsCpy.heatCapacityValue;
        }
    }
    if (heatCapacity) {
        let numberAsString: string = (heatCapacity).toLocaleString(undefined, { maximumSignificantDigits: 5 });
        heatCapacity = parseFloat(numberAsString.replace(/,/g, ''));
    }
    return heatCapacity;
}

export function getSiteToSource(source: MeterSource, selectedFuelTypeOption?: FuelTypeOption, agreementType?: number): number {
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

export function convertHeatCapacity(fuelTypeOption: FuelTypeOption, startingUnit: string, meterEnergyUnit: string): number {
    //fuelTypeOption heat capacity units: MMBtu/option.startingUnit
    //need to convert to: Meter Energy Unit / selected starting unit
    if (fuelTypeOption.heatCapacityValue && startingUnit) {
        let convertedHeatCapacity: number = new ConvertValue(fuelTypeOption.heatCapacityValue, 'MMBtu', meterEnergyUnit).convertedValue;
        let conversionHelper: number = new ConvertValue(1, fuelTypeOption.startingUnit, startingUnit).convertedValue;
        return (convertedHeatCapacity / conversionHelper)
    }
    return 0;
}

export function convertEmissions(emissionsRate: number, energyUnit: string): number {
    if (energyUnit != 'MMBtu') {
        let conversionHelper: number = new ConvertValue(1, 'MMBtu', energyUnit).convertedValue;
        emissionsRate = emissionsRate / conversionHelper;
        emissionsRate = Number((emissionsRate).toLocaleString(undefined, { maximumSignificantDigits: 5 }));
    }
    return emissionsRate;
}

export function convertElectricityEmissions(emissionsRate: number, energyUnit: string): number {
    if (energyUnit != 'kWh') {
        let conversionHelper: number = new ConvertValue(1, 'kWh', energyUnit).convertedValue;
        emissionsRate = emissionsRate / conversionHelper;
        emissionsRate = Number((emissionsRate).toLocaleString(undefined, { maximumSignificantDigits: 5 }));
    }
    return emissionsRate;
}

export function getStartingUnitOptions(source: MeterSource, phase: MeterPhase, fuel: string, scope: number): Array<UnitOption> {
    if (source == 'Electricity' || !source) {
      return EnergyUnitOptions;
    } else if (source == 'Natural Gas') {
      return VolumeGasOptions.concat(EnergyUnitOptions);
    } else if (source == 'Other Fuels') {
      if (phase == 'Gas') {
        return VolumeGasOptions.concat(EnergyUnitOptions);
      } else if (phase == 'Liquid') {
        return VolumeLiquidOptions.concat(EnergyUnitOptions);
      } else if (phase == 'Solid') {
        return MassUnitOptions.concat(EnergyUnitOptions);
      }
    } else if (source == 'Other Energy') {
      let selectedEnergyOption: FuelTypeOption = StationaryOtherEnergyOptions.find(option => { return option.value == fuel });
      if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
        return MassUnitOptions.concat(EnergyUnitOptions);
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Chilled Water') {
        return EnergyUnitOptions.concat(ChilledWaterUnitOptions)
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Hot Water') {
        return EnergyUnitOptions;
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Compressed Air') {
        return EnergyUnitOptions.concat(VolumeGasOptions);
      }
    } else if (source == 'Water Intake' || source == 'Water Discharge') {
      return VolumeLiquidOptions;
    } else if (source == 'Other') {
      if (scope == 5 || scope == 6) {
        return MassUnitOptions;
      } else {
        return VolumeGasOptions.concat(VolumeLiquidOptions).concat(MassUnitOptions).concat(ChilledWaterUnitOptions);
      }
    }
    return EnergyUnitOptions;
  }

  export function checkShowHeatCapacity(source: MeterSource, startingUnit: string, scope: number): boolean {
      if (source != 'Water Intake' && source != 'Water Discharge' && source != 'Other' && startingUnit && scope != 2) {
          return (getIsEnergyUnit(startingUnit) == false);
      } else {
          return false;
      }
  }
  
  export function checkShowSiteToSource(source: MeterSource, includeInEnergy: boolean, scope: number): boolean {
      if (!includeInEnergy || scope == 2) {
          return false;
      } else if (source == "Electricity" || source == "Natural Gas" || source == 'Other Energy') {
          return true;
      } else {
          return false;
      }
  }
  
  export function checkShowEmissionsOutputRate(meter: IdbUtilityMeter): boolean {
      if (meter.source == 'Electricity' || meter.source == 'Natural Gas' || meter.source == 'Other Fuels' || meter.source == 'Other Energy' || (meter.source == 'Other' && meter.scope == 5)) {
          return true;
      } else {
          return false;
      }
  }