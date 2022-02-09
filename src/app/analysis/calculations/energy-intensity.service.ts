import { Injectable } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizationOptions, CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, PredictorData } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import * as _ from 'lodash';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { AnnualGroupSummary, FacilityGroupSummary, FacilityGroupTotals, FacilityYearGroupSummary, MonthlyGroupSummary } from 'src/app/models/analysis';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import { AnalysisCalculationsHelperService } from './analysis-calculations-helper.service';

@Injectable({
  providedIn: 'root'
})
export class EnergyIntensityService {

  constructor(private calendarizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictordbService,
    private convertMeterDataService: ConvertMeterDataService,
    private analysisCalculationsHelperService: AnalysisCalculationsHelperService) { }

  calculateAnnualGroupSummaries(analysisItem: IdbAnalysisItem, selectedGroup: AnalysisGroup, facility: IdbFacility): Array<AnnualGroupSummary> {
    let annualGroupSummaries: Array<AnnualGroupSummary> = new Array();

    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.groupId == selectedGroup.idbGroupId });
    let calanderizationOptions: CalanderizationOptions = {
      energyIsSource: analysisItem.energyIsSource
    }
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(groupMeters, false, false, calanderizationOptions);
    calanderizedMeterData.forEach(calanderizedMeter => {
      calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(analysisItem, calanderizedMeter.monthlyData, facility, calanderizedMeter.meter);
    });
    let allMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });

    let baselineEnergyUse: number;
    let previousYearEnergyUse: number;
    let baselineProduction: number;
    let baselineEnergyIntensity: number;
    let previousYearEnergyIntensity: number = 0;
    let previousYearProduction: number = 0;
    let facilityPredictorData: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let productionPredictors: Array<PredictorData> = selectedGroup.predictorVariables.filter(variable => {
      return variable.productionInAnalysis;
    });
    let productionPredictorIds: Array<string> = productionPredictors.map(predictor => { return predictor.id });
    let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
    let reportYear: number = analysisItem.reportYear;
    if (facility.fiscalYear == 'nonCalendarYear' && facility.fiscalYearCalendarEnd) {
      baselineYear = baselineYear - 1;
      reportYear = reportYear - 1;
    }


    for (let summaryYear: number = baselineYear; summaryYear <= reportYear; summaryYear++) {
      let summaryYearData: Array<MonthlyData> = this.analysisCalculationsHelperService.filterYearMeterData(allMeterData, summaryYear, facility);
      let totalEnergyUse: number = _.sumBy(summaryYearData, 'energyUse');
      let summaryYearPredictors: Array<IdbPredictorEntry> = this.analysisCalculationsHelperService.filterYearPredictorData(facilityPredictorData, summaryYear, facility);

      let predictorData: Array<PredictorData> = summaryYearPredictors.flatMap(yearPredictor => { return yearPredictor.predictors });
      let productionPredictors: Array<PredictorData> = predictorData.filter(data => { return productionPredictorIds.includes(data.id) });

      let totalProduction: number = _.sumBy(productionPredictors, 'amount');
      let energyIntensity: number = totalEnergyUse / totalProduction;

      if (summaryYear == baselineYear) {
        baselineEnergyUse = totalEnergyUse;
        previousYearEnergyUse = totalEnergyUse;
        baselineProduction = totalProduction
        baselineEnergyIntensity = energyIntensity;
        previousYearProduction = totalProduction;
      }

      let cumulativeEnergyIntensityChange: number = (1 - (energyIntensity / baselineEnergyIntensity)) * 100;

      let yearDisplay: number = summaryYear;
      if (facility.fiscalYear == 'nonCalendarYear' && facility.fiscalYearCalendarEnd) {
        yearDisplay = yearDisplay + 1;
      }
      annualGroupSummaries.push({
        year: yearDisplay,
        totalEnergy: totalEnergyUse,
        totalEnergySavings: baselineEnergyUse - totalEnergyUse,
        annualEnergySavings: previousYearEnergyUse - totalEnergyUse,
        totalProduction: totalProduction,
        totalProductionChange: baselineProduction - totalProduction,
        annualProductionChange: previousYearProduction - totalProduction,
        energyIntensity: energyIntensity,
        totalEnergyIntensityChange: cumulativeEnergyIntensityChange,
        annualEnergyIntensityChange: cumulativeEnergyIntensityChange - previousYearEnergyIntensity,
        group: selectedGroup

      });
      previousYearEnergyUse = totalEnergyUse;
      previousYearEnergyIntensity = cumulativeEnergyIntensityChange;
      previousYearProduction = totalProduction;
    }
    return annualGroupSummaries;
  }

 



  calculateMonthlyGroupSummaries(analysisItem: IdbAnalysisItem, selectedGroup: AnalysisGroup, facility: IdbFacility): Array<MonthlyGroupSummary> {
    let monthlyGroupSummary: Array<MonthlyGroupSummary> = new Array();

    let facilityPredictorData: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let productionPredictors: Array<PredictorData> = selectedGroup.predictorVariables.filter(variable => {
      return variable.productionInAnalysis;
    });
    let productionPredictorIds: Array<string> = productionPredictors.map(predictor => { return predictor.id });


    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.groupId == selectedGroup.idbGroupId });
    let calanderizationOptions: CalanderizationOptions = {
      energyIsSource: analysisItem.energyIsSource
    }
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(groupMeters, false, false, calanderizationOptions);
    calanderizedMeterData.forEach(calanderizedMeter => {
      calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(analysisItem, calanderizedMeter.monthlyData, facility, calanderizedMeter.meter);
    });
    let allMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });



    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let endDate: Date = monthlyStartAndEndDate.endDate;

    while (baselineDate < endDate) {
      let monthPredictorData: Array<IdbPredictorEntry> = facilityPredictorData.filter(predictorData => {
        let predictorDate: Date = new Date(predictorData.date);
        return predictorDate.getUTCFullYear() == baselineDate.getUTCFullYear() && predictorDate.getUTCMonth() == baselineDate.getUTCMonth();
      });

      let predictorData: Array<PredictorData> = monthPredictorData.flatMap(yearPredictor => { return yearPredictor.predictors });
      let productionPredictors: Array<PredictorData> = predictorData.filter(data => { return productionPredictorIds.includes(data.id) });

      let monthMeterData: Array<MonthlyData> = allMeterData.filter(data => {
        let meterDataDate: Date = new Date(data.date);
        return meterDataDate.getUTCFullYear() == baselineDate.getUTCFullYear() && meterDataDate.getUTCMonth() == baselineDate.getUTCMonth();
      });

      let energyUse: number = _.sumBy(monthMeterData, 'energyUse');
      let production: number = _.sumBy(productionPredictors, 'amount');

      monthlyGroupSummary.push({
        date: new Date(baselineDate),
        energyUse: energyUse,
        production: production,
        energyIntensity: energyUse / production,
        fiscalYear: this.analysisCalculationsHelperService.getFiscalYear(new Date(baselineDate), facility)
      })
      let currentMonth: number = baselineDate.getUTCMonth()
      let nextMonth: number = currentMonth + 1;
      baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
    }
    return monthlyGroupSummary;
  }

  calculateFacilitySummary(analysisItem: IdbAnalysisItem, facility: IdbFacility): Array<FacilityGroupSummary> {
    let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
    let groupSummaries: Array<AnnualGroupSummary> = new Array();
    analysisItem.groups.forEach(group => {
      let groupMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getGroupMetersByGroupId(group.idbGroupId)
      if (groupMeters.length != 0) {
        let groupSummary: Array<AnnualGroupSummary> = this.calculateAnnualGroupSummaries(analysisItem, group, facility);
        groupSummaries = groupSummaries.concat(groupSummary);
      }
    });
    let facilityGroupSummaries: Array<FacilityGroupSummary> = new Array();

    let baselineGroupSummaries: Array<AnnualGroupSummary> = groupSummaries.filter(summary => { return summary.year == baselineYear })
    let totalEnergy: number = _.sumBy(baselineGroupSummaries, 'totalEnergy');
    analysisItem.groups.forEach(group => {
      let groupMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.getGroupMetersByGroupId(group.idbGroupId)
      if (groupMeters.length != 0) {
        let summaries: Array<FacilityYearGroupSummary> = new Array()
        let groupSummary: Array<AnnualGroupSummary> = this.calculateAnnualGroupSummaries(analysisItem, group, facility);
        let baselineSummary: AnnualGroupSummary = groupSummary.find(summary => { return summary.year == baselineYear });
        let percentBaseline: number = baselineSummary.totalEnergy / totalEnergy;
        for (let summaryYear: number = baselineYear; summaryYear <= analysisItem.reportYear; summaryYear++) {
          let summary: AnnualGroupSummary = groupSummary.find(summary => { return summary.year == summaryYear });
          summaries.push({
            year: summary.year,
            energyIntensity: summary.energyIntensity,
            annualEnergyIntensityChange: summary.annualEnergyIntensityChange,
            energyIntensityImprovement: summary.totalEnergyIntensityChange,
            annualImprovementContribution: percentBaseline * summary.annualEnergyIntensityChange,
            totalImprovementContribution: percentBaseline * summary.totalEnergyIntensityChange,
            totalEnergySavings: summary.totalEnergySavings,
            annualEnergySavings: summary.annualEnergySavings,
            totalEnergy: summary.totalEnergy,
            totalProduction: summary.totalProduction
          })
        };
        facilityGroupSummaries.push({
          group: group,
          percentBaseline: percentBaseline * 100,
          summaries: summaries,
          collapsed: true
        });
      }
    })
    return facilityGroupSummaries;
  }

  calculateFacilityGroupTotals(facilityGroupSummaries: Array<FacilityGroupSummary>, facility: IdbFacility, analysisItem: IdbAnalysisItem): Array<FacilityGroupTotals>{
    let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
    let totals: Array<FacilityGroupTotals> = new Array();
    let allSummaries: Array<FacilityYearGroupSummary> = facilityGroupSummaries.flatMap(summary => {return summary.summaries});
    for (let summaryYear: number = baselineYear; summaryYear <= analysisItem.reportYear; summaryYear++) {
      let filteredSummaries: Array<FacilityYearGroupSummary> = allSummaries.filter(summary => {return summary.year == summaryYear});
      totals.push({
        year: summaryYear,
        // improvementContribution: number,
        totalSavings: _.sumBy(filteredSummaries, 'totalEnergySavings'),
        newSavings: _.sumBy(filteredSummaries, 'annualEnergySavings'),
        energyIntensity: _.sumBy(filteredSummaries, 'energyIntensity'),
        annualEnergyIntensityChange: _.sumBy(filteredSummaries, 'annualImprovementContribution'),
        energyIntensityImprovement: _.sumBy(filteredSummaries, 'totalImprovementContribution'),
        totalEnergy: _.sumBy(filteredSummaries, 'totalEnergy'),
        // totalProduction: number,
        totalEnergySavings:  _.sumBy(filteredSummaries, 'totalEnergySavings'),
        annualEnergySavings:  _.sumBy(filteredSummaries, 'annualEnergySavings')
      })
    }
    return totals;
  }

 
}
