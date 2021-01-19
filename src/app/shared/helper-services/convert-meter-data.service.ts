import { Injectable } from '@angular/core';
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { ConvertUnitsService } from '../convert-units/convert-units.service';
import { EnergyUnitsHelperService } from './energy-units-helper.service';

@Injectable({
  providedIn: 'root'
})
export class ConvertMeterDataService {

  constructor(private convertUnitsService: ConvertUnitsService, private energyUnitsHelperService: EnergyUnitsHelperService) { }

  convertMeterDataToFacility(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, facility: IdbFacility): Array<IdbUtilityMeterData> {
    let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
    if (isEnergyMeter) {
      for (let index: number = 0; index < meterData.length; index++) {
        meterData[index].totalEnergyUse = this.convertUnitsService.from(meter.energyUnit).to(facility.energyUnit);
      }
    } else {
      let facilityUnit: string = this.energyUnitsHelperService.getFacilityUnitFromMeter(meter)
      for (let index: number = 0; index < meterData.length; index++) {
        meterData[index].totalVolume = this.convertUnitsService.from(meter.startingUnit).to(facilityUnit);
      }
    }
    return meterData;
  }

  convertMeterDataToAccount(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, account: IdbAccount): Array<IdbUtilityMeterData> {
    let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
    if (isEnergyMeter) {
      for (let index: number = 0; index < meterData.length; index++) {
        meterData[index].totalEnergyUse = this.convertUnitsService.from(meter.energyUnit).to(account.energyUnit);
      }
    } else {
      let accountUnit: string = this.energyUnitsHelperService.getAccountUnitFromMeter(meter)
      for (let index: number = 0; index < meterData.length; index++) {
        meterData[index].totalVolume = this.convertUnitsService.from(meter.startingUnit).to(accountUnit);
      }
    }
    return meterData;
  }


}
