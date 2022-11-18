import { Injectable } from '@angular/core';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter, LastYearData, MeterGroupType, MonthlyData } from 'src/app/models/calanderization';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup } from 'src/app/models/idb';
import * as _ from 'lodash';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { BehaviorSubject } from 'rxjs';
import { Month, Months } from 'src/app/shared/form-data/months';
import { getFiscalYear } from 'src/app/shared/shared-analysis/calculations/getFiscalYear';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
@Injectable({
  providedIn: 'root'
})
export class MeterGroupingService {

  dataDisplay: "grouping" | "table" | "graph" = "grouping";
  displayGraphEnergy: "bar" | "scatter" = "bar";
  displayGraphCost: "bar" | "scatter" = "bar";
  dateRange: BehaviorSubject<{ minDate: Date, maxDate: Date }>;
  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService, private calanderizationService: CalanderizationService,
    private facilityDbService: FacilitydbService) {
    this.dateRange = new BehaviorSubject<{ minDate: Date, maxDate: Date }>({ minDate: undefined, maxDate: undefined });
  }

  getMeterGroupTypes(calanderizedMeters: Array<CalanderizedMeter>): Array<MeterGroupType> {
    let meterGroups: Array<IdbUtilityMeterGroup> = this.utilityMeterGroupDbService.facilityMeterGroups.getValue();
    //group meters by group type and set summaries
    let meterGroupTypes: Array<MeterGroupType> = _.chain(meterGroups).groupBy('groupType').map((value: Array<IdbUtilityMeterGroup>, key: string) => {
      let meterGroups: Array<IdbUtilityMeterGroup> = this.setGroupDataSummary(value, calanderizedMeters)
      return {
        meterGroups: meterGroups,
        groupType: key,
        id: Math.random().toString(36).substr(2, 9),
        meterGroupIds: meterGroups.map(meterGroup => { return String(meterGroup.id) })
      }
    }).value();

    let meterGroupIds: Array<string> = meterGroups.map(meterGroup => { return meterGroup.guid });
    //set no groups
    let metersWithoutGroups: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return !meterGroupIds.includes(cMeter.meter.groupId) });
    //Energy (Electricity/Natural Gas)
    let energyMeters: Array<CalanderizedMeter> = metersWithoutGroups.filter(cMeter => { return cMeter.meter.source == 'Electricity' || cMeter.meter.source == 'Natural Gas' || cMeter.meter.source == 'Other Fuels' || cMeter.meter.source == 'Other Energy' });
    if (energyMeters.length != 0) {
      meterGroupTypes = this.addEnergyMetersWithoutGroups(energyMeters, 'Energy', meterGroupTypes);
    }
    //Water/WasteWater
    let waterMeters: Array<CalanderizedMeter> = metersWithoutGroups.filter(cMeter => { return cMeter.meter.source == 'Water' || cMeter.meter.source == 'Waste Water' });
    if (waterMeters.length != 0) {
      meterGroupTypes = this.addEnergyMetersWithoutGroups(waterMeters, 'Water', meterGroupTypes);
    }
    //Other
    let otherMeters: Array<CalanderizedMeter> = metersWithoutGroups.filter(cMeter => { return cMeter.meter.source == 'Other Utility' });
    if (otherMeters.length != 0) {
      meterGroupTypes = this.addEnergyMetersWithoutGroups(otherMeters, 'Other', meterGroupTypes);
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

  setGroupDataSummary(meterGroups: Array<IdbUtilityMeterGroup>, calanderizedMeters: Array<CalanderizedMeter>): Array<IdbUtilityMeterGroup> {
    meterGroups.forEach(group => {
      let groupMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.groupId == group.guid });
      if (groupMeters.length != 0) {
        // let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(groupMeters, false);
        group.combinedMonthlyData = this.combineCalanderizedMeterData(groupMeters);
        group.groupData = groupMeters.map(cMeter => { return cMeter.meter });
        group.totalEnergyUse = _.sumBy(group.combinedMonthlyData, 'energyUse');
        group.totalConsumption = _.sumBy(group.combinedMonthlyData, 'energyConsumption');
      } else {
        group.groupData = [];
        group.totalConsumption = 0;
        group.totalEnergyUse = 0;
        group.combinedMonthlyData = [];
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

  addEnergyMetersWithoutGroups(energyMeters: Array<CalanderizedMeter>, groupType: 'Energy' | 'Water' | 'Other', meterGroupTypes: Array<MeterGroupType>) {
    // let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(energyMeters, false);
    let combinedMonthlyData: Array<MonthlyData> = this.combineCalanderizedMeterData(energyMeters);
    let meterGroup: IdbUtilityMeterGroup = {
      //randon number id for unsaved
      id: 1000000000000000 * Math.random(),
      guid: Math.random().toString(36).substr(2, 9),
      facilityId: undefined,
      accountId: undefined,
      groupType: groupType,
      name: 'Ungrouped',
      description: 'Meters with no group',
      dateModified: undefined,
      factionOfTotalEnergy: undefined,
      totalEnergyUse: _.sumBy(combinedMonthlyData, 'energyUse'),
      totalConsumption: _.sumBy(combinedMonthlyData, 'energyConsumption'),
      groupData: energyMeters.map(cMeter => { return cMeter.meter }),
      visible: true,
      combinedMonthlyData: combinedMonthlyData
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

  combineCalanderizedMeterData(calanderizedMeterData: Array<CalanderizedMeter>): Array<MonthlyData> {
    let combinedMeterData: Array<MonthlyData> = new Array();
    let allMonthlyData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => { return meterData.monthlyData });
    let dateRange: { minDate: Date, maxDate: Date } = this.dateRange.getValue();
    if (!dateRange.maxDate) {
      let startDateData: MonthlyData = this.calanderizationService.getFirstBillEntryFromCalanderizedMeterData(calanderizedMeterData);
      dateRange.minDate = new Date(startDateData.date);
      let endDateData: MonthlyData = this.calanderizationService.getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData);
      dateRange.maxDate = new Date(endDateData.date);
    }
    let startDate: Date = new Date(dateRange.minDate);
    let endDate: Date = new Date(dateRange.maxDate);
    let facility: IdbFacility = this.facilityDbService.selectedFacility.getValue();
    while (startDate <= endDate) {
      let filteredData: Array<MonthlyData> = allMonthlyData.filter(monthlyData => {
        let dataDate: Date = new Date(monthlyData.date);
        return (dataDate.getFullYear() == startDate.getFullYear()) && (dataDate.getMonth() == startDate.getMonth())
      });

      let month: Month = Months.find(month => { return month.monthNumValue == startDate.getMonth() })
      combinedMeterData.push({
        month: month.abbreviation,
        monthNumValue: month.monthNumValue,
        year: startDate.getFullYear(),
        fiscalYear: getFiscalYear(startDate, facility),
        energyConsumption: _.sumBy(filteredData, 'energyConsumption'),
        energyUse: _.sumBy(filteredData, 'energyUse'),
        energyCost: _.sumBy(filteredData, 'energyCost'),
        date: startDate,
        marketEmissions: _.sumBy(filteredData, 'marketEmissions'),
        locationEmissions: _.sumBy(filteredData, 'locationEmissions'),
        RECs: _.sumBy(filteredData, 'RECs'),
        excessRECs: _.sumBy(filteredData, 'excessRECs'), 
        excessRECsEmissions: _.sumBy(filteredData, 'excessRECsEmissions')
      })
      startDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1);
    }
    return combinedMeterData;
  }
}
