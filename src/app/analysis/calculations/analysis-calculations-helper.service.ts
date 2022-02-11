import { Injectable } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { MonthlyData } from 'src/app/models/calanderization';
import { AnnualAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';

@Injectable({
  providedIn: 'root'
})
export class AnalysisCalculationsHelperService {

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService) { }

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

  getFiscalYear(date: Date, facility: IdbFacility): number {
    if (facility.fiscalYear == 'calendarYear') {
      return date.getUTCFullYear();
    } else {
      if (facility.fiscalYearCalendarEnd) {
        if (date.getUTCMonth() >= facility.fiscalYearMonth) {
          return date.getUTCFullYear() + 1;
        } else {
          return date.getUTCFullYear();
        }
      } else {
        if (date.getUTCMonth() >= facility.fiscalYearMonth) {
          return date.getUTCFullYear();
        } else {
          return date.getUTCFullYear() - 1;
        }
      }
    }
  }

  getYearOptions(): Array<number> {
    let accountMeterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.facilityMeterData.getValue();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(accountMeterData, (data) => { return new Date(data.readDate) });
    let firstBill: IdbUtilityMeterData = orderedMeterData[0];
    let lastBill: IdbUtilityMeterData = orderedMeterData[orderedMeterData.length - 1];
    let yearStart: number = new Date(firstBill.readDate).getUTCFullYear();
    let yearEnd: number = new Date(lastBill.readDate).getUTCFullYear();
    let yearOptions: Array<number> = new Array();
    for (let i = yearStart; i <= yearEnd; i++) {
      yearOptions.push(i);
    }
    return yearOptions;
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


  getAnnualAnalysisSummary(modelYear: number, analysisItem: IdbAnalysisItem, facility: IdbFacility, monthlyAnalysisSummaryData: Array<MonthlyAnalysisSummaryData>): Array<AnnualAnalysisSummary>{
    let annualRegressionSummary: Array<AnnualAnalysisSummary> = new Array();
    let baselineYear: number = facility.sustainabilityQuestions.energyReductionBaselineYear;
    let reportYear: number = analysisItem.reportYear;
    if (facility.fiscalYear == 'nonCalendarYear' && facility.fiscalYearCalendarEnd) {
      baselineYear = baselineYear - 1;
      reportYear = reportYear - 1;
    }
    let previousYearSavings: number = 0;
    let previousYearEnergyUse: number = 0;
    let previousYearModeledEnergyUse: number = 0;
    let totalEnergySavings: number = 0;
    let totalModeledEnergySavings: number = 0;
    let baselineEnergyUse: number;
    let baselineModeledEnergy: number;
    let baselineSEnPI: number;
    for (let summaryYear: number = baselineYear; summaryYear <= reportYear; summaryYear++) {
      let summaryYearData: Array<MonthlyAnalysisSummaryData> = monthlyAnalysisSummaryData.filter(data => { return data.fiscalYear == summaryYear });
      let energyUse: number = _.sumBy(summaryYearData, 'totalEnergy');
      let modeledEnergyUse: number = _.sumBy(summaryYearData, 'modeledEnergy');
      let SEnPI: number;
      let cumulativeSavings: number = 0;
      let annualSavings: number = 0;

      if (summaryYear == baselineYear) {
        baselineEnergyUse = energyUse;
        baselineModeledEnergy = modeledEnergyUse;
      }

      if (summaryYear > modelYear) {
        SEnPI = (energyUse * baselineModeledEnergy) / (modeledEnergyUse * baselineEnergyUse);
      } else {
        SEnPI = modeledEnergyUse / energyUse;
      }
      if (summaryYear == baselineYear) {
        baselineSEnPI = SEnPI;
        previousYearEnergyUse = energyUse;
        previousYearModeledEnergyUse = modeledEnergyUse;
      } else if (summaryYear > modelYear) {
        cumulativeSavings = 1 - SEnPI;
        annualSavings = cumulativeSavings - previousYearSavings;
      } else {
        cumulativeSavings = (1 - baselineSEnPI) - (1 - SEnPI);
        annualSavings = cumulativeSavings - previousYearSavings;
      }

      let annualEnergySavings: number = previousYearEnergyUse - energyUse;
      let annualModeledEnergySavings: number = previousYearModeledEnergyUse - modeledEnergyUse;
      totalEnergySavings = totalEnergySavings + annualEnergySavings;
      totalModeledEnergySavings = totalModeledEnergySavings + annualModeledEnergySavings;
      annualRegressionSummary.push({
        year: summaryYear,
        energyUse: energyUse,
        annualEnergySavings: annualEnergySavings,
        totalEnergySavings: totalEnergySavings,
        annualModeledEnergySavings: annualModeledEnergySavings,
        totalModeledEnergySavings: totalModeledEnergySavings,
        modeledEnergyUse: modeledEnergyUse,
        SEnPI: SEnPI,
        cumulativeSavings: cumulativeSavings * 100,
        annualSavings: annualSavings * 100,
        energyIntensity: 0
      })
      previousYearSavings = cumulativeSavings;
      previousYearEnergyUse = energyUse;
      previousYearModeledEnergyUse = modeledEnergyUse;
    }
    return annualRegressionSummary;
  }
}
