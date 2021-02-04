import { Injectable } from '@angular/core';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { IdbAccount, IdbFacility, IdbUtilityMeter } from 'src/app/models/idb';
import { FuelTypeOption, OtherEnergyOptions } from 'src/app/utility/energy-consumption/energy-source/edit-meter-form/editMeterOptions';
import { EnergyUnitOptions, MassUnitOptions, UnitOption, VolumeGasOptions, VolumeLiquidOptions } from '../unitOptions';

@Injectable({
  providedIn: 'root'
})
export class EnergyUnitsHelperService {

  constructor(private utilityMeterDbService: UtilityMeterdbService, private facilityDbService: FacilitydbService, private accountDbService: AccountdbService) { }

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
        return selectedFacility.chilledWaterUnit;
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
        return selectedAccount.chilledWaterUnit;
      }
    }
  }


  isEnergyUnit(unit: string): boolean {
    let findEnergyUnit: UnitOption = EnergyUnitOptions.find(unitOption => { return unitOption.value == unit });
    return findEnergyUnit != undefined;
  }


  isEnergyMeter(source: string): boolean {
    if (source == 'Electricity' || source == 'Natural Gas' || source == 'Other Fuels' || source == 'Other Energy') {
      return true;
    } else {
      return false;
    }
  }

  getStartingUnitOptions(source: string, phase: string, fuel: string): Array<UnitOption> {
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
        // this.setStartingUnit(selectedFacility.volumeLiquidUnit);
        //TODO: Add chilled water units
      } else if (selectedEnergyOption && selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Hot Water') {
        return EnergyUnitOptions;
      }
    } else if (source == 'Water' || source == 'Waste Water') {
      return VolumeLiquidOptions;
    }
    return EnergyUnitOptions;
  }

}
