import { Injectable } from '@angular/core';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter, LastYearData, MeterGroupType, MonthlyData } from 'src/app/models/calanderization';
import { IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';
import * as _ from 'lodash';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
@Injectable({
  providedIn: 'root'
})
export class MeterGroupingService {

  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService, private calanderizationService: CalanderizationService) { }

  getMeterGroupTypes(facilityMeters: Array<IdbUtilityMeter>): Array<MeterGroupType> {
    let lastBill: MonthlyData = this.calanderizationService.getLastBillEntry(facilityMeters, false);

    let meterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.facilityMeterGroups.getValue();
    //group meters by group type and set summaries
    let meterGroupTypes: Array<MeterGroupType> = _.chain(meterGroups).groupBy('groupType').map((value: Array<IdbUtilityMeterGroup>, key: string) => {
      let meterGroups: Array<IdbUtilityMeterGroup> = this.setGroupDataSummary(value, lastBill, facilityMeters)
      return {
        meterGroups: meterGroups,
        groupType: key,
        id: Math.random().toString(36).substr(2, 9),
        meterGroupIds: meterGroups.map(meterGroup => { return String(meterGroup.id) })
      }
    }).value();

    let meterGroupIds: Array<number> = meterGroups.map(meterGroup => { return meterGroup.id });
    //set no groups
    let metersWithoutGroups: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return !meterGroupIds.includes(meter.groupId) });
    //Energy (Electricity/Natural Gas)
    let energyMeters: Array<IdbUtilityMeter> = metersWithoutGroups.filter(meter => { return meter.source == 'Electricity' || meter.source == 'Natural Gas' || meter.source == 'Other Fuels' || meter.source == 'Other Energy' });
    if (energyMeters.length != 0) {
      meterGroupTypes = this.addEnergyMetersWithoutGroups(energyMeters, 'Energy', lastBill, meterGroupTypes);
    }
    //Water/WasteWater
    let waterMeters: Array<IdbUtilityMeter> = metersWithoutGroups.filter(meter => { return meter.source == 'Water' || meter.source == 'Waste Water' });
    if (waterMeters.length != 0) {
      meterGroupTypes = this.addEnergyMetersWithoutGroups(waterMeters, 'Water', lastBill, meterGroupTypes);
    }
    //Other
    let otherMeters: Array<IdbUtilityMeter> = metersWithoutGroups.filter(meter => { return meter.source == 'Other Utility' });
    if (otherMeters.length != 0) {
      meterGroupTypes = this.addEnergyMetersWithoutGroups(otherMeters, 'Other', lastBill, meterGroupTypes);
    }
    //set fraction usage
    for (let i = 0; i < meterGroupTypes.length; i++) {
      meterGroupTypes[i].meterGroups = this.setFractionOfTotalEnergy(meterGroupTypes[i].meterGroups, meterGroupTypes[i].groupType);
      if (meterGroupTypes[i].groupType == 'Energy') {
        meterGroupTypes[i].totalUsage = _.sumBy(meterGroupTypes[i].meterGroups, 'totalEnergyUse');
      } else {
        meterGroupTypes[i].totalUsage = _.sumBy(meterGroupTypes[i].meterGroups, 'totalConsumption');
      }
    }

    return meterGroupTypes;
  }


  setGroupDataSummary(meterGroups: Array<IdbUtilityMeterGroup>, lastBill: MonthlyData, facilityMeters: Array<IdbUtilityMeter>): Array<IdbUtilityMeterGroup> {
    meterGroups.forEach(group => {
      let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.groupId == group.id });
      if (groupMeters.length != 0) {
        // let groupMeterIds: Array<number> = groupMeters.map(meter => { return meter.id });
        let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(groupMeters, false);
        let groupMeterData: Array<LastYearData> = this.calanderizationService.getPastYearData(groupMeters, false, lastBill);
        group.groupData = groupMeters;
        group.totalEnergyUse = _.sumBy(groupMeterData, 'energyUse');
        group.totalConsumption = _.sumBy(groupMeterData, 'energyConsumption');
        group.calanderizedData = calanderizedMeterData;
      } else {
        group.groupData = [];
        group.totalConsumption = 0;
        group.totalEnergyUse = 0;
      }
    });
    return meterGroups;
  }

  setFractionOfTotalEnergy(meterGroups: Array<IdbUtilityMeterGroup>, groupType: string): Array<IdbUtilityMeterGroup> {
    if (groupType == 'Energy') {
      let totalGroupEnergyUse: number = _.sumBy(meterGroups, 'totalEnergyUse');
      meterGroups.forEach(group => {
        group.factionOfTotalEnergy = (group.totalEnergyUse / totalGroupEnergyUse) * 100;
      });
    } else {
      let totalGroupConsumption: number = _.sumBy(meterGroups, 'totalConsumption');
      meterGroups.forEach(group => {
        group.factionOfTotalEnergy = (group.totalConsumption / totalGroupConsumption) * 100;
      });
    }
    return meterGroups
  }

  addEnergyMetersWithoutGroups(energyMeters: Array<IdbUtilityMeter>, groupType: string, lastBill: MonthlyData, meterGroupTypes: Array<MeterGroupType>) {
    let groupMeterData: Array<LastYearData> = this.calanderizationService.getPastYearData(energyMeters, false, lastBill);
    let meterGroup: IdbUtilityMeterGroup = {
      //randon number id for unsaved
      id: 1000000000000000 * Math.random(),
      facilityId: undefined,
      accountId: undefined,
      groupType: groupType,
      name: 'Ungrouped',
      description: 'Meters with no group',
      dateModified: undefined,
      factionOfTotalEnergy: undefined,
      totalEnergyUse: _.sumBy(groupMeterData, 'energyUse'),
      totalConsumption: _.sumBy(groupMeterData, 'energyConsumption'),
      groupData: energyMeters,
      visible: true
    }
    let energyGroup: MeterGroupType = meterGroupTypes.find(meterGroup => { return meterGroup.groupType == groupType })
    if (energyGroup) {
      energyGroup.meterGroups.push(meterGroup);
      energyGroup.meterGroupIds.push(String(meterGroup.id));
    } else {
      meterGroupTypes.push({
        groupType: groupType,
        meterGroups: [meterGroup],
        id: Math.random().toString(36).substr(2, 9),
        meterGroupIds: [String(meterGroup.id)],
        totalUsage: 0
      });
    }
    return meterGroupTypes;
  }
}
