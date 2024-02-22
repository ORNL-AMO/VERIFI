import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbAnalysisItem, IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import * as _ from 'lodash';
import { filterYearMeterData, filterYearPredictorData, getMonthlyStartAndEndDate, getPredictorUsage } from "../shared-calculations/calculationsHelpers";
import { getFiscalYear, getLastBillEntryFromCalanderizedMeterData } from "../shared-calculations/calanderizationFunctions";
import { AnalysisGroup } from "src/app/models/analysis";

export class MonthlyGroupAnalysisClass {

  selectedGroup: AnalysisGroup;
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  facilityPredictorData: Array<IdbPredictorEntry>;
  baselineDate: Date;
  endDate: Date;
  predictorVariables: Array<PredictorData>;
  groupMeters: Array<CalanderizedMeter>;
  groupMonthlyData: Array<MonthlyData>;
  baselineYear: number;
  annualMeterDataUsage: Array<{ year: number, usage: number }>;
  baselineYearEnergyIntensity: number;
  modelYear: number;
  constructor(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>, calculateAllMonthlyData: boolean) {
    this.selectedGroup = selectedGroup;
    this.analysisItem = analysisItem;
    this.facility = facility;

    let calanderizedFacilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid })
    this.setModelYear();
    this.setFacilityPredictorData(accountPredictorEntries);
    this.setStartAndEndDate(calanderizedFacilityMeters, calculateAllMonthlyData);
    this.setPredictorVariables();
    this.setGroupMeters(calanderizedFacilityMeters);
    this.setGroupMonthlyData();
    this.setBaselineYear();
    this.setAnnualMeterDataUsage();
    this.setBaselineYearEnergyIntensity();
  }

  setStartAndEndDate(calanderizedMeters: Array<CalanderizedMeter>, calculateAllMonthlyData: boolean) {
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = getMonthlyStartAndEndDate(this.facility, this.analysisItem);
    this.baselineDate = monthlyStartAndEndDate.baselineDate;
    if (calculateAllMonthlyData) {
      let lastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData(calanderizedMeters);
      let lastPredictorEntry: IdbPredictorEntry = _.maxBy(this.facilityPredictorData, (data: IdbPredictorEntry) => {
        return data.date;
      });
      if (lastPredictorEntry && lastBill.date > lastPredictorEntry.date) {
        this.endDate = new Date(lastPredictorEntry.date);
      } else {
        this.endDate = new Date(lastBill.date);
      }
      this.endDate.setMonth(this.endDate.getMonth() + 1);
      this.endDate.setDate(1);
    } else {
      this.endDate = monthlyStartAndEndDate.endDate;
    }
  }

  setPredictorVariables() {
    this.predictorVariables = new Array();
    this.selectedGroup.predictorVariables.forEach(variable => {
      if (this.selectedGroup.analysisType == 'absoluteEnergyConsumption') {
        variable.productionInAnalysis = false;
      }
      if (variable.productionInAnalysis) {
        this.predictorVariables.push(variable);
      }
    });
  }

  setFacilityPredictorData(accountPredictorEntries: Array<IdbPredictorEntry>) {
    this.facilityPredictorData = accountPredictorEntries.filter(entry => {
      return entry.facilityId == this.facility.guid;
    });
  }

  setGroupMeters(calanderizedMeters: Array<CalanderizedMeter>) {
    this.groupMeters = calanderizedMeters.filter(cMeter => { return cMeter.meter.groupId == this.selectedGroup.idbGroupId });
  }

  setGroupMonthlyData() {
    this.groupMonthlyData = this.groupMeters.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });
  }

  setBaselineYear() {
    this.baselineYear = getFiscalYear(this.baselineDate, this.facility);
  }

  setAnnualMeterDataUsage() {
    this.annualMeterDataUsage = new Array();
    for (let year = this.baselineYear; year <= this.endDate.getUTCFullYear(); year++) {
      let yearMeterData: Array<MonthlyData> = this.groupMonthlyData.filter(data => { return data.year == year });
      if (this.analysisItem.analysisCategory == 'energy') {
        let totalUsage: number = _.sumBy(yearMeterData, (data: MonthlyData) => { return data.energyUse });
        this.annualMeterDataUsage.push({ year: year, usage: totalUsage });
      } else if (this.analysisItem.analysisCategory == 'water') {
        let totalUsage: number = _.sumBy(yearMeterData,( data: MonthlyData) => { return data.energyConsumption });
        this.annualMeterDataUsage.push({ year: year, usage: totalUsage });
      }
    }
  }

  setBaselineYearEnergyIntensity() {
    if (this.selectedGroup.analysisType == 'energyIntensity' || this.selectedGroup.analysisType == 'modifiedEnergyIntensity') {
      let baselineYearPredictorData: Array<IdbPredictorEntry> = filterYearPredictorData(this.facilityPredictorData, this.baselineYear, this.facility);
      let baselineMeterData: Array<MonthlyData> = filterYearMeterData(this.groupMonthlyData, this.baselineYear, this.facility);
      let totalBaselineYearEnergy: number
      if (this.analysisItem.analysisCategory == 'energy') {
        totalBaselineYearEnergy = _.sumBy(baselineMeterData, (data: MonthlyData) => { return data.energyUse });
      } else if (this.analysisItem.analysisCategory == 'water') {
        totalBaselineYearEnergy = _.sumBy(baselineMeterData, (data: MonthlyData) => { return data.energyConsumption });
      }
      let totalPredictorUsage: number = getPredictorUsage(this.predictorVariables, baselineYearPredictorData);
      this.baselineYearEnergyIntensity = totalBaselineYearEnergy / totalPredictorUsage;
    } else {
      this.baselineYearEnergyIntensity = 0;
    }
  }

  getBaselineEnergyIntensity(selectedGroup: AnalysisGroup, facility: IdbFacility, allMeterData: Array<MonthlyData>, baselineYear: number, predictorVariables: Array<PredictorData>, facilityPredictorData: Array<IdbPredictorEntry>): number {
    if (selectedGroup.analysisType == 'energyIntensity' || selectedGroup.analysisType == 'modifiedEnergyIntensity') {
      let baselineYearPredictorData: Array<IdbPredictorEntry> = filterYearPredictorData(facilityPredictorData, baselineYear, facility);
      let baselineMeterData: Array<MonthlyData> = filterYearMeterData(allMeterData, baselineYear, facility);
      let totalBaselineYearEnergy: number;
      if (this.analysisItem.analysisCategory == 'energy') {
        totalBaselineYearEnergy = _.sumBy(baselineMeterData, (data: MonthlyData) => { return data.energyUse });
      } else if (this.analysisItem.analysisCategory == 'water') {
        totalBaselineYearEnergy = _.sumBy(baselineMeterData, (data: MonthlyData) => { return data.energyConsumption });
      }
      let totalPredictorUsage: number = getPredictorUsage(predictorVariables, baselineYearPredictorData);
      return totalBaselineYearEnergy / totalPredictorUsage;
    } else {
      return 0
    }
  }

  setModelYear() {
    if (this.selectedGroup.analysisType == 'regression') {
      this.modelYear = this.selectedGroup.regressionModelYear;
    } else {
      this.modelYear = this.analysisItem.baselineYear;
    }
  }
}