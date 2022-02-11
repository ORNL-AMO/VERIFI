import { Injectable } from '@angular/core';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { AnnualAnalysisSummary, MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizationOptions, CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, PredictorData } from 'src/app/models/idb';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import { AnalysisCalculationsHelperService } from './analysis-calculations-helper.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class ModifiedEnergyIntensityService {

  constructor(private analysisCalculationsHelperService: AnalysisCalculationsHelperService, private predictorDbService: PredictordbService,
    private utilityMeterDbService: UtilityMeterdbService, private convertMeterDataService: ConvertMeterDataService,
    private calendarizationService: CalanderizationService) { }

  getMonthlyModifiedEnergyIntensitySummary(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, forAnnualSummaryCalculation?: boolean): MonthlyAnalysisSummary {
    let predictorVariables: Array<PredictorData> = new Array();
    selectedGroup.predictorVariables.forEach(variable => {
      if (variable.productionInAnalysis) {
        predictorVariables.push(variable)
      }
    });

    let facilityPredictorData: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();

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
    let summaryData: Array<MonthlyAnalysisSummaryData> = new Array();
    let baselineYear: number = this.analysisCalculationsHelperService.getFiscalYear(baselineDate, facility);
    //variables needed for calculations
    let previousEnergyUse: number = 0;
    let previousExpectedEnergyUse: number = 0;
    let previousMonthlySavings: number = 0;
    let previousFiscalYear: number = baselineYear;
    let yearToDateExpectedEnergyUse: number = 0;
    let yearToDateEnergyUse: number = 0;
    let baselineActualData: Array<number> = new Array();
    let baselineExpectedData: Array<number> = new Array();
    let baselinePredictorUsage: Array<number> = new Array();
    let baselineSEnPI: Array<number> = new Array();
    let summaryIndex: number = 0;
    let monthIndex: number = 0;
    let previousYearToDateSEnPI: number = 0;

    let baselineYearPredictorData: Array<IdbPredictorEntry> = this.analysisCalculationsHelperService.filterYearPredictorData(facilityPredictorData, baselineYear, facility);
    let baselineMeterData: Array<MonthlyData> = this.analysisCalculationsHelperService.filterYearMeterData(allMeterData, baselineYear, facility);
    let totalBaselineYearEnergy: number = _.sumBy(baselineMeterData, 'energyUse');
    let totalPredictorUsage: number = this.getPredictorUsage(predictorVariables, baselineYearPredictorData);

    let baselineYearEnergyIntensity: number = totalBaselineYearEnergy / totalPredictorUsage;
    while (baselineDate < endDate) {
      let fiscalYear: number = this.analysisCalculationsHelperService.getFiscalYear(new Date(baselineDate), facility);
      //predictor data for month
      let monthPredictorData: Array<IdbPredictorEntry> = facilityPredictorData.filter(predictorData => {
        let predictorDate: Date = new Date(predictorData.date);
        return predictorDate.getUTCFullYear() == baselineDate.getUTCFullYear() && predictorDate.getUTCMonth() == baselineDate.getUTCMonth();
      });
      //meter data for month
      let monthMeterData: Array<MonthlyData> = allMeterData.filter(data => {
        let meterDataDate: Date = new Date(data.date);
        return meterDataDate.getUTCFullYear() == baselineDate.getUTCFullYear() && meterDataDate.getUTCMonth() == baselineDate.getUTCMonth();
      });
      //energy use for month
      let energyUse: number = _.sumBy(monthMeterData, 'energyUse');
      //calculate predictor usage and modeledEnergy
      let predictorUsage: Array<number> = new Array();
      predictorVariables.forEach(variable => {
        let usageVal: number = 0;
        monthPredictorData.forEach(data => {
          let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
          usageVal = usageVal + predictorData.amount;
        });
        predictorUsage.push(usageVal);
      });
      let totalPredictorUsage: number = _.sum(predictorUsage);
      //track year to date energy use
      if (fiscalYear == baselineYear) {
        baselineActualData.push(energyUse);
        baselinePredictorUsage.push(totalPredictorUsage);
      }
      let baseLoad: number;
      if (selectedGroup.specifiedMonthlyPercentBaseload) {
        baseLoad = selectedGroup.monthlyPercentBaseload.find(load => { return load.monthNum == monthIndex }).percent / 100;
      } else {
        baseLoad = selectedGroup.averagePercentBaseload / 100;
      }
      //just need energy calculations
      if (previousFiscalYear == fiscalYear && summaryIndex != 0) {
        monthIndex++;
      } else {
        monthIndex = 0;
      }
      let modeledEnergy: number = energyUse / (1 - ((1 - baseLoad) * (1 - ((energyUse / totalPredictorUsage) / baselineYearEnergyIntensity)) + (baseLoad * (1 - (energyUse / baselineActualData[monthIndex])))));
      //calculate monthly savings
      let monthlySavings: number = 0;
      let rolling12MonthImprovement: number = 0;
      let rollingSEnPI: number = 1;
      let yearToDateSEnPI: number = 0;
      let yearToDateImprovement: number = 0;
      let yearToDateImprovementOverFiscalYear: number = 0;
      let monthlyIncrementalImprovement: number = 0;
      //skip incremental calcs for annual summary
      //just need energy calculations
      if (!forAnnualSummaryCalculation) {
        //if first year monthly savings = 0
        if (fiscalYear > baselineYear) {
          //after model year
          monthlySavings = energyUse - modeledEnergy;
        }
        //track year to date energy use
        if (fiscalYear == baselineYear) {
          baselineExpectedData.push(modeledEnergy);
        }
        //sum values for year to data
        if (previousFiscalYear == fiscalYear) {
          yearToDateEnergyUse = yearToDateEnergyUse + energyUse;
          yearToDateExpectedEnergyUse = yearToDateExpectedEnergyUse + modeledEnergy;
        } else {
          //rest fiscal year values on new year
          previousFiscalYear = fiscalYear;
          yearToDateEnergyUse = energyUse;
          yearToDateExpectedEnergyUse = modeledEnergy;
        }

        //year to date SEnPI calculation
        //calculate baseline expected and entered energy use
        //in same months as baseline year
        let baselineExpectedEnergy: number = 0;
        let baselineEnergy: number = 0;
        for (let i = 0; i <= monthIndex; i++) {
          baselineExpectedEnergy = baselineExpectedEnergy + baselineExpectedData[i];
          baselineEnergy = baselineEnergy + baselineActualData[i];
        }
        if (fiscalYear > baselineYear) {
          //after regression model year
          yearToDateSEnPI = (yearToDateEnergyUse * baselineExpectedEnergy) / (yearToDateExpectedEnergyUse * baselineEnergy)
        }

        //track baseline SEnPI values
        if (fiscalYear == baselineYear) {
          baselineSEnPI.push(yearToDateSEnPI);
        }

        //calculate rolling SEnPI using previous 12 months of calculations
        if (summaryIndex > 10) {
          let last12MonthsEnergyTotal: number = energyUse;
          let last12MonthExpectedEnergyTotal: number = modeledEnergy;
          for (let i = (summaryIndex - 11); i < summaryIndex; i++) {
            last12MonthsEnergyTotal = last12MonthsEnergyTotal + summaryData[i].totalEnergy;
            last12MonthExpectedEnergyTotal = last12MonthExpectedEnergyTotal + summaryData[i].modeledEnergy;
          }
          if (fiscalYear > baselineYear) {
            let baselineEnergyTotal: number = _.sum(baselineActualData);
            let baselineExpectedEnergyTotal: number = _.sum(baselineExpectedData);
            rollingSEnPI = (last12MonthsEnergyTotal * baselineExpectedEnergyTotal) / (last12MonthExpectedEnergyTotal * baselineEnergyTotal)
          }
        }

        //calculate year to date improvement
        if (fiscalYear > baselineYear) {
          yearToDateImprovement = 1 - yearToDateSEnPI;
          monthlyIncrementalImprovement = yearToDateImprovement - previousYearToDateSEnPI;
          yearToDateImprovementOverFiscalYear = monthlyIncrementalImprovement;
          for (let i = 1; i <= monthIndex; i++) {
            yearToDateImprovementOverFiscalYear = yearToDateImprovementOverFiscalYear + (summaryData[summaryIndex - i].monthlyIncrementalImprovement / 100)
          }
          //calculate rolling 12 month improvement
          rolling12MonthImprovement = 1 - rollingSEnPI;
        }
      }
      //add results
      summaryData.push({
        totalEnergy: energyUse,
        predictorUsage: predictorUsage,
        modeledEnergy: modeledEnergy,
        date: new Date(baselineDate),
        group: selectedGroup,
        fiscalYear: fiscalYear,
        monthlySavings: monthlySavings,
        yearToDateImprovementOverBaseline: yearToDateImprovement * 100,
        yearToDateImprovementOverFiscalYear: yearToDateImprovementOverFiscalYear * 100,
        rollingYearImprovement: 0,
        yearToDateSEnPI: yearToDateSEnPI,
        rollingSEnPI: rollingSEnPI,
        monthlyIncrementalImprovement: monthlyIncrementalImprovement * 100,
        rolling12MonthImprovement: rolling12MonthImprovement * 100
      });

      //set values for next iterations calculations
      previousYearToDateSEnPI = yearToDateImprovement;
      previousEnergyUse = energyUse;
      previousExpectedEnergyUse = modeledEnergy;
      previousMonthlySavings = monthlySavings;
      let currentMonth: number = baselineDate.getUTCMonth()
      let nextMonth: number = currentMonth + 1;
      baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
      summaryIndex++;
    }
    return {
      predictorVariables: predictorVariables,
      modelYear: undefined,
      monthlyAnalysisSummaryData: summaryData
    }
  }

  getAnnualAnalysisSummary(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility): Array<AnnualAnalysisSummary> {
    let annualAnalysisSummary: Array<AnnualAnalysisSummary> = new Array();
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

    let facilityPredictorData: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
    let reportYear: number = analysisItem.reportYear;
    if (facility.fiscalYear == 'nonCalendarYear' && facility.fiscalYearCalendarEnd) {
      baselineYear = baselineYear - 1;
      reportYear = reportYear - 1;
    }
    let baselineYearPredictorData: Array<IdbPredictorEntry> = this.analysisCalculationsHelperService.filterYearPredictorData(facilityPredictorData, baselineYear, facility);
    let baselineMeterData: Array<MonthlyData> = this.analysisCalculationsHelperService.filterYearMeterData(allMeterData, baselineYear, facility);
    let predictorVariables: Array<PredictorData> = new Array();
    selectedGroup.predictorVariables.forEach(variable => {
      if (variable.productionInAnalysis) {
        predictorVariables.push(variable)
      }
    });
    let baselineEnergyUse: number = _.sumBy(baselineMeterData, 'energyUse');

    let baselineProduction: number = this.getPredictorUsage(predictorVariables, baselineYearPredictorData);
    let baselineEnergyIntensity: number = baselineEnergyUse / baselineProduction;

    let previousYearSavings: number = 0;
    let previousYearEnergyUse: number = baselineEnergyUse;
    let previousYearEnergyIntensity: number = baselineEnergyIntensity;
    let previousYearProduction: number = baselineProduction;
    let totalEnergySavings: number = 0;
    let totalModeledEnergySavings: number = 0;
    let previousYearModeledEnergyUse: number;
    let baselineModeledEnergy: number;
    let baselineSEnPI: number;
    for (let summaryYear: number = baselineYear; summaryYear <= reportYear; summaryYear++) {
      //predictor data for summary year
      let summaryYearPredictorData: Array<IdbPredictorEntry> = this.analysisCalculationsHelperService.filterYearPredictorData(facilityPredictorData, summaryYear, facility);
      let totalPredictorUsage: number = this.getPredictorUsage(predictorVariables, summaryYearPredictorData);
      //meter data for summary year
      let summaryYearMeterData: Array<MonthlyData> = this.analysisCalculationsHelperService.filterYearMeterData(allMeterData, summaryYear, facility);
      let totalMeterEnergyUse: number = _.sumBy(summaryYearMeterData, 'energyUse');


      let energyIntensity: number = totalMeterEnergyUse / totalPredictorUsage;
      let baseload: number = selectedGroup.averagePercentBaseload / 100;
      let modeledEnergyUse: number = totalMeterEnergyUse / (1 - (baseload * (1 - (totalMeterEnergyUse / baselineEnergyUse)) + (1 - baseload) * (1 - (energyIntensity / baselineEnergyIntensity))));
      if(summaryYear == baselineYear){
        baselineModeledEnergy = modeledEnergyUse;
      }

      let SEnPI: number;
      let cumulativeSavings: number = 0;
      let annualSavings: number = 0;
      if (summaryYear > baselineYear) {
        SEnPI = (totalMeterEnergyUse * baselineModeledEnergy) / (modeledEnergyUse * baselineEnergyUse);
      } else {
        SEnPI = modeledEnergyUse / totalMeterEnergyUse;
      }
      if (summaryYear == baselineYear) {
        baselineSEnPI = SEnPI;
        previousYearEnergyUse = totalMeterEnergyUse;
        previousYearModeledEnergyUse = modeledEnergyUse;
      } else if (summaryYear > baselineYear) {
        cumulativeSavings = 1 - SEnPI;
        annualSavings = cumulativeSavings - previousYearSavings;
      } else {
        cumulativeSavings = (1 - baselineSEnPI) - (1 - SEnPI);
        annualSavings = cumulativeSavings - previousYearSavings;
      }

      let annualEnergySavings: number = previousYearEnergyUse - totalMeterEnergyUse;
      let annualModeledEnergySavings: number = previousYearModeledEnergyUse - modeledEnergyUse;
      totalEnergySavings = totalEnergySavings + annualEnergySavings;
      totalModeledEnergySavings = totalModeledEnergySavings + annualModeledEnergySavings;

      annualAnalysisSummary.push({
        year: summaryYear,
        energyUse: totalMeterEnergyUse,
        annualEnergySavings: annualEnergySavings,
        totalEnergySavings: totalEnergySavings,
        annualModeledEnergySavings: annualModeledEnergySavings,
        totalModeledEnergySavings: totalModeledEnergySavings,
        modeledEnergyUse: modeledEnergyUse,
        SEnPI: SEnPI,
        cumulativeSavings: cumulativeSavings * 100,
        annualSavings: annualSavings * 100,
        energyIntensity: energyIntensity
      })
      previousYearSavings = cumulativeSavings;
      previousYearEnergyUse = totalMeterEnergyUse;
      previousYearModeledEnergyUse = modeledEnergyUse;

    }
    return annualAnalysisSummary;
  }

  getPredictorUsage(predictorVariables: Array<PredictorData>, predictorData: Array<IdbPredictorEntry>): number {
    let totalPredictorUsage: number = 0;
    predictorVariables.forEach(variable => {
      predictorData.forEach(data => {
        let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
        totalPredictorUsage = totalPredictorUsage + predictorData.amount;
      });
    });
    return totalPredictorUsage;
  }
}
