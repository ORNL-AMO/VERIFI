import { Injectable } from '@angular/core';
import { AnnualAnalysisSummary, FacilityGroupSummary, MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { IdbAnalysisItem, IdbFacility, IdbPredictorEntry, PredictorData } from 'src/app/models/idb';
import { AnalysisCalculationsHelperService } from './analysis-calculations-helper.service';
import { AnalysisCalculationsService } from './analysis-calculations.service';
import * as _ from 'lodash';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { CalanderizedMeter } from 'src/app/models/calanderization';

@Injectable({
  providedIn: 'root'
})
export class FacilityAnalysisCalculationsService {

  constructor(private analysisCalculationsService: AnalysisCalculationsService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService,
    private predictorDbService: PredictordbService) { }



  calculateMonthlyFacilityAnalysis(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>): Array<MonthlyAnalysisSummaryData> {
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let endDate: Date = monthlyStartAndEndDate.endDate;

    let analysisSummaryData: Array<MonthlyAnalysisSummaryData> = new Array();

    let accountPredictorEntries: Array<IdbPredictorEntry> = this.predictorDbService.accountPredictorEntries.getValue();
    let facilityPredictorData: Array<IdbPredictorEntry> = accountPredictorEntries.filter(entry => {
      return entry.facilityId == facility.guid;
    });
    let predictorVariables: Array<PredictorData> = new Array();
    if (facilityPredictorData.length > 0) {
      predictorVariables = facilityPredictorData[0].predictors
    }

    let groupSummaries: Array<MonthlyAnalysisSummary> = new Array();
    analysisItem.groups.forEach(group => {
      let summaryData: MonthlyAnalysisSummary = this.analysisCalculationsService.getMonthlyAnalysisSummary(group, analysisItem, facility, calanderizedMeters);
      groupSummaries.push(summaryData);
    });

    let baselineYear: number = this.analysisCalculationsHelperService.getFiscalYear(baselineDate, facility);

    let monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData> = groupSummaries.flatMap(summary => { return summary.monthlyAnalysisSummaryData });

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

      let currentMonthData: Array<MonthlyAnalysisSummaryData> = monthlyAnalysisSummaryData.filter(summaryData => {
        let summaryDataDate: Date = new Date(summaryData.date);
        return summaryDataDate.getUTCMonth() == baselineDate.getUTCMonth() && summaryDataDate.getUTCFullYear() == baselineDate.getUTCFullYear();
      });
      //predictor data for month
      let monthPredictorData: Array<IdbPredictorEntry> = facilityPredictorData.filter(predictorData => {
        let predictorDate: Date = new Date(predictorData.date);
        return predictorDate.getUTCFullYear() == baselineDate.getUTCFullYear() && predictorDate.getUTCMonth() == baselineDate.getUTCMonth();
      });

      let predictorUsage: Array<{
        usage: number,
        predictorId: string
      }> = new Array();
      predictorVariables.forEach(variable => {
        let usageVal: number = 0;
        monthPredictorData.forEach(data => {
          let predictorData: PredictorData = data.predictors.find(predictor => { return predictor.id == variable.id });
          usageVal = usageVal + predictorData.amount;
        });
        predictorUsage.push({
          usage: usageVal,
          predictorId: variable.id
        });
      });



      let energyUse: number = _.sumBy(currentMonthData, 'energyUse');
      yearToDateActualEnergyUse = yearToDateActualEnergyUse + energyUse;
      //track year to date energy use
      if (fiscalYear == baselineYear) {
        baselineActualEnergyUseData.push(energyUse);
      }
      let modeledEnergy: number = _.sumBy(currentMonthData, 'modeledEnergy');
      let baselineActualEnergyUse: number = baselineActualEnergyUseData[monthIndex];
      yearToDateBaselineActualEnergyUse = yearToDateBaselineActualEnergyUse + baselineActualEnergyUse;

      yearToDateModeledEnergyUse = yearToDateModeledEnergyUse + modeledEnergy;

      if (fiscalYear == baselineYear) {
        baselineModeledEnergyUseData.push(modeledEnergy);
      }

      if (previousFiscalYear != fiscalYear) {
        previousFiscalYear = fiscalYear;
      }

      let baselineModeledEnergyUse: number = baselineModeledEnergyUseData[monthIndex];
      let adjustedForNormalization: number = modeledEnergy + baselineActualEnergyUse - baselineModeledEnergyUse;
      let baselineAdjustmentForOther: number = _.sumBy(currentMonthData, 'baselineAdjustmentForOther')
      let baselineAdjustment: number = 0;
      let baselineAdjustmentForNormalization: number = 0;
      if (fiscalYear != facility.sustainabilityQuestions.energyReductionBaselineYear) {
        baselineAdjustmentForNormalization = adjustedForNormalization - baselineActualEnergyUse;
        baselineAdjustment = baselineAdjustmentForNormalization + baselineAdjustmentForOther;
      }
      let adjusted: number = adjustedForNormalization + baselineAdjustmentForOther;
      yearToDateBaselineModeledEnergyUse = yearToDateBaselineModeledEnergyUse + baselineModeledEnergyUse;
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
      }


      analysisSummaryData.push({
        date: new Date(baselineDate),
        // groupsSummaryData: currentMonthData,
        energyUse: energyUse,
        modeledEnergy: modeledEnergy,
        predictorUsage: predictorUsage,
        fiscalYear: fiscalYear,
        group: undefined,
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
      })

      summaryDataIndex++;
      let currentMonth: number = baselineDate.getUTCMonth()
      let nextMonth: number = currentMonth + 1;
      baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
    }
    return analysisSummaryData;
  }

  getAnnualAnalysisSummary(analysisItem: IdbAnalysisItem, facility: IdbFacility, calanderizedMeters: Array<CalanderizedMeter>): Array<AnnualAnalysisSummary> {
    let facilityMonthlySummaryData: Array<MonthlyAnalysisSummaryData> = this.calculateMonthlyFacilityAnalysis(analysisItem, facility, calanderizedMeters);
    let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = this.analysisCalculationsService.calculateAnnualAnalysisSummary(facilityMonthlySummaryData, analysisItem, facility);
    return annualAnalysisSummaries;
  }
}
