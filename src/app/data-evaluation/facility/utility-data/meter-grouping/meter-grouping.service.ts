import { Injectable } from '@angular/core';
import { UtilityMeterGroupdbService } from 'src/app/indexedDB/utilityMeterGroup-db.service';
import { CalanderizedMeter, MeterGroupType, MonthlyData } from 'src/app/models/calanderization';
import * as _ from 'lodash';
import { BehaviorSubject } from 'rxjs';
import { Month, Months } from 'src/app/shared/form-data/months';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { getFirstBillEntryFromCalanderizedMeterData, getFiscalYear, getLastBillEntryFromCalanderizedMeterData } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { getIsEnergyMeter } from 'src/app/shared/sharedHelperFuntions';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { getNewIdbUtilityMeterGroup, IdbUtilityMeterGroup } from 'src/app/models/idbModels/utilityMeterGroup';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
@Injectable({
  providedIn: 'root'
})
export class MeterGroupingService {

  dataDisplay: "grouping" | "table" | "graph" = "grouping";
  displayGraphEnergy: "bar" | "scatter" = "bar";
  displayGraphCost: "bar" | "scatter" = "bar";
  dateRange: BehaviorSubject<{ minDate: Date, maxDate: Date }>;
  constructor(private utilityMeterGroupDbService: UtilityMeterGroupdbService,
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
    let energyMeters: Array<CalanderizedMeter> = metersWithoutGroups.filter(cMeter => { return this.getIsEnergyGroup(cMeter.meter) });
    if (energyMeters.length != 0) {
      meterGroupTypes = this.addEnergyMetersWithoutGroups(energyMeters, 'Energy', meterGroupTypes);
    }
    //Water/WasteWater
    let waterMeters: Array<CalanderizedMeter> = metersWithoutGroups.filter(cMeter => { return cMeter.meter.source == 'Water Intake' || cMeter.meter.source == 'Water Discharge' });
    if (waterMeters.length != 0) {
      meterGroupTypes = this.addEnergyMetersWithoutGroups(waterMeters, 'Water', meterGroupTypes);
    }
    //Other
    let otherMeters: Array<CalanderizedMeter> = metersWithoutGroups.filter(cMeter => { return this.getIsOtherGroup(cMeter.meter) });
    if (otherMeters.length != 0) {
      meterGroupTypes = this.addEnergyMetersWithoutGroups(otherMeters, 'Other', meterGroupTypes);
    } else {
      let hasOther: MeterGroupType = meterGroupTypes.find(mGroupType => {
        return mGroupType.groupType == 'Other'
      });
      if (!hasOther) {
        meterGroupTypes.push({
          groupType: "Other",
          meterGroups: [],
          id: Math.random().toString(36).substr(2, 9),
          meterGroupIds: [],
          totalUsage: 0
        });
      }
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
    let combinedMonthlyData: Array<MonthlyData> = this.combineCalanderizedMeterData(energyMeters);
    let meterGroup: IdbUtilityMeterGroup = getNewIdbUtilityMeterGroup(groupType, "Ungrouped", undefined, undefined);
    //randon number id for unsaved
    meterGroup.id = 1000000000000000 * Math.random();
    meterGroup.description = 'Meters with no group';
    meterGroup.totalEnergyUse = _.sumBy(combinedMonthlyData, 'energyUse');
    meterGroup.totalConsumption = _.sumBy(combinedMonthlyData, 'energyConsumption');
    meterGroup.groupData = energyMeters.map(cMeter => { return cMeter.meter });
    meterGroup.visible = true;
    meterGroup.combinedMonthlyData = combinedMonthlyData;
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
      let startDateData: MonthlyData = getFirstBillEntryFromCalanderizedMeterData(calanderizedMeterData);
      dateRange.minDate = new Date(startDateData.date);
      let endDateData: MonthlyData = getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData);
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
        readingType: undefined,
        RECs: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.RECs }),
        locationElectricityEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.locationElectricityEmissions }),
        marketElectricityEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.marketElectricityEmissions }),
        otherScope2Emissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.otherScope2Emissions }),
        scope2LocationEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.scope2LocationEmissions }),
        scope2MarketEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.scope2MarketEmissions }),
        excessRECs: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.excessRECs }),
        excessRECsEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.excessRECsEmissions }),
        mobileCarbonEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.mobileCarbonEmissions }),
        mobileBiogenicEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.mobileBiogenicEmissions }),
        mobileOtherEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.mobileOtherEmissions }),
        mobileTotalEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.mobileTotalEmissions }),
        fugitiveEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.fugitiveEmissions }),
        processEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.processEmissions }),
        stationaryEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.stationaryEmissions }),
        totalScope1Emissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.totalScope1Emissions }),
        totalWithMarketEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.totalWithMarketEmissions }),
        totalWithLocationEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.totalWithLocationEmissions }),
        stationaryBiogenicEmmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.stationaryBiogenicEmmissions }),
        totalBiogenicEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.totalBiogenicEmissions }),
        stationaryCarbonEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.stationaryCarbonEmissions }),
        stationaryOtherEmissions: _.sumBy(filteredData, (mData: MonthlyData) => { return mData.stationaryOtherEmissions }),
      })
      startDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1);
    }
    return combinedMeterData;
  }

  getIsEnergyGroup(meter: IdbUtilityMeter): boolean {
    if (getIsEnergyMeter(meter.source)) {
      if (meter.source != 'Electricity') {
        return true;
      } else if ((meter.agreementType != 4) && (meter.agreementType != 6)) {
        //Don't include VPPA and RECs
        return true;
      }
    }
    return false;
  }


  getIsOtherGroup(meter: IdbUtilityMeter): boolean {
    if (meter.source == 'Other') {
      return true;
    } else if (meter.source == 'Electricity') {
      //VPPA and RECs in other
      if (meter.agreementType == 4 || meter.agreementType == 6) {
        return true;
      }
    }
    return false;
  }
}
