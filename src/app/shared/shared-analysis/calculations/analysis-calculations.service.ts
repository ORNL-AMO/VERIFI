import { Injectable } from '@angular/core';
import { AnalysisGroup, IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, PredictorData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { CalanderizationOptions, CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AnnualAnalysisSummary, MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { AnalysisCalculationsHelperService } from './analysis-calculations-helper.service';

@Injectable({
  providedIn: 'root'
})
export class AnalysisCalculationsService {

  constructor(private calendarizationService: CalanderizationService,
    private convertMeterDataService: ConvertMeterDataService, private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictordbService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService) { }


  getMonthlyAnalysisSummary(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>): MonthlyAnalysisSummary {
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let endDate: Date = monthlyStartAndEndDate.endDate;

    let predictorVariables: Array<PredictorData> = new Array();
    selectedGroup.predictorVariables.forEach(variable => {
      if (selectedGroup.analysisType == 'absoluteEnergyConsumption') {
        variable.productionInAnalysis = false;
      }
      if (variable.productionInAnalysis) {
        predictorVariables.push(variable);
      }
    });

    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let facilityPredictorData: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => {
      return entry.facilityId == facility.guid;
    });
    
    let groupMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.groupId == selectedGroup.idbGroupId });
    let allMeterData: Array<MonthlyData> = groupMeters.flatMap(calanderizedMeter => { return calanderizedMeter.monthlyData });
    let baselineYear: number = this.analysisCalculationsHelperService.getFiscalYear(baselineDate, facility);
    let annualMeterDataUsage: Array<{ year: number, usage: number }> = new Array();
    for (let year = baselineYear + 1; year <= endDate.getUTCFullYear(); year++) {
      let yearMeterData: Array<MonthlyData> = allMeterData.filter(data => { return data.year == year });
      let totalUsage: number = _.sumBy(yearMeterData, 'energyUse');
      annualMeterDataUsage.push({ year: year, usage: totalUsage });
    }

    let analysisSummaryData: Array<MonthlyAnalysisSummaryData> = new Array();
    let baselineYearEnergyIntensity: number = this.getBaselineEnergyIntensity(selectedGroup, facility, allMeterData, baselineYear, predictorVariables, facilityPredictorData);


    let baselineActualEnergyUseData: Array<number> = new Array();
    let baselineModeledEnergyUseData: Array<number> = new Array();
    let previousFiscalYear: number;
    let monthIndex: number = 0;
    let yearToDateBaselineActualEnergyUse: number = 0;
    let yearToDateModeledEnergyUse: number = 0;
    let yearToDateActualEnergyUse: number = 0;
    let yearToDateBaselineModeledEnergyUse: number = 0;
    let yearToDateAdjustedEnergyUse: number = 0;
    let summaryDataIndex: number = 0;
    while (baselineDate < endDate) {
      let fiscalYear: number = this.analysisCalculationsHelperService.getFiscalYear(new Date(baselineDate), facility);
      if (previousFiscalYear == fiscalYear && summaryDataIndex != 0) {
        monthIndex++;
      } else {
        monthIndex = 0;
        yearToDateBaselineActualEnergyUse = 0;
        yearToDateModeledEnergyUse = 0;
        yearToDateActualEnergyUse = 0;
        yearToDateBaselineModeledEnergyUse = 0;
        yearToDateAdjustedEnergyUse = 0;
      }
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
      yearToDateActualEnergyUse = yearToDateActualEnergyUse + energyUse;
      //track year to date energy use
      if (fiscalYear == baselineYear) {
        baselineActualEnergyUseData.push(energyUse);
      }


      let predictorUsage: Array<{
        usage: number,
        predictorId: string
      }> = new Array();
      let productionUsage: Array<number> = new Array();
      selectedGroup.predictorVariables.forEach(variable => {
        let usageVal: number = 0;
        monthPredictorData.forEach(data => {
          let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
          usageVal = usageVal + predictorData.amount;
        });
        predictorUsage.push({
          usage: usageVal,
          predictorId: variable.id
        });
        if (variable.productionInAnalysis) {
          productionUsage.push(usageVal);
        }
      });

      let modeledEnergy: number = 0;
      let baselineActualEnergyUse: number = baselineActualEnergyUseData[monthIndex];
      yearToDateBaselineActualEnergyUse = yearToDateBaselineActualEnergyUse + baselineActualEnergyUse;
      if (selectedGroup.analysisType == 'regression') {
        modeledEnergy = this.calculateRegressionModeledEnergy(selectedGroup, predictorVariables, monthPredictorData);
      } else if (selectedGroup.analysisType == 'absoluteEnergyConsumption') {
        modeledEnergy = baselineActualEnergyUse;
      } else if (selectedGroup.analysisType == 'energyIntensity') {
        modeledEnergy = this.calculateEnergyIntensityModeledEnergy(baselineYearEnergyIntensity, productionUsage);
      } else if (selectedGroup.analysisType == 'modifiedEnergyIntensity') {
        modeledEnergy = this.calculateModifiedEnegyIntensityModeledEnergy(selectedGroup, baselineYearEnergyIntensity, baselineActualEnergyUse, productionUsage);
      }
      if (modeledEnergy < 0) {
        modeledEnergy = 0;
      }
      yearToDateModeledEnergyUse = yearToDateModeledEnergyUse + modeledEnergy;

      let annualEnergyUse: number = 0;
      if (fiscalYear == baselineYear) {
        baselineModeledEnergyUseData.push(modeledEnergy);
      } else {
        annualEnergyUse = annualMeterDataUsage.find(annualUsage => { return annualUsage.year == baselineDate.getUTCFullYear() }).usage;
      }

      if (previousFiscalYear != fiscalYear) {
        previousFiscalYear = fiscalYear;
      }
      let baselineAdjustmentForOther: number = 0;
      let baselineModeledEnergyUse: number = baselineModeledEnergyUseData[monthIndex];
      yearToDateBaselineModeledEnergyUse = yearToDateBaselineModeledEnergyUse + baselineModeledEnergyUse;

      let adjustedForNormalization: number = modeledEnergy + baselineActualEnergyUse - baselineModeledEnergyUse;
      if (selectedGroup.hasBaselineAdjustement && fiscalYear != baselineYear) {
        let yearAdjustment: { year: number, amount: number } = selectedGroup.baselineAdjustments.find(bAdjustement => { return bAdjustement.year == baselineDate.getUTCFullYear(); })
        if (yearAdjustment.amount) {
          baselineAdjustmentForOther = (energyUse / annualEnergyUse) * yearAdjustment.amount;
        }
      }
      let baselineAdjustment: number = 0;
      let baselineAdjustmentForNormalization: number = 0;
      let adjusted: number = adjustedForNormalization + baselineAdjustmentForOther;
      yearToDateAdjustedEnergyUse = yearToDateAdjustedEnergyUse + adjusted;
      
      
      let SEnPI: number = energyUse / adjusted;
      let savings: number = adjusted - energyUse;
      let percentSavingsComparedToBaseline: number = savings / adjusted;
      let yearToDateSavings: number = (yearToDateBaselineActualEnergyUse - yearToDateBaselineModeledEnergyUse) - (yearToDateActualEnergyUse - yearToDateModeledEnergyUse);
      let yearToDatePercentSavings: number = (yearToDateSavings / yearToDateAdjustedEnergyUse);
      let rollingSavings: number = 0;
      let rolling12MonthImprovement: number = 0;
      if (summaryDataIndex >= 11) {
        let totalBaselineModeledEnergy: number = _.sum(baselineModeledEnergyUseData);
        let totalBaselineEnergy: number = _.sum(baselineActualEnergyUseData);
        let last11MonthsData: Array<MonthlyAnalysisSummaryData> = JSON.parse(JSON.stringify(analysisSummaryData));
        last11MonthsData = last11MonthsData.splice(summaryDataIndex - 11, summaryDataIndex);
        let total12MonthsEnergyUse: number = _.sumBy(last11MonthsData, 'energyUse') + energyUse;
        let total12MonthsModeledEnergy: number = _.sumBy(last11MonthsData, 'modeledEnergy') + modeledEnergy;
        rollingSavings = (totalBaselineEnergy - totalBaselineModeledEnergy) - (total12MonthsEnergyUse - total12MonthsModeledEnergy);
        let total12MonthsAdjusedBaseline: number = _.sumBy(last11MonthsData, 'adjusted') + adjusted;
        rolling12MonthImprovement = rollingSavings / total12MonthsAdjusedBaseline;

        baselineAdjustmentForNormalization = adjustedForNormalization - baselineActualEnergyUse;
        baselineAdjustment = baselineAdjustmentForNormalization + baselineAdjustmentForOther;
      }

      analysisSummaryData.push({
        energyUse: energyUse,
        predictorUsage: predictorUsage,
        modeledEnergy: modeledEnergy,
        date: new Date(baselineDate),
        group: selectedGroup,
        fiscalYear: fiscalYear,
        adjustedForNormalization: adjustedForNormalization,
        adjusted: adjusted,
        baselineAdjustmentForNormalization: baselineAdjustmentForNormalization,
        baselineAdjustmentForOther: baselineAdjustmentForOther,
        baselineAdjustment: baselineAdjustment,
        SEnPI: this.analysisCalculationsHelperService.checkValue(SEnPI),
        savings: this.analysisCalculationsHelperService.checkValue(savings),
        percentSavingsComparedToBaseline: this.analysisCalculationsHelperService.checkValue(percentSavingsComparedToBaseline) * 100,
        yearToDateSavings: this.analysisCalculationsHelperService.checkValue(yearToDateSavings),
        yearToDatePercentSavings: this.analysisCalculationsHelperService.checkValue(yearToDatePercentSavings) * 100,
        rollingSavings: this.analysisCalculationsHelperService.checkValue(rollingSavings),
        rolling12MonthImprovement: this.analysisCalculationsHelperService.checkValue(rolling12MonthImprovement) * 100
      });
      summaryDataIndex++;
      let currentMonth: number = baselineDate.getUTCMonth()
      let nextMonth: number = currentMonth + 1;
      baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
    }

    return {
      predictorVariables: selectedGroup.predictorVariables,
      modelYear: undefined,
      monthlyAnalysisSummaryData: analysisSummaryData
    }

  }

  calculateRegressionModeledEnergy(selectedGroup: AnalysisGroup, predictorVariables: Array<PredictorData>, monthPredictorData: Array<IdbPredictorEntry>): number {
    let modeledEnergy: number = 0;
    predictorVariables.forEach(variable => {
      let usageVal: number = 0;
      monthPredictorData.forEach(data => {
        let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
        usageVal = usageVal + predictorData.amount;
      });
      modeledEnergy = modeledEnergy + (usageVal * variable.regressionCoefficient);
    });
    modeledEnergy = modeledEnergy + selectedGroup.regressionConstant;
    return modeledEnergy;
  }

  calculateEnergyIntensityModeledEnergy(baselineEnergyIntensity: number, productionUsage: Array<number>): number {
    let totalProductionUsage: number = _.sum(productionUsage);
    return baselineEnergyIntensity * totalProductionUsage;
  }

  getBaselineEnergyIntensity(selectedGroup: AnalysisGroup, facility: IdbFacility, allMeterData: Array<MonthlyData>, baselineYear: number, predictorVariables: Array<PredictorData>, facilityPredictorData: Array<IdbPredictorEntry>): number {
    if (selectedGroup.analysisType == 'energyIntensity' || selectedGroup.analysisType == 'modifiedEnergyIntensity') {
      let baselineYearPredictorData: Array<IdbPredictorEntry> = this.analysisCalculationsHelperService.filterYearPredictorData(facilityPredictorData, baselineYear, facility);
      let baselineMeterData: Array<MonthlyData> = this.analysisCalculationsHelperService.filterYearMeterData(allMeterData, baselineYear, facility);
      let totalBaselineYearEnergy: number = _.sumBy(baselineMeterData, 'energyUse');
      let totalPredictorUsage: number = this.analysisCalculationsHelperService.getPredictorUsage(predictorVariables, baselineYearPredictorData);
      return totalBaselineYearEnergy / totalPredictorUsage;
    } else {
      return 0
    }
  }

  calculateModifiedEnegyIntensityModeledEnergy(selectedGroup: AnalysisGroup, baselineYearEnergyIntensity: number, baselineEnergyUse: number, productionUsage: Array<number>): number {
    let totalProduction: number = _.sum(productionUsage);
    let baseLoad: number = selectedGroup.averagePercentBaseload / 100;
    return baselineYearEnergyIntensity * totalProduction * (1 - baseLoad) + (baselineEnergyUse * baseLoad);
  }


  getAnnualAnalysisSummary(selectedGroup: AnalysisGroup, analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>): Array<AnnualAnalysisSummary> {
    let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = this.getMonthlyAnalysisSummary(selectedGroup, analysisItem, facility, calanderizedMeters).monthlyAnalysisSummaryData;
    let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = this.calculateAnnualAnalysisSummary(monthlyAnalysisSummaryData, analysisItem, facility);
    return annualAnalysisSummaries;
  }


  calculateAnnualAnalysisSummary(monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>, analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem, facilityOrAccount: IdbFacility | IdbAccount, inAccount?: boolean): Array<AnnualAnalysisSummary> {
    let baselineYear: number = facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear;
    let reportYear: number = analysisItem.reportYear;
    if (facilityOrAccount.fiscalYear == 'nonCalendarYear' && facilityOrAccount.fiscalYearCalendarEnd) {
      baselineYear = baselineYear - 1;
      reportYear = reportYear - 1;
    }
    let facilityPredictorData: Array<IdbPredictorEntry> = new Array();
    let predictorVariables: Array<PredictorData> = new Array();
    if (!inAccount) {
      let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
      facilityPredictorData = accountPredictorEntries.filter(entry => {
        return entry.facilityId == facilityOrAccount.guid;
      });
      if (facilityPredictorData.length > 0) {
        predictorVariables = facilityPredictorData[0].predictors
      }

    }

    let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = new Array();
    let baselineEnergyUse: number;
    let baselineModeledEnergyUse: number;
    let cummulativeSavings: number = 0;
    let previousYearSavings: number = 0;
    let previousYearPercentSavings: number = 0;
    while (baselineYear <= reportYear) {
      let yearData: Array<MonthlyAnalysisSummaryData> = _.filter(monthlyAnalysisSummaryData, (data) => {
        return data.fiscalYear == baselineYear;
      });



      let predictorUsage: Array<{
        usage: number,
        predictorId: string
      }> = new Array();
      if (!inAccount) {
        let summaryYearPredictorData: Array<IdbPredictorEntry> = this.analysisCalculationsHelperService.filterYearPredictorData(facilityPredictorData, baselineYear, facilityOrAccount);

        predictorVariables.forEach(variable => {
          let usageVal: number = 0;
          summaryYearPredictorData.forEach(data => {
            let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
            usageVal = usageVal + predictorData.amount;
          });
          predictorUsage.push({
            usage: usageVal,
            predictorId: variable.id
          });
        });
      }

      let energyUse: number = _.sumBy(yearData, 'energyUse');
      let modeledEnergy: number = _.sumBy(yearData, 'modeledEnergy');
      if (baselineYear == facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear) {
        baselineEnergyUse = energyUse;
        baselineModeledEnergyUse = modeledEnergy;
      }
      let adjustedForNormalization: number = modeledEnergy + baselineEnergyUse - baselineModeledEnergyUse;
      let baselineAdjustmentForOther: number = _.sumBy(yearData, 'baselineAdjustmentForOther')

      let baselineAdjustment: number = 0;
      let baselineAdjustmentForNormalization: number = 0;
      if (baselineYear != facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear) {
        baselineAdjustmentForNormalization = adjustedForNormalization - baselineEnergyUse;
        baselineAdjustment = baselineAdjustmentForNormalization + baselineAdjustmentForOther;
      }
      let adjusted: number = adjustedForNormalization + baselineAdjustmentForOther;
      let SEnPI: number = energyUse / adjusted;
      let savings: number = adjusted - energyUse;
      let totalSavingsPercentImprovement: number = (savings / adjusted);
      let annualSavingsPercentImprovement: number = totalSavingsPercentImprovement - previousYearPercentSavings;
      cummulativeSavings = cummulativeSavings + savings;
      let newSavings: number = savings - previousYearSavings;

      annualAnalysisSummaries.push({
        year: baselineYear,
        energyUse: energyUse,
        modeledEnergy: modeledEnergy,
        adjustedForNormalization: adjustedForNormalization,
        adjusted: adjusted,
        baselineAdjustmentForNormalization: baselineAdjustmentForNormalization,
        baselineAdjustmentForOther: baselineAdjustmentForOther,
        baselineAdjustment: baselineAdjustment,
        SEnPI: this.analysisCalculationsHelperService.checkValue(SEnPI),
        savings: this.analysisCalculationsHelperService.checkValue( savings),
        totalSavingsPercentImprovement: this.analysisCalculationsHelperService.checkValue(totalSavingsPercentImprovement) * 100,
        annualSavingsPercentImprovement: this.analysisCalculationsHelperService.checkValue(annualSavingsPercentImprovement) * 100,
        cummulativeSavings: this.analysisCalculationsHelperService.checkValue(cummulativeSavings),
        newSavings: this.analysisCalculationsHelperService.checkValue(newSavings),
        predictorUsage: predictorUsage
      })
      previousYearPercentSavings = totalSavingsPercentImprovement;
      previousYearSavings = savings;
      baselineYear++;
    }

    return annualAnalysisSummaries;
  }

}
