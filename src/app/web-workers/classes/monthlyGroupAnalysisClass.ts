import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, PredictorData } from "src/app/models/idb";
import { HelperService } from "./helperService";
import * as _ from 'lodash';

export class MonthlyGroupAnalysisClass {

  selectedGroup: AnalysisGroup;
  analysisItem: IdbAnalysisItem;
  facility: IdbFacility;
  facilityPredictorData: Array<IdbPredictorEntry>;
  helperService: HelperService;
  baselineDate: Date;
  endDate: Date;
  predictorVariables: Array<PredictorData>;
  groupMeters: Array<CalanderizedMeter>;
  groupMonthlyData: Array<MonthlyData>;
  baselineYear: number;
  annualMeterDataUsage: Array<{ year: number, usage: number }>;
  baselineYearEnergyIntensity: number;
  constructor(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>, accountPredictorEntries: Array<IdbPredictorEntry>) {
    this.selectedGroup = selectedGroup;
    this.analysisItem = analysisItem;
    this.facility = facility;

    this.helperService = new HelperService();
    this.setStartAndEndDate();
    this.setPredictorVariables();
    this.setFacilityPredictorData(accountPredictorEntries);
    this.setGroupMeters(calanderizedMeters);
    this.setGroupMonthlyData();
    this.setBaselineYear();
    this.setAnnualMeterDataUsage();
    this.setBaselineYearEnergyIntensity();
  }

  setStartAndEndDate() {
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.helperService.getMonthlyStartAndEndDate(this.facility, this.analysisItem);
    this.baselineDate = monthlyStartAndEndDate.baselineDate;
    this.endDate = monthlyStartAndEndDate.endDate;
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

  setFacilityPredictorData(accountPredictorEntries: Array<IdbPredictorEntry>){
    this.facilityPredictorData = accountPredictorEntries.filter(entry => {
      return entry.facilityId == this.facility.guid;
    });
  }

  setGroupMeters(calanderizedMeters: Array<CalanderizedMeter>){
    this.groupMeters = calanderizedMeters.filter(cMeter => { return cMeter.meter.groupId == this.selectedGroup.idbGroupId });
  }

  setGroupMonthlyData(){
    this.groupMonthlyData = this.groupMeters.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });
  }

  setBaselineYear(){
    this.baselineYear = this.helperService.getFiscalYear(this.baselineDate, this.facility);
  }

  setAnnualMeterDataUsage(){
    this.annualMeterDataUsage = new Array();
    for (let year = this.baselineYear + 1; year <= this.endDate.getUTCFullYear(); year++) {
      let yearMeterData: Array<MonthlyData> = this.groupMonthlyData.filter(data => { return data.year == year });
      let totalUsage: number = _.sumBy(yearMeterData, 'energyUse');
      this.annualMeterDataUsage.push({ year: year, usage: totalUsage });
    }
  }

  setBaselineYearEnergyIntensity(){
    if (this.selectedGroup.analysisType == 'energyIntensity' || this.selectedGroup.analysisType == 'modifiedEnergyIntensity') {
      let baselineYearPredictorData: Array<IdbPredictorEntry> = this.helperService.filterYearPredictorData(this.facilityPredictorData, this.baselineYear, this.facility);
      let baselineMeterData: Array<MonthlyData> = this.helperService.filterYearMeterData(this.groupMonthlyData, this.baselineYear, this.facility);
      let totalBaselineYearEnergy: number = _.sumBy(baselineMeterData, 'energyUse');
      let totalPredictorUsage: number = this.helperService.getPredictorUsage(this.predictorVariables, baselineYearPredictorData);
      this.baselineYearEnergyIntensity = totalBaselineYearEnergy / totalPredictorUsage;
    } else {
      this.baselineYearEnergyIntensity = 0;
    }
  }

  getBaselineEnergyIntensity(selectedGroup: AnalysisGroup, facility: IdbFacility, allMeterData: Array<MonthlyData>, baselineYear: number, predictorVariables: Array<PredictorData>, facilityPredictorData: Array<IdbPredictorEntry>): number {
    if (selectedGroup.analysisType == 'energyIntensity' || selectedGroup.analysisType == 'modifiedEnergyIntensity') {
      let baselineYearPredictorData: Array<IdbPredictorEntry> = this.helperService.filterYearPredictorData(facilityPredictorData, baselineYear, facility);
      let baselineMeterData: Array<MonthlyData> = this.helperService.filterYearMeterData(allMeterData, baselineYear, facility);
      let totalBaselineYearEnergy: number = _.sumBy(baselineMeterData, 'energyUse');
      let totalPredictorUsage: number = this.helperService.getPredictorUsage(predictorVariables, baselineYearPredictorData);
      return totalBaselineYearEnergy / totalPredictorUsage;
    } else {
      return 0
    }
  }
}