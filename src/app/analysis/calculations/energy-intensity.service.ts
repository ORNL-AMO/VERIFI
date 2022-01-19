import { Injectable } from '@angular/core';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { CalanderizationOptions, CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, PredictorData } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import * as _ from 'lodash';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { AnnualGroupSummary, FacilityGroupSummary, FacilityYearGroupSummary, MonthlyGroupSummary } from 'src/app/models/analysis';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';

@Injectable({
  providedIn: 'root'
})
export class EnergyIntensityService {

  constructor(private calendarizationService: CalanderizationService,
    private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictordbService,
    private convertMeterDataService: ConvertMeterDataService) { }

  calculateAnnualGroupSummaries(analysisItem: IdbAnalysisItem, selectedGroup: AnalysisGroup, facility: IdbFacility): Array<AnnualGroupSummary> {
    let annualGroupSummaries: Array<AnnualGroupSummary> = new Array();

    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.groupId == selectedGroup.idbGroup.id });
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
      return variable.production;
    });
    let productionPredictorIds: Array<string> = productionPredictors.map(predictor => { return predictor.id });
    let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
    let reportYear: number = analysisItem.reportYear;
    if (facility.fiscalYear == 'nonCalendarYear' && facility.fiscalYearCalendarEnd) {
      baselineYear = baselineYear - 1;
      reportYear = reportYear - 1;
    }


    for (let summaryYear: number = baselineYear; summaryYear <= reportYear; summaryYear++) {
      let summaryYearData: Array<MonthlyData> = this.filterYearMeterData(allMeterData, summaryYear, facility);
      let totalEnergyUse: number = _.sumBy(summaryYearData, 'energyUse');
      let summaryYearPredictors: Array<IdbPredictorEntry> = this.filterYearPredictorData(facilityPredictorData, summaryYear, facility);

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

  filterYearPredictorData(predictorData: Array<IdbPredictorEntry>, year: number, facility: IdbFacility): Array<IdbPredictorEntry> {
    if (facility.fiscalYear == 'calendarYear') {
      return predictorData.filter(predictorData => {
        return new Date(predictorData.date).getUTCFullYear() == year;
      });
    } else {
      let startDate: Date = new Date(year, facility.fiscalYearMonth, 1)
      let endDate: Date = new Date(year + 1, facility.fiscalYearMonth, 1)
      return predictorData.filter(predictorDataItem => {
        let predictorItemDate: Date = new Date(predictorDataItem.date);
        return predictorItemDate >= startDate && predictorItemDate < endDate;
      });
    }
  }

  filterYearMeterData(meterData: Array<MonthlyData>, year: number, facility: IdbFacility): Array<MonthlyData> {
    if (facility.fiscalYear == 'calendarYear') {
      return meterData.filter(meterDataItem => {
        return new Date(meterDataItem.date).getUTCFullYear() == year;
      });
    } else {
      let startDate: Date = new Date(year, facility.fiscalYearMonth, 1)
      let endDate: Date = new Date(year + 1, facility.fiscalYearMonth, 1)
      return meterData.filter(meterDataItem => {
        let meterItemDate: Date = new Date(meterDataItem.date);
        return meterItemDate >= startDate && meterItemDate < endDate;
      });
    }
  }



  calculateMonthlyGroupSummaries(analysisItem: IdbAnalysisItem, selectedGroup: AnalysisGroup, facility: IdbFacility): Array<MonthlyGroupSummary> {
    let monthlyGroupSummary: Array<MonthlyGroupSummary> = new Array();

    let facilityPredictorData: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let productionPredictors: Array<PredictorData> = selectedGroup.predictorVariables.filter(variable => {
      return variable.production;
    });
    let productionPredictorIds: Array<string> = productionPredictors.map(predictor => { return predictor.id });


    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    let groupMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.groupId == selectedGroup.idbGroup.id });
    let calanderizationOptions: CalanderizationOptions = {
      energyIsSource: analysisItem.energyIsSource
    }
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calendarizationService.getCalanderizedMeterData(groupMeters, false, false, calanderizationOptions);
    calanderizedMeterData.forEach(calanderizedMeter => {
      calanderizedMeter.monthlyData = this.convertMeterDataService.convertMeterDataToAnalysis(analysisItem, calanderizedMeter.monthlyData, facility, calanderizedMeter.meter);
    });
    let allMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });



    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.getMonthlyStartAndEndDate(facility, analysisItem);
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
        let predictorDate: Date = new Date(data.date);
        return predictorDate.getUTCFullYear() == baselineDate.getUTCFullYear() && predictorDate.getUTCMonth() == baselineDate.getUTCMonth();
      });

      let energyUse: number = _.sumBy(monthMeterData, 'energyUse');
      let production: number = _.sumBy(productionPredictors, 'amount');

      monthlyGroupSummary.push({
        date: new Date(baselineDate),
        energyUse: energyUse,
        production: production,
        energyIntensity: energyUse / production
      })
      let currentMonth: number = baselineDate.getUTCMonth()
      let nextMonth: number = currentMonth + 1;
      baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
    }
    return monthlyGroupSummary;
  }

  getMonthlyStartAndEndDate(facility: IdbFacility, analysisItem: IdbAnalysisItem): { baselineDate: Date, endDate: Date } {
    let baselineDate: Date;
    let endDate: Date;
    if (facility.fiscalYear == 'calendarYear') {
      baselineDate = new Date(facility.sustainabilityQuestions.energyReductionBaselineYear, 0, 1);
      endDate = new Date(analysisItem.reportYear + 1, 0, 1);
    } else {
      if (facility.fiscalYearCalendarEnd) {
        baselineDate = new Date(facility.sustainabilityQuestions.energyReductionBaselineYear - 1, facility.fiscalYearMonth);
        endDate = new Date(analysisItem.reportYear, facility.fiscalYearMonth);
      } else {
        baselineDate = new Date(facility.sustainabilityQuestions.energyReductionBaselineYear, facility.fiscalYearMonth);
        endDate = new Date(analysisItem.reportYear + 1, facility.fiscalYearMonth);
      }
    }
    return {
      baselineDate: baselineDate,
      endDate: endDate
    }
  }


  calculateFacilitySummary(analysisItem: IdbAnalysisItem, facility: IdbFacility): Array<FacilityGroupSummary> {
    let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
    let groupSummaries: Array<AnnualGroupSummary> = new Array();
    analysisItem.groups.forEach(group => {
      let groupSummary: Array<AnnualGroupSummary> = this.calculateAnnualGroupSummaries(analysisItem, group, facility);
      groupSummaries = groupSummaries.concat(groupSummary);
    });
    let facilityGroupSummaries: Array<FacilityGroupSummary> = new Array();

    let percentBaseline: Array<number> = new Array();
    for (let summaryYear: number = baselineYear; summaryYear <= analysisItem.reportYear; summaryYear++) {
      let filterYearSummaries: Array<AnnualGroupSummary> = groupSummaries.filter(summary => { return summary.year == summaryYear });
      let totalEnergy: number = _.sumBy(filterYearSummaries, 'totalEnergy');
      let yearGroupSummaries: Array<FacilityYearGroupSummary> = new Array();

      filterYearSummaries.forEach((summary, index) => {
        if (summaryYear == baselineYear) {
          percentBaseline.push(summary.totalEnergy / totalEnergy);
        }
        yearGroupSummaries.push({
          year: summary.year,
          group: summary.group,
          percentBaseline: percentBaseline[index] * 100,
          energyIntensityImprovement: summary.annualEnergyIntensityChange,
          improvementContribution: percentBaseline[index] * summary.annualEnergyIntensityChange,
          totalEnergySavings: summary.totalEnergySavings,
          annualEnergySavings: summary.annualEnergySavings,
          totalEnergy: summary.totalEnergy,
          totalProduction: summary.totalProduction
        })
      })

      facilityGroupSummaries.push({
        yearGroupSummaries: yearGroupSummaries,
        totals: {
          energyIntensityImprovement: _.sumBy(yearGroupSummaries, 'energyIntensityImprovement'),
          improvementContribution: _.sumBy(yearGroupSummaries, 'improvementContribution'),
          totalSavings: _.sumBy(yearGroupSummaries, 'totalSavings'),
          newSavings: _.sumBy(yearGroupSummaries, 'newSavings'),
          totalEnergy: _.sumBy(yearGroupSummaries, 'totalEnergy'),
          totalProduction: _.sumBy(yearGroupSummaries, 'totalProduction'),
          totalEnergySavings: _.sumBy(yearGroupSummaries, 'totalEnergySavings'),
          annualEnergySavings: _.sumBy(yearGroupSummaries, 'annualEnergySavings')
        }
      })

    }
    return facilityGroupSummaries;
  }
}
