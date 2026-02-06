import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import * as _ from 'lodash';
import { filterYearMeterData, filterYearPredictorData, getMonthlyStartAndEndDate, getPredictorUsage } from "../shared-calculations/calculationsHelpers";
import { getFiscalYear, getLastBillEntryFromCalanderizedMeterData } from "../shared-calculations/calanderizationFunctions";
import { AnalysisGroup } from "src/app/models/analysis";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { AnalysisGroupPredictorVariable } from "src/app/models/analysis";
import { IdbPredictorData } from "src/app/models/idbModels/predictorData";
import { IdbAnalysisItem } from "src/app/models/idbModels/analysisItem";
import { getDateFromPredictorData, getLatestPredictorData } from "src/app/shared/dateHelperFunctions";

export class MonthlyGroupAnalysisClass {

  selectedGroup: AnalysisGroup;
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  groupPredictorData: Array<IdbPredictorData>;
  bankedAnalysisDate: Date;
  baselineDate: Date;
  endDate: Date;
  predictorVariables: Array<AnalysisGroupPredictorVariable>;
  groupMeters: Array<CalanderizedMeter>;
  groupMonthlyData: Array<MonthlyData>;
  baselineYear: number;
  bankedAnalysisYear: number;
  annualMeterDataUsage: Array<{ year: number, usage: number }>;
  baselineYearEnergyIntensity: number;
  modelYear: number;
  customModelYear: {
    startMonth: number,
    startYear: number,
    endMonth: number,
    endYear: number
  }
  isNew: boolean;

  dataEndDate: Date;
  constructor(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorData>, calculateAllMonthlyData: boolean) {
    this.selectedGroup = selectedGroup;
    this.analysisItem = analysisItem;
    this.facility = facility;
    this.isNew = this.facility.isNewFacility;
    let calanderizedFacilityMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.facilityId == facility.guid })
    this.setModelYear();
    this.setPredictorVariables();
    this.setGroupPredictorData(accountPredictorEntries);
    this.setStartAndEndDate(calanderizedFacilityMeters, calculateAllMonthlyData);
    this.setGroupMeters(calanderizedFacilityMeters);
    this.setGroupMonthlyData();
    this.setBaselineYear();
    this.setAnnualMeterDataUsage();
    this.setBaselineYearEnergyIntensity();
  }

  setStartAndEndDate(calanderizedMeters: Array<CalanderizedMeter>, calculateAllMonthlyData: boolean) {
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date, bankedAnalysisDate: Date } = getMonthlyStartAndEndDate(this.facility, this.analysisItem, this.selectedGroup);
    this.baselineDate = monthlyStartAndEndDate.baselineDate;
    this.bankedAnalysisDate = monthlyStartAndEndDate.bankedAnalysisDate;
    if (calculateAllMonthlyData) {
      let metersInGroup: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.groupId == this.selectedGroup.idbGroupId });
      let lastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData(metersInGroup);
      let lastPredictorEntry: IdbPredictorData = getLatestPredictorData(this.groupPredictorData);
      if (lastPredictorEntry && lastBill.date.getTime() > getDateFromPredictorData(lastPredictorEntry).getTime()) {
        this.endDate = new Date(lastPredictorEntry.year, lastPredictorEntry.month - 1, 1);
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

  setGroupPredictorData(accountPredictorEntries: Array<IdbPredictorData>) {
    let predictorIds: Array<string> = this.predictorVariables.map(variable => { return variable.id });
    this.groupPredictorData = accountPredictorEntries.filter(entry => {
      return predictorIds.includes(entry.predictorId);
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
    if (this.bankedAnalysisDate) {
      this.bankedAnalysisYear = getFiscalYear(this.bankedAnalysisDate, this.facility);
    }
  }

  setAnnualMeterDataUsage() {
    this.annualMeterDataUsage = new Array();
    for (let year = this.baselineYear; year <= this.endDate.getUTCFullYear(); year++) {
      let yearMeterData: Array<MonthlyData> = this.groupMonthlyData.filter(data => { return data.year == year });
      if (this.analysisItem.analysisCategory == 'energy') {
        let totalUsage: number = _.sumBy(yearMeterData, (data: MonthlyData) => { return data.energyUse });
        this.annualMeterDataUsage.push({ year: year, usage: totalUsage });
      } else if (this.analysisItem.analysisCategory == 'water') {
        let totalUsage: number = _.sumBy(yearMeterData, (data: MonthlyData) => { return data.energyConsumption });
        this.annualMeterDataUsage.push({ year: year, usage: totalUsage });
      }
    }
  }

  setBaselineYearEnergyIntensity() {
    if (this.selectedGroup.analysisType == 'energyIntensity' || this.selectedGroup.analysisType == 'modifiedEnergyIntensity') {
      let baselineYearPredictorData: Array<IdbPredictorData> = filterYearPredictorData(this.groupPredictorData, this.baselineYear, this.facility);
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

  getBaselineEnergyIntensity(selectedGroup: AnalysisGroup, facility: IdbFacility, allMeterData: Array<MonthlyData>, baselineYear: number, predictorVariables: Array<AnalysisGroupPredictorVariable>, facilityPredictorData: Array<IdbPredictorData>): number {
    if (selectedGroup.analysisType == 'energyIntensity' || selectedGroup.analysisType == 'modifiedEnergyIntensity') {
      let baselineYearPredictorData: Array<IdbPredictorData> = filterYearPredictorData(facilityPredictorData, baselineYear, facility);
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
      if (this.selectedGroup.userDefinedModel && this.selectedGroup.regressionStartYear && this.selectedGroup.regressionEndYear) {
        this.customModelYear = {
          startMonth: this.selectedGroup.regressionModelStartMonth,
          startYear: this.selectedGroup.regressionStartYear,
          endMonth: this.selectedGroup.regressionModelEndMonth,
          endYear: this.selectedGroup.regressionEndYear
        }
        this.modelYear = this.selectedGroup.regressionEndYear;
      } else {
        this.modelYear = this.selectedGroup.regressionModelYear;
      }
    } else {
      this.modelYear = this.analysisItem.baselineYear;
    }
  }
}