import { Injectable } from '@angular/core';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';
import { AnnualAnalysisSummary, AnnualGroupSummary, MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry } from 'src/app/models/idb';
import { AnalysisCalculationsHelperService } from './analysis-calculations-helper.service';
import { AnalysisCalculationsService } from './analysis-calculations.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class FacilityAnalysisCalculationsService {

  constructor(private analysisCalculationsService: AnalysisCalculationsService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService,
    private predictorDbService: PredictordbService) { }

  calculateMonthlyFacilityAnalysis(facility: IdbFacility, analysisItem: IdbAnalysisItem): Array<MonthlyFacilityAnalysisData> {
    let monthlyFacilityAnalysisData: Array<MonthlyFacilityAnalysisData> = new Array();

    let groupSummaries: Array<FacilityGroupSummary> = this.getGroupSummaries(analysisItem, facility);

    groupSummaries = this.setGroupSummariesPercentBaseline(groupSummaries);

    // let facilityPredictorData: Array<IdbPredictorEntry> = this.predictorDbService.facilityPredictorEntries.getValue();
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let endDate: Date = monthlyStartAndEndDate.endDate;

    // let summaryIndex: number = 0;
    let previousMonthImprovement: number = 0;
    while (baselineDate < endDate) {
      //predictor data for month
      // let monthPredictorData: Array<IdbPredictorEntry> = facilityPredictorData.filter(predictorData => {
      //   let predictorDate: Date = new Date(predictorData.date);
      //   return predictorDate.getUTCFullYear() == baselineDate.getUTCFullYear() && predictorDate.getUTCMonth() == baselineDate.getUTCMonth();
      // });
      let predictorUsage: Array<{
        predictorId: string,
        usage: number
      }> = new Array();

      let utilityUsage: Array<{
        meterGroupId: number,
        usage: number,
        modeledUsage: number,
        percentUsage: number
      }> = new Array();


      let yearToDateSavings: Array<{
        meterGroupId: number,
        savings: number
      }> = new Array();

      let rollingSavings: Array<{
        meterGroupId: number,
        savings: number
      }> = new Array();
      let yearToDateImprovment: number = 0;
      let rolling12MonthImprovement: number = 0;
      groupSummaries.forEach(summary => {
        let monthlyAnalysisSummaryData: MonthlyAnalysisSummaryData = summary.monthlyGroupSummary.monthlyAnalysisSummaryData.find(data => {
          let dataDate: Date = new Date(data.date)
          return dataDate.getUTCFullYear() == baselineDate.getUTCFullYear() && dataDate.getUTCMonth() == baselineDate.getUTCMonth();
        });

        utilityUsage.push({
          meterGroupId: summary.group.idbGroupId,
          usage: monthlyAnalysisSummaryData.totalEnergy,
          modeledUsage: monthlyAnalysisSummaryData.modeledEnergy,
          percentUsage: summary.percentBaseline * 100
        });

        yearToDateSavings.push({
          meterGroupId: summary.group.idbGroupId,
          savings: monthlyAnalysisSummaryData.yearToDateImprovementOverBaseline
        });

        yearToDateImprovment += (summary.percentBaseline * monthlyAnalysisSummaryData.yearToDateImprovementOverBaseline);

        rollingSavings.push({
          meterGroupId: summary.group.idbGroupId,
          savings: monthlyAnalysisSummaryData.rolling12MonthImprovement
        });

        rolling12MonthImprovement += (summary.percentBaseline * monthlyAnalysisSummaryData.rolling12MonthImprovement);
      })


      let monthlyIncrementalImprovement: number = yearToDateImprovment - previousMonthImprovement;

      monthlyFacilityAnalysisData.push({
        date: new Date(baselineDate),
        fiscalYear: this.analysisCalculationsHelperService.getFiscalYear(new Date(baselineDate), facility),
        utilityUsage: utilityUsage,
        predictorUsage: predictorUsage,
        yearToDateSavings: yearToDateSavings,
        rollingSavings: rollingSavings,
        yearToDateImprovment: yearToDateImprovment,
        monthlyIncrementalImprovement: monthlyIncrementalImprovement,
        rolling12MonthImprovement: rolling12MonthImprovement
      });

      let currentMonth: number = baselineDate.getUTCMonth()
      let nextMonth: number = currentMonth + 1;
      baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
      previousMonthImprovement = yearToDateImprovment;
    }
    return monthlyFacilityAnalysisData;
  }


  setGroupSummariesPercentBaseline(groupSummaries: Array<FacilityGroupSummary>): Array<FacilityGroupSummary> {
    let totalEnergyUse: number = _.sumBy(groupSummaries, (summary: FacilityGroupSummary) => {
      return summary.baselineAnalysisSummary.energyUse
    });
    groupSummaries.forEach(summary => {
      summary.percentBaseline = (summary.baselineAnalysisSummary.energyUse / totalEnergyUse);
    });
    return groupSummaries;
  }

  getGroupSummaries(analysisItem: IdbAnalysisItem, facility: IdbFacility): Array<FacilityGroupSummary> {
    let groupSummaries: Array<FacilityGroupSummary> = new Array();
    analysisItem.groups.forEach(group => {
      let monthlyGroupSummary: MonthlyAnalysisSummary = this.analysisCalculationsService.getMonthlyAnalysisSummary(group, analysisItem, facility);
      let annualAnalysisSummary: Array<AnnualAnalysisSummary> = this.analysisCalculationsService.getAnnualAnalysisSummary(analysisItem, facility, group, monthlyGroupSummary.monthlyAnalysisSummaryData);
      groupSummaries.push({
        group: group,
        monthlyGroupSummary: monthlyGroupSummary,
        baselineAnalysisSummary: annualAnalysisSummary[0],
        percentBaseline: 0,
        annualAnalysisSummaries: annualAnalysisSummary
      })
    });

    groupSummaries = this.setGroupSummariesPercentBaseline(groupSummaries);
    return groupSummaries;
  }



  calculateAnnualFacilitySummaryData(facility: IdbFacility, analysisItem: IdbAnalysisItem): { annualAnalysisSummary: Array<AnnualAnalysisSummary>, groupSummaries: Array<FacilityGroupSummary> } {
    let annualFacilitySummaryData: Array<AnnualAnalysisSummary> = new Array();
    let groupSummaries: Array<FacilityGroupSummary> = this.getGroupSummaries(analysisItem, facility);

    // let monthlyFacilityAnalysisData: Array<MonthlyFacilityAnalysisData> = this.calculateMonthlyFacilityAnalysis(facility, analysisItem);
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let endDate: Date = monthlyStartAndEndDate.endDate;
    let baselineYear: number = this.analysisCalculationsHelperService.getFiscalYear(baselineDate, facility);
    let reportYear: number = analysisItem.reportYear;
    if (facility.fiscalYear == 'nonCalendarYear' && facility.fiscalYearCalendarEnd) {
      baselineYear = baselineYear - 1;
      reportYear = reportYear - 1;
    }

    let previousYearEnergyUse: number = 0;
    let baselineYearEnergyUse: number = 0;
    let baselineYearModeledEnergyUse: number = 0;
    let previousYearModeledEnergyUse: number = 0;
    for (let summaryYear: number = baselineYear; summaryYear <= reportYear; summaryYear++) {
      // let filteredFacilityAnalysisData: Array<MonthlyFacilityAnalysisData> = monthlyFacilityAnalysisData.filter(data => {
      //   return data.fiscalYear == summaryYear;
      // });

      let cumulativeEnergyImprovement: number = 0;
      let annualEnergyImprovement: number = 0;
      let totalEnergy: number = 0;
      let modeledEnergy: number = 0;

      groupSummaries.forEach(summary => {
        let annualAnalysisSummary: AnnualAnalysisSummary = summary.annualAnalysisSummaries.find(summary => { return summary.year == summaryYear });
        annualAnalysisSummary.cumulativeSavings = (annualAnalysisSummary.cumulativeSavings * summary.percentBaseline);
        cumulativeEnergyImprovement += annualAnalysisSummary.cumulativeSavings;
        annualAnalysisSummary.annualSavings = annualAnalysisSummary.annualSavings * summary.percentBaseline;
        annualEnergyImprovement += annualAnalysisSummary.annualSavings;
        totalEnergy += annualAnalysisSummary.energyUse;
        modeledEnergy += annualAnalysisSummary.modeledEnergyUse;
      });
      if (summaryYear == baselineYear) {
        baselineYearEnergyUse = totalEnergy;
        previousYearEnergyUse = totalEnergy;
        previousYearModeledEnergyUse = modeledEnergy;
        baselineYearModeledEnergyUse = modeledEnergy;
      }

      let annualSavings: number = previousYearEnergyUse - totalEnergy;
      let totalSavings: number = baselineYearEnergyUse - totalEnergy;
      let annualModeledEnergySavings: number = previousYearModeledEnergyUse - modeledEnergy;
      let totalModeledEnergySavings: number = baselineYearModeledEnergyUse - modeledEnergy;
      annualFacilitySummaryData.push({
        year: summaryYear,
        energyUse: totalEnergy,
        annualEnergySavings: annualSavings,
        totalEnergySavings: totalSavings,
        modeledEnergyUse: modeledEnergy,
        annualModeledEnergySavings: annualModeledEnergySavings,
        totalModeledEnergySavings: totalModeledEnergySavings,
        SEnPI: undefined,
        cumulativeSavings: cumulativeEnergyImprovement,
        annualSavings: annualEnergyImprovement,

        totalProduction: undefined,
        annualProductionChange: undefined,
        totalProductionChange: undefined,
        energyIntensity: undefined,
        totalEnergyIntensityChange: undefined,
        annualEnergyIntensityChange: undefined,
      });
      previousYearEnergyUse = totalEnergy;
      previousYearModeledEnergyUse = modeledEnergy;
    }

    return {
      groupSummaries: groupSummaries,
      annualAnalysisSummary: annualFacilitySummaryData
    }
  }
}

export interface FacilityGroupSummary {
  group: AnalysisGroup,
  monthlyGroupSummary: MonthlyAnalysisSummary,
  baselineAnalysisSummary: AnnualAnalysisSummary,
  percentBaseline: number,
  annualAnalysisSummaries: Array<AnnualAnalysisSummary>
}


export interface MonthlyFacilityAnalysisData {
  date: Date,
  fiscalYear: number,
  utilityUsage: Array<{
    meterGroupId: number,
    usage: number,
    modeledUsage: number,
    percentUsage: number
  }>,
  predictorUsage: Array<{
    predictorId: string,
    usage: number
  }>,
  yearToDateSavings: Array<{
    meterGroupId: number,
    savings: number
  }>,
  rollingSavings: Array<{
    meterGroupId: number,
    savings: number
  }>,
  yearToDateImprovment: number,
  monthlyIncrementalImprovement: number,
  rolling12MonthImprovement: number
}


export interface AnnualFacilitySummaryData {
  year: number,
  cumulativeEnergyImprovement: number,
  annualEnergyImprovement: number,
  totalEnergy: number,
  annualSavings: number,
  totalSavings: number
}