import { Injectable } from '@angular/core';
import { MonthlyData } from 'src/app/models/calanderization';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import { EditMeterFormService } from 'src/app/facility/utility-data/energy-consumption/energy-source/edit-meter-form/edit-meter-form.service';
import { ConvertUnitsService } from '../convert-units/convert-units.service';
import { EnergyUnitsHelperService } from './energy-units-helper.service';

@Injectable({
  providedIn: 'root'
})
export class ConvertMeterDataService {

  constructor(private convertUnitsService: ConvertUnitsService, private energyUnitsHelperService: EnergyUnitsHelperService,
    private editMeterFormService: EditMeterFormService) { }

  convertMeterDataToFacility(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, facility: IdbFacility): Array<IdbUtilityMeterData> {
    let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
    if (isEnergyMeter) {
      for (let index: number = 0; index < meterData.length; index++) {
        meterData[index].totalEnergyUse = this.convertUnitsService.value(meterData[index].totalEnergyUse).from(meter.energyUnit).to(facility.energyUnit);
      }
    } else {
      let facilityUnit: string = this.energyUnitsHelperService.getFacilityUnitFromMeter(meter)
      for (let index: number = 0; index < meterData.length; index++) {
        meterData[index].totalVolume = this.convertUnitsService.value(meterData[index].totalVolume).from(meter.startingUnit).to(facilityUnit);
      }
    }
    return meterData;
  }

  convertMeterDataToAccount(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, account: IdbAccount): Array<IdbUtilityMeterData> {
    let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
    if (isEnergyMeter) {
      for (let index: number = 0; index < meterData.length; index++) {
        meterData[index].totalEnergyUse = this.convertUnitsService.value(meterData[index].totalEnergyUse).from(meter.energyUnit).to(account.energyUnit);
      }
    } else {
      let accountUnit: string = this.energyUnitsHelperService.getAccountUnitFromMeter(meter)
      for (let index: number = 0; index < meterData.length; index++) {
        meterData[index].totalVolume = this.convertUnitsService.value(meterData[index].totalVolume).from(meter.startingUnit).to(accountUnit);
      }
    }
    return meterData;
  }

  applySiteToSourceMultiplier(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    let showSiteToSource: boolean = this.editMeterFormService.checkShowSiteToSource(meter.source, meter.startingUnit, meter.includeInEnergy);
    if (showSiteToSource && meter.siteToSource) {
      for (let index = 0; index < meterData.length; index++) {
        meterData[index].totalEnergyUse = meterData[index].totalEnergyUse * meter.siteToSource;
      }
    }
    return meterData;
  }


  convertMeterDataToAnalysis(analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem, meterData: Array<MonthlyData>, accountOrFacility: IdbFacility | IdbAccount, meter: IdbUtilityMeter): Array<MonthlyData> {
    let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
    if (isEnergyMeter) {
      if(accountOrFacility.energyUnit != analysisItem.energyUnit){
        for (let index: number = 0; index < meterData.length; index++) {
          meterData[index].energyUse = this.convertUnitsService.value(meterData[index].energyUse).from(accountOrFacility.energyUnit).to(analysisItem.energyUnit);
        }
      }
    }
    return meterData;
  }
}
