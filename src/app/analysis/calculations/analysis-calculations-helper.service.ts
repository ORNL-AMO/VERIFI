import { Injectable } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { AnalysisGroup, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeter, IdbUtilityMeterData, PredictorData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { CalanderizationOptions, CalanderizedMeter, MonthlyData } from 'src/app/models/calanderization';
import { AnnualAnalysisSummary, MonthlyAnalysisSummary, MonthlyAnalysisSummaryData } from 'src/app/models/analysis';
import { CalanderizationService } from 'src/app/shared/helper-services/calanderization.service';
import { ConvertMeterDataService } from 'src/app/shared/helper-services/convert-meter-data.service';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { PredictordbService } from 'src/app/indexedDB/predictors-db.service';

@Injectable({
  providedIn: 'root'
})
export class AnalysisCalculationsHelperService {

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private calendarizationService: CalanderizationService,
    private convertMeterDataService: ConvertMeterDataService, private utilityMeterDbService: UtilityMeterdbService,
    private predictorDbService: PredictordbService) { }

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
