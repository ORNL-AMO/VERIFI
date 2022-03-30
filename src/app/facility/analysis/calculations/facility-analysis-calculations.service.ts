import { Injectable } from '@angular/core';
import { AnnualAnalysisSummary, FacilityGroupSummary, FacilityMonthlyAnalysisSummaryData, MonthlyAnalysisSummary, MonthlyAnalysisSummaryData, MonthlyFacilityAnalysisData } from 'src/app/models/analysis';
import { IdbAnalysisItem, IdbFacility } from 'src/app/models/idb';
import { AnalysisCalculationsHelperService } from './analysis-calculations-helper.service';
import { AnalysisCalculationsService } from './analysis-calculations.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class FacilityAnalysisCalculationsService {

  constructor(private analysisCalculationsService: AnalysisCalculationsService, private analysisCalculationsHelperService: AnalysisCalculationsHelperService) { }

  // calculateMonthlyFacilityAnalysis(facility: IdbFacility, analysisItem: IdbAnalysisItem): Array<MonthlyFacilityAnalysisData> {
  //   let monthlyFacilityAnalysisData: Array<MonthlyFacilityAnalysisData> = new Array();

  //   let groupSummaries: Array<FacilityGroupSummary> = this.getGroupSummaries(analysisItem, facility);
  //   groupSummaries = this.setGroupSummariesPercentBaseline(groupSummaries);

  //   let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
  //   let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
  //   let endDate: Date = monthlyStartAndEndDate.endDate;
  //   let previousMonthImprovement: number = 0;
  //   while (baselineDate < endDate) {
  //     let predictorUsage: Array<{
  //       predictorId: string,
  //       usage: number
  //     }> = new Array();

  //     // let utilityUsage: Array<{
  //     //   meterGroupId: number,
  //     //   usage: number,
  //     //   modeledUsage: number,
  //     //   percentUsage: number
  //     // }> = new Array();


  //     // let yearToDateSavings: Array<{
  //     //   meterGroupId: number,
  //     //   savings: number
  //     // }> = new Array();

  //     // let rollingSavings: Array<{
  //     //   meterGroupId: number,
  //     //   savings: number
  //     // }> = new Array();
  //     // let yearToDateImprovment: number = 0;
  //     // let rolling12MonthImprovement: number = 0;
  //     // groupSummaries.forEach(summary => {
  //     //   let monthlyAnalysisSummaryData: MonthlyAnalysisSummaryData = summary.monthlyGroupSummary.monthlyAnalysisSummaryData.find(data => {
  //     //     let dataDate: Date = new Date(data.date)
  //     //     return dataDate.getUTCFullYear() == baselineDate.getUTCFullYear() && dataDate.getUTCMonth() == baselineDate.getUTCMonth();
  //     //   });

  //     //   utilityUsage.push({
  //     //     meterGroupId: summary.group.idbGroupId,
  //     //     usage: monthlyAnalysisSummaryData.totalEnergy,
  //     //     modeledUsage: monthlyAnalysisSummaryData.modeledEnergy,
  //     //     percentUsage: summary.percentBaseline * 100
  //     //   });

  //     //   yearToDateSavings.push({
  //     //     meterGroupId: summary.group.idbGroupId,
  //     //     savings: monthlyAnalysisSummaryData.yearToDateImprovementOverBaseline
  //     //   });

  //     //   yearToDateImprovment += (summary.percentBaseline * monthlyAnalysisSummaryData.yearToDateImprovementOverBaseline);

  //     //   rollingSavings.push({
  //     //     meterGroupId: summary.group.idbGroupId,
  //     //     savings: monthlyAnalysisSummaryData.rolling12MonthImprovement
  //     //   });

  //     //   rolling12MonthImprovement += (summary.percentBaseline * monthlyAnalysisSummaryData.rolling12MonthImprovement);
  //     // })


  //     // let monthlyIncrementalImprovement: number = yearToDateImprovment - previousMonthImprovement;

  //     // monthlyFacilityAnalysisData.push({
  //     //   date: new Date(baselineDate),
  //     //   fiscalYear: this.analysisCalculationsHelperService.getFiscalYear(new Date(baselineDate), facility),
  //     //   utilityUsage: utilityUsage,
  //     //   predictorUsage: predictorUsage,
  //     //   yearToDateSavings: yearToDateSavings,
  //     //   rollingSavings: rollingSavings,
  //     //   yearToDateImprovment: yearToDateImprovment,
  //     //   monthlyIncrementalImprovement: monthlyIncrementalImprovement,
  //     //   rolling12MonthImprovement: rolling12MonthImprovement
  //     // });

  //     // let currentMonth: number = baselineDate.getUTCMonth()
  //     // let nextMonth: number = currentMonth + 1;
  //     // baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
  //     // previousMonthImprovement = yearToDateImprovment;
  //   }
  //   return monthlyFacilityAnalysisData;
  // }


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
      // let monthlyGroupSummary: MonthlyAnalysisSummary = this.analysisCalculationsService.getMonthlyAnalysisSummary(group, analysisItem, facility);
      // let annualAnalysisSummary: Array<AnnualAnalysisSummary> = this.analysisCalculationsService.getAnnualAnalysisSummary(analysisItem, facility, group, monthlyGroupSummary.monthlyAnalysisSummaryData);
      // groupSummaries.push({
      //   group: group,
      //   monthlyGroupSummary: monthlyGroupSummary,
      //   baselineAnalysisSummary: annualAnalysisSummary[0],
      //   percentBaseline: 0,
      //   annualAnalysisSummaries: annualAnalysisSummary
      // })
    });

    groupSummaries = this.setGroupSummariesPercentBaseline(groupSummaries);
    return groupSummaries;
  }



  calculateAnnualFacilitySummaryData(facility: IdbFacility, analysisItem: IdbAnalysisItem): { annualAnalysisSummary: Array<AnnualAnalysisSummary>, groupSummaries: Array<FacilityGroupSummary> } {
    let annualFacilitySummaryData: Array<AnnualAnalysisSummary> = new Array();
    let groupSummaries: Array<FacilityGroupSummary> = this.getGroupSummaries(analysisItem, facility);

    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
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
      // let cumulativeEnergyImprovement: number = 0;
      // let annualEnergyImprovement: number = 0;
      // let totalEnergy: number = 0;
      // let modeledEnergy: number = 0;

      // groupSummaries.forEach(summary => {
      //   let annualAnalysisSummary: AnnualAnalysisSummary = summary.annualAnalysisSummaries.find(summary => { return summary.year == summaryYear });
      //   annualAnalysisSummary.cumulativeSavings = (annualAnalysisSummary.cumulativeSavings * summary.percentBaseline);
      //   cumulativeEnergyImprovement += annualAnalysisSummary.cumulativeSavings;
      //   annualAnalysisSummary.annualSavings = annualAnalysisSummary.annualSavings * summary.percentBaseline;
      //   annualEnergyImprovement += annualAnalysisSummary.annualSavings;
      //   totalEnergy += annualAnalysisSummary.energyUse;
      //   modeledEnergy += annualAnalysisSummary.modeledEnergyUse;
      // });
      // if (summaryYear == baselineYear) {
      //   baselineYearEnergyUse = totalEnergy;
      //   previousYearEnergyUse = totalEnergy;
      //   previousYearModeledEnergyUse = modeledEnergy;
      //   baselineYearModeledEnergyUse = modeledEnergy;
      // }

      // let annualSavings: number = previousYearEnergyUse - totalEnergy;
      // let totalSavings: number = baselineYearEnergyUse - totalEnergy;
      // let annualModeledEnergySavings: number = previousYearModeledEnergyUse - modeledEnergy;
      // let totalModeledEnergySavings: number = baselineYearModeledEnergyUse - modeledEnergy;
      // annualFacilitySummaryData.push({
      //   year: summaryYear,
      //   energyUse: totalEnergy,
      //   annualEnergySavings: annualSavings,
      //   totalEnergySavings: totalSavings,
      //   modeledEnergyUse: modeledEnergy,
      //   annualModeledEnergySavings: annualModeledEnergySavings,
      //   totalModeledEnergySavings: totalModeledEnergySavings,
      //   SEnPI: undefined,
      //   cumulativeSavings: cumulativeEnergyImprovement,
      //   annualSavings: annualEnergyImprovement,

      //   totalProduction: undefined,
      //   annualProductionChange: undefined,
      //   totalProductionChange: undefined,
      //   energyIntensity: undefined,
      //   totalEnergyIntensityChange: undefined,
      //   annualEnergyIntensityChange: undefined,
      // });
      // previousYearEnergyUse = totalEnergy;
      // previousYearModeledEnergyUse = modeledEnergy;
    }

    return {
      groupSummaries: groupSummaries,
      annualAnalysisSummary: annualFacilitySummaryData
    }
  }

  calculateMonthlyFacilityAnalysis(analysisItem: IdbAnalysisItem, facility: IdbFacility): Array<FacilityMonthlyAnalysisSummaryData> {
    let monthlyStartAndEndDate: { baselineDate: Date, endDate: Date } = this.analysisCalculationsHelperService.getMonthlyStartAndEndDate(facility, analysisItem);
    let baselineDate: Date = monthlyStartAndEndDate.baselineDate;
    let endDate: Date = monthlyStartAndEndDate.endDate;

    let analysisSummaryData: Array<FacilityMonthlyAnalysisSummaryData> = new Array();


    let groupSummaries: Array<MonthlyAnalysisSummary> = new Array();
    analysisItem.groups.forEach(group => {
      let summaryData: MonthlyAnalysisSummary = this.analysisCalculationsService.getMonthlyAnalysisSummary(group, analysisItem, facility);
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
      yearToDateBaselineModeledEnergyUse = yearToDateBaselineModeledEnergyUse + baselineModeledEnergyUse;
      let adjustedBaselineEnergyUse: number = modeledEnergy + baselineActualEnergyUse - baselineModeledEnergyUse;
      yearToDateAdjustedEnergyUse = yearToDateAdjustedEnergyUse + adjustedBaselineEnergyUse;
      let SEnPI: number = energyUse / adjustedBaselineEnergyUse;
      let savings: number = (baselineActualEnergyUse - baselineModeledEnergyUse) - (energyUse - modeledEnergy);
      let percentSavingsComparedToBaseline: number = savings / adjustedBaselineEnergyUse;
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
        let total12MonthsAdjusedBaseline: number = _.sumBy(last11MonthsData, 'adjustedBaselineEnergyUse') + adjustedBaselineEnergyUse;
        rolling12MonthImprovement = rollingSavings / total12MonthsAdjusedBaseline;
      }


      analysisSummaryData.push({
        date: new Date(baselineDate),
        groupsSummaryData: currentMonthData,
        energyUse: energyUse,
        modeledEnergy: modeledEnergy,
        predictorUsage: [],
        fiscalYear: fiscalYear,
        group: undefined,
        adjustedBaselineEnergyUse: adjustedBaselineEnergyUse,
        SEnPI: SEnPI,
        savings: savings,
        percentSavingsComparedToBaseline: percentSavingsComparedToBaseline * 100,
        yearToDateSavings: yearToDateSavings,
        yearToDatePercentSavings: yearToDatePercentSavings * 100,
        rollingSavings: rollingSavings,
        rolling12MonthImprovement: rolling12MonthImprovement * 100,
      })

      summaryDataIndex++;
      let currentMonth: number = baselineDate.getUTCMonth()
      let nextMonth: number = currentMonth + 1;
      baselineDate = new Date(baselineDate.getUTCFullYear(), nextMonth, 1);
    }
    return analysisSummaryData;
  }

  getAnnualAnalysisSummary(analysisItem: IdbAnalysisItem, facility: IdbFacility): Array<AnnualAnalysisSummary> {
    let facilityMonthlySummaryData: Array<FacilityMonthlyAnalysisSummaryData> = this.calculateMonthlyFacilityAnalysis(analysisItem, facility);
    let annualAnalysisSummaries: Array<AnnualAnalysisSummary> = this.analysisCalculationsService.calculateAnnualAnalysisSummary(facilityMonthlySummaryData, analysisItem, facility);
    return annualAnalysisSummaries;
  }
}
