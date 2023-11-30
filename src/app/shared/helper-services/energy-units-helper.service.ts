import { Injectable } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { ChilledWaterUnitOptions, EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from '../unitOptions';
import { getIsEnergyMeter, getIsEnergyUnit } from '../sharedHelperFuntions';
import { AllSources, MeterPhase, MeterSource } from 'src/app/models/constantsAndTypes';
import { FuelTypeOption } from '../fuel-options/fuelTypeOption';
import { StationaryGasOptions } from '../fuel-options/stationaryGasOptions';
import { StationaryLiquidOptions } from '../fuel-options/stationaryLiquidOptions';
import { StationarySolidOptions } from '../fuel-options/stationarySolidOptions';
import { StationaryOtherEnergyOptions } from '../fuel-options/stationaryOtherEnergyOptions';

@Injectable({
  providedIn: 'root'
})
export class EnergyUnitsHelperService {

  constructor(private facilityDbService: FacilitydbService, private accountDbService: AccountdbService,) { }

  getMeterConsumptionUnitInAccount(meter: IdbUtilityMeter): string {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (selectedAccount) {
      let isEnergyMeter: boolean;
      if (meter.source == 'Other') {
        isEnergyMeter = getIsEnergyUnit(meter.startingUnit);
      } else {
        isEnergyMeter = getIsEnergyMeter(meter.source);
      }
      //use meter unit 
      if (isEnergyMeter) {
        return selectedAccount.energyUnit;
      } else {
        return this.getAccountUnitFromMeter(meter);
      }
    } else {
      return;
    }
  }

  getMeterConsumptionUnitInFacility(meter: IdbUtilityMeter): string {
    let accountFacilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let selectedFacility: IdbFacility = accountFacilities.find(facility => { return meter.facilityId == facility.guid });
    if (selectedFacility) {
      let isEnergyMeter: boolean;
      if (meter.source == 'Other') {
        isEnergyMeter = getIsEnergyUnit(meter.startingUnit);
      } else {
        isEnergyMeter = getIsEnergyMeter(meter.source);
      }
      //use meter unit 
      if (isEnergyMeter) {
        return selectedFacility.energyUnit;
      } else {
        return this.getFacilityUnitFromMeter(meter);
      }
    } else {
      return;
    }
  }

  getEnergyIsSourceInFacility(): boolean {
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (selectedFacility) {
      return selectedFacility.energyIsSource;
    }
    return;
  }

  getEnergyIsSourceInAccount(): boolean {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (selectedAccount) {
      return selectedAccount.energyIsSource;
    }
    return;
  }

  getFacilityUnitFromMeter(facilityMeter: IdbUtilityMeter): string {
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let selectedFacility: IdbFacility = facilities.find(facility => { return facility.guid == facilityMeter.facilityId });
    if (facilityMeter.source == 'Electricity' || getIsEnergyUnit(facilityMeter.startingUnit)) {
      return selectedFacility.energyUnit;
    } else if (facilityMeter.source == 'Natural Gas') {
      return selectedFacility.volumeGasUnit;
    } else if (facilityMeter.source == 'Other Fuels') {
      if (facilityMeter.phase == 'Gas') {
        return selectedFacility.volumeGasUnit;
      } else if (facilityMeter.phase == 'Liquid') {
        return selectedFacility.volumeLiquidUnit;
      } else if (facilityMeter.phase == 'Solid') {
        return selectedFacility.massUnit;
      }
    } else if (facilityMeter.source == 'Water Intake' || facilityMeter.source == 'Water Discharge') {
      return selectedFacility.volumeLiquidUnit;
    } else if (facilityMeter.source == 'Other Energy') {
      let selectedEnergyOption: FuelTypeOption = JSON.parse(JSON.stringify(StationaryOtherEnergyOptions.find(option => { return option.value == facilityMeter.fuel })));
      if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
        return selectedFacility.massUnit;
      } else if (selectedEnergyOption.otherEnergyType && (selectedEnergyOption.otherEnergyType == 'Chilled Water' || selectedEnergyOption.otherEnergyType == 'Hot Water')) {
        return selectedFacility.energyUnit;
      } else if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Compressed Air') {
        return selectedFacility.volumeGasUnit;
      }
    } else if (facilityMeter.source == 'Other') {
      return facilityMeter.startingUnit;
    }
  }

  getAccountUnitFromMeter(accountMeter: IdbUtilityMeter): string {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (accountMeter.source == 'Electricity' || getIsEnergyUnit(accountMeter.startingUnit)) {
      return selectedAccount.energyUnit;
    } else if (accountMeter.source == 'Natural Gas') {
      return selectedAccount.volumeGasUnit;
    } else if (accountMeter.source == 'Other Fuels') {
      if (accountMeter.phase == 'Gas') {
        return selectedAccount.volumeGasUnit;
      } else if (accountMeter.phase == 'Liquid') {
        return selectedAccount.volumeLiquidUnit;
      } else if (accountMeter.phase == 'Solid') {
        return selectedAccount.massUnit;
      }
    } else if (accountMeter.source == 'Water Intake' || accountMeter.source == 'Water Discharge') {
      return selectedAccount.volumeLiquidUnit;
    } else if (accountMeter.source == 'Other Energy') {
      let selectedEnergyOption: FuelTypeOption = JSON.parse(JSON.stringify(StationaryOtherEnergyOptions.find(option => { return option.value == accountMeter.fuel })));
      if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
        return selectedAccount.massUnit;
      } else if (selectedEnergyOption.otherEnergyType && (selectedEnergyOption.otherEnergyType == 'Chilled Water' || selectedEnergyOption.otherEnergyType == 'Hot Water')) {
        return selectedAccount.energyUnit;
      } else if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Compressed Air') {
        return selectedAccount.volumeGasUnit;
      }
    } else if (accountMeter.source == 'Other') {
      return accountMeter.startingUnit;
    }
  }


  // isEnergyUnit(unit: string): boolean {
  //   let findEnergyUnit: UnitOption = EnergyUnitOptions.find(unitOption => { return unitOption.value == unit });
  //   return findEnergyUnit != undefined;
  // }


  // isEnergyMeter(source: MeterSource): boolean {
  //   if (source == 'Electricity' || source == 'Natural Gas' || source == 'Other Fuels' || source == 'Other Energy') {
  //     return true;
  //   } else {
  //     return false;
  //   }
  // }

  getStartingUnitOptions(source: MeterSource, phase: MeterPhase, fuel: string, scope: number): Array<UnitOption> {
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

  getStartingUnitOptionsExistingData(source: MeterSource, phase: MeterPhase, fuel: string, startingUnit: string, scope: number): Array<UnitOption> {
    let isEnergyUnit: boolean = getIsEnergyUnit(startingUnit);
    if (isEnergyUnit) {
      return EnergyUnitOptions;
    } else if (source == 'Natural Gas') {
      return VolumeGasOptions;
    } else if (source == 'Other Fuels') {
      if (phase == 'Gas') {
        return VolumeGasOptions;
      } else if (phase == 'Liquid') {
        return VolumeLiquidOptions;
      } else if (phase == 'Solid') {
        return MassUnitOptions;
      }
    } else if (source == 'Other Energy') {
      let selectedEnergyOption: FuelTypeOption = StationaryOtherEnergyOptions.find(option => { return option.value == fuel });
      if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
        return MassUnitOptions;
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Chilled Water') {
        return ChilledWaterUnitOptions
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Compressed Air') {
        return VolumeGasOptions;
      }
    } else if (source == 'Water Intake' || source == 'Water Discharge') {
      return VolumeLiquidOptions;
    } else if (source == 'Other') {
      return VolumeGasOptions.concat(VolumeLiquidOptions).concat(MassUnitOptions).concat(ChilledWaterUnitOptions);
    }
  }


  parseSource(name: string): MeterSource {
    let source: MeterSource = AllSources.find(option => {
      let lowerCaseOption: string = option.toLocaleLowerCase();
      let lowerCaseName: string = name.toLocaleLowerCase();
      return lowerCaseName.includes(lowerCaseOption)
    })
    return source;
  }

  parseStartingUnit(name: string): string {
    let unit: UnitOption = EnergyUnitOptions.find(option => {
      let lowerCaseOption: string = option.value.toLocaleLowerCase();
      let lowerCaseName: string = name.toLocaleLowerCase();
      return lowerCaseName.includes(lowerCaseOption)
    });
    if (!unit) {
      unit = VolumeGasOptions.find(option => {
        let lowerCaseOption: string = option.value.toLocaleLowerCase();
        let lowerCaseName: string = name.toLocaleLowerCase();
        return lowerCaseName.includes(lowerCaseOption)
      });

    }
    if (!unit) {
      unit = VolumeLiquidOptions.find(option => {
        let lowerCaseOption: string = option.value.toLocaleLowerCase();
        let lowerCaseName: string = name.toLocaleLowerCase();
        return lowerCaseName.includes(lowerCaseOption);
      });

    }
    if (!unit) {
      unit = MassUnitOptions.find(option => {
        let lowerCaseOption: string = option.value.toLocaleLowerCase();
        let lowerCaseName: string = name.toLocaleLowerCase();
        return lowerCaseName.includes(lowerCaseOption)
      });

    }
    if (unit) {
      return unit.value;
    } else {
      return;
    }
  }


  parseFuelType(name: string): { phase: MeterPhase, fuelTypeOption: FuelTypeOption } {
    let fuelTypeOption: FuelTypeOption = StationaryGasOptions.find(option => {
      let lowerCaseOption: string = option.value.toLocaleLowerCase();
      let lowerCaseName: string = name.toLocaleLowerCase();
      return lowerCaseName.includes(lowerCaseOption)
    });
    if (fuelTypeOption) {
      return { phase: 'Gas', fuelTypeOption: fuelTypeOption };
    }
    fuelTypeOption = StationaryLiquidOptions.find(option => {
      let lowerCaseOption: string = option.value.toLocaleLowerCase();
      let lowerCaseName: string = name.toLocaleLowerCase();
      return lowerCaseName.includes(lowerCaseOption)
    });
    if (fuelTypeOption) {
      return { phase: 'Liquid', fuelTypeOption: fuelTypeOption };
    }
    fuelTypeOption = StationarySolidOptions.find(option => {
      let lowerCaseOption: string = option.value.toLocaleLowerCase();
      let lowerCaseName: string = name.toLocaleLowerCase();
      return lowerCaseName.includes(lowerCaseOption)
    });
    if (fuelTypeOption) {
      return { phase: 'Solid', fuelTypeOption: fuelTypeOption };
    }
    return undefined;
  }

  checkHasDifferentUnits(source: MeterSource, phase: MeterPhase, startingUnit: string, fuel: string, selectedFacility: IdbFacility, energyUnit: string): { differentEnergyUnit: boolean, emissionsOutputRate: boolean, differentCollectionUnit: boolean } {
    let hasDifferentCollectionUnits: boolean = false;
    let hasDifferentEnergyUnits: boolean = false;
    let hasDifferentEmissions: boolean = false;
    let isEnergyMeter: boolean = getIsEnergyMeter(source);
    if (isEnergyMeter) {
      let isEnergyUnit: boolean = getIsEnergyUnit(startingUnit);
      let meterEnergyUnit: string = energyUnit;
      if (isEnergyUnit) {
        meterEnergyUnit = startingUnit;
      }
      if (source != 'Electricity') {
        if (meterEnergyUnit != selectedFacility.energyUnit) {
          hasDifferentEnergyUnits = true;
        }
      } else if (meterEnergyUnit != selectedFacility.electricityUnit) {
        hasDifferentEnergyUnits = true;
      }
      if (!isEnergyUnit) {
        if (source == 'Natural Gas' && startingUnit != selectedFacility.volumeGasUnit) {
          hasDifferentCollectionUnits = true;
        } else if (source == 'Other Fuels') {
          if (phase == 'Gas' && startingUnit != selectedFacility.volumeGasUnit) {
            hasDifferentCollectionUnits = true;

          } else if (phase == 'Liquid' && startingUnit != selectedFacility.volumeLiquidUnit) {
            hasDifferentCollectionUnits = true;

          } else if (phase == 'Solid' && startingUnit != selectedFacility.massUnit) {
            hasDifferentCollectionUnits = true;
          }
        } else if (source == 'Other Energy') {
          let selectedEnergyOption: FuelTypeOption = StationaryOtherEnergyOptions.find(option => { return option.value == fuel });
          if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
            if (startingUnit != selectedFacility.massUnit) {
              hasDifferentCollectionUnits = true;
            }
          }
        } else if ((source == 'Water Intake' || source == 'Water Discharge') && (startingUnit != selectedFacility.volumeLiquidUnit)) {
          // facilityUnit = selectedFacility.volumeLiquidUnit;
          hasDifferentCollectionUnits = true;
        }
      }
    }
    return { differentCollectionUnit: hasDifferentCollectionUnits, differentEnergyUnit: hasDifferentEnergyUnits, emissionsOutputRate: hasDifferentEmissions };
  }

}
