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
    let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
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
    let facilityPredictorData: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let productionPredictors: Array<PredictorData> = selectedGroup.predictorVariables.filter(variable => {
      return variable.production;
    });
    let productionPredictorIds: Array<string> = productionPredictors.map(predictor => { return predictor.id });
    for (let summaryYear: number = baselineYear; summaryYear <= analysisItem.reportYear; summaryYear++) {
      let summaryYearData: Array<MonthlyData> = allMeterData.filter(data => {
        return data.year == summaryYear;
      });
      let totalEnergyUse: number = _.sumBy(summaryYearData, 'energyUse');
      let summaryYearPredictors: Array<IdbPredictorEntry> = facilityPredictorData.filter(predictorData => {
        return new Date(predictorData.date).getUTCFullYear() == summaryYear;
      });

      let predictorData: Array<PredictorData> = summaryYearPredictors.flatMap(yearPredictor => { return yearPredictor.predictors });
      let productionPredictors: Array<PredictorData> = predictorData.filter(data => { return productionPredictorIds.includes(data.id) });

      let totalProduction: number = _.sumBy(productionPredictors, 'amount');
      let energyIntensity: number = totalEnergyUse / totalProduction;

      if (summaryYear == baselineYear) {
        baselineEnergyUse = totalEnergyUse;
        previousYearEnergyUse = totalEnergyUse;
        baselineProduction = totalProduction
        baselineEnergyIntensity = energyIntensity;
      }

      let cumulativeEnergyIntensityChange: number = (1 - (energyIntensity / baselineEnergyIntensity)) * 100;

      annualGroupSummaries.push({
        year: summaryYear,
        totalEnergy: totalEnergyUse,
        totalEnergySavings: baselineEnergyUse - totalEnergyUse,
        newEnergySavings: previousYearEnergyUse - totalEnergyUse,
        totalProduction: totalProduction,
        productionChange: baselineProduction - totalProduction,
        energyIntensity: energyIntensity,
        cumulativeEnergyIntensityChange: cumulativeEnergyIntensityChange,
        annualEnergyIntensityChange: cumulativeEnergyIntensityChange - previousYearEnergyIntensity,
        group: selectedGroup

      });
      previousYearEnergyUse = totalEnergyUse;
      previousYearEnergyIntensity = cumulativeEnergyIntensityChange;
    }
    return annualGroupSummaries;
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

    let baselineDate: Date = new Date(facility.sustainabilityQuestions.energyReductionBaselineYear, 0);
    let endDate: Date = new Date(analysisItem.reportYear + 1, 0);


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
      baselineDate.setUTCMonth(baselineDate.getUTCMonth() + 1);
    }
    return monthlyGroupSummary;
  }


  calculateFacilitySummary(analysisItem: IdbAnalysisItem, facility: IdbFacility): Array<FacilityGroupSummary> {
    let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
    let groupSummaries: Array<AnnualGroupSummary> = new Array();
    analysisItem.groups.forEach(group => {
      let groupSummary: Array<AnnualGroupSummary> = this.calculateAnnualGroupSummaries(analysisItem, group, facility);
      groupSummaries = groupSummaries.concat(groupSummary);
    });
    let facilityGroupSummaries: Array<FacilityGroupSummary> = new Array();

    for (let summaryYear: number = baselineYear + 1; summaryYear <= analysisItem.reportYear; summaryYear++) {
      let filterYearSummaries: Array<AnnualGroupSummary> = groupSummaries.filter(summary => { return summary.year == summaryYear });
      let totalEnergy: number = _.sumBy(filterYearSummaries, 'totalEnergy');
      let yearGroupSummaries: Array<FacilityYearGroupSummary> = new Array();

      filterYearSummaries.forEach(summary => {
        let percentBaseline: number = (summary.totalEnergy / totalEnergy);
        yearGroupSummaries.push({
          year: summary.year,
          group: summary.group,
          percentBaseline: percentBaseline * 100,
          energyIntensityImprovement: summary.cumulativeEnergyIntensityChange,
          improvementContribution: percentBaseline * summary.cumulativeEnergyIntensityChange,
          totalSavings: summary.totalEnergySavings,
          newSavings: summary.newEnergySavings
        })
      })

      facilityGroupSummaries.push({
        yearGroupSummaries: yearGroupSummaries,
        totals: {
          energyIntensityImprovement: _.sumBy(yearGroupSummaries, 'energyIntensityImprovement'),
          improvementContribution: _.sumBy(yearGroupSummaries, 'improvementContribution'),
          totalSavings: _.sumBy(yearGroupSummaries, 'totalSavings'),
          newSavings: _.sumBy(yearGroupSummaries, 'newSavings')
        }
      })

    }
    return facilityGroupSummaries;
  }
}
