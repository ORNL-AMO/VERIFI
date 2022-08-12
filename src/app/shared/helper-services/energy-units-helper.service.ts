import { Injectable } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter, MeterPhase, MeterSource } from 'src/app/models/idb';
import { FuelTypeOption, GasOptions, LiquidOptions, OtherEnergyOptions, SolidOptions, SourceOptions } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { ChilledWaterUnitOptions, EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from '../unitOptions';
import { EnergyUseCalculationsService } from './energy-use-calculations.service';

@Injectable({
  providedIn: 'root'
})
export class EnergyUnitsHelperService {

  constructor(private facilityDbService: FacilitydbService, private accountDbService: AccountdbService,
    private energyUseCalculationsService: EnergyUseCalculationsService) { }

  getMeterConsumptionUnitInAccount(meter: IdbUtilityMeter): string {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (selectedAccount) {
      let isEnergyMeter: boolean = this.isEnergyMeter(meter.source);
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
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (selectedFacility) {
      let isEnergyMeter: boolean = this.isEnergyMeter(meter.source);
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
    let selectedFacility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    if (facilityMeter.source == 'Electricity') {
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
    } else if (facilityMeter.source == 'Water' || facilityMeter.source == 'Waste Water') {
      return selectedFacility.volumeLiquidUnit;
    } else if (facilityMeter.source == 'Other Energy') {
      let selectedEnergyOption: FuelTypeOption = JSON.parse(JSON.stringify(OtherEnergyOptions.find(option => { return option.value == facilityMeter.fuel })));
      if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
        return selectedFacility.massUnit;
      } else if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Chilled Water') {
        return selectedFacility.energyUnit;
      }
    }
  }

  getAccountUnitFromMeter(accountMeter: IdbUtilityMeter): string {
    let selectedAccount: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (accountMeter.source == 'Electricity') {
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
    } else if (accountMeter.source == 'Water' || accountMeter.source == 'Waste Water') {
      return selectedAccount.volumeLiquidUnit;
    } else if (accountMeter.source == 'Other Energy') {
      let selectedEnergyOption: FuelTypeOption = JSON.parse(JSON.stringify(OtherEnergyOptions.find(option => { return option.value == accountMeter.fuel })));
      if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
        return selectedAccount.massUnit;
      } else if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Chilled Water') {
        return selectedAccount.energyUnit;
      }
    }
  }


  isEnergyUnit(unit: string): boolean {
    let findEnergyUnit: UnitOption = EnergyUnitOptions.find(unitOption => { return unitOption.value == unit });
    return findEnergyUnit != undefined;
  }


  isEnergyMeter(source: MeterSource): boolean {
    if (source == 'Electricity' || source == 'Natural Gas' || source == 'Other Fuels' || source == 'Other Energy') {
      return true;
    } else {
      return false;
    }
  }

  getStartingUnitOptions(source: MeterSource, phase: MeterPhase, fuel: string): Array<UnitOption> {
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
      let selectedEnergyOption: FuelTypeOption = OtherEnergyOptions.find(option => { return option.value == fuel });
      if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
        return MassUnitOptions.concat(EnergyUnitOptions);
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Chilled Water') {
        return EnergyUnitOptions.concat(ChilledWaterUnitOptions)

      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Hot Water') {
        return EnergyUnitOptions;
      }
    } else if (source == 'Water' || source == 'Waste Water') {
      return VolumeLiquidOptions;
    } else if (source == 'Other Utility') {
      return EnergyUnitOptions.concat(VolumeGasOptions).concat(VolumeLiquidOptions).concat(MassUnitOptions).concat(ChilledWaterUnitOptions);
    }
    return EnergyUnitOptions;
  }

  getStartingUnitOptionsExistingData(source: MeterSource, phase: MeterPhase, fuel: string, startingUnit: string): Array<UnitOption> {
    let isEnergyUnit: boolean = this.isEnergyUnit(startingUnit);
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
      let selectedEnergyOption: FuelTypeOption = OtherEnergyOptions.find(option => { return option.value == fuel });
      if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
        return MassUnitOptions;
      }
    } else if (source == 'Water' || source == 'Waste Water') {
      return VolumeLiquidOptions;
    } else if (source == 'Other Utility') {
      return VolumeGasOptions.concat(VolumeLiquidOptions).concat(MassUnitOptions).concat(ChilledWaterUnitOptions);
    }
  }


  parseSource(name: string): MeterSource {
    let source: MeterSource = SourceOptions.find(option => {
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
    if(unit){
      return unit.value;
    }else{
      return;
    }
  }


  parseFuelType(name: string): { phase: MeterPhase, fuelTypeOption: FuelTypeOption } {
    let fuelTypeOption: FuelTypeOption = GasOptions.find(option => {
      let lowerCaseOption: string = option.value.toLocaleLowerCase();
      let lowerCaseName: string = name.toLocaleLowerCase();
      return lowerCaseName.includes(lowerCaseOption)
    });
    if (fuelTypeOption) {
      return { phase: 'Gas', fuelTypeOption: fuelTypeOption };
    }
    fuelTypeOption = LiquidOptions.find(option => {
      let lowerCaseOption: string = option.value.toLocaleLowerCase();
      let lowerCaseName: string = name.toLocaleLowerCase();
      return lowerCaseName.includes(lowerCaseOption)
    });
    if (fuelTypeOption) {
      return { phase: 'Liquid', fuelTypeOption: fuelTypeOption };
    }
    fuelTypeOption = SolidOptions.find(option => {
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
    let isEnergyMeter: boolean = this.isEnergyMeter(source);
    if (isEnergyMeter) {
      let isEnergyUnit: boolean = this.isEnergyUnit(startingUnit);
      let meterEnergyUnit: string = energyUnit;
      if (isEnergyUnit) {
        meterEnergyUnit = startingUnit;
      }
      if (source != 'Electricity') {
        if (meterEnergyUnit != selectedFacility.energyUnit) {
          hasDifferentEnergyUnits = true;
        }
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
          let selectedEnergyOption: FuelTypeOption = OtherEnergyOptions.find(option => { return option.value == fuel });
          if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
            if (startingUnit != selectedFacility.massUnit) {
              hasDifferentCollectionUnits = true;
            }
          }
        } else if ((source == 'Water' || source == 'Waste Water') && (startingUnit != selectedFacility.volumeLiquidUnit)) {
          // facilityUnit = selectedFacility.volumeLiquidUnit;
          hasDifferentCollectionUnits = true;
        }
      }
    }
    return { differentCollectionUnit: hasDifferentCollectionUnits, differentEnergyUnit: hasDifferentEnergyUnits, emissionsOutputRate: hasDifferentEmissions };
  }

}
