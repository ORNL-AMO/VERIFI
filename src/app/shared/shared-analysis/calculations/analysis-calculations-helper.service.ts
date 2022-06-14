import { Injectable } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAccount, IdbAccountAnalysisItem, IdbAnalysisItem, IdbFacility, IdbPredictorEntry, IdbUtilityMeterData, PredictorData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { MonthlyData } from 'src/app/models/calanderization';


@Injectable({
  providedIn: 'root'
})
export class AnalysisCalculationsHelperService {

  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService) { }

  getMonthlyStartAndEndDate(facilityOrAccount: IdbFacility | IdbAccount, analysisItem: IdbAnalysisItem | IdbAccountAnalysisItem): { baselineDate: Date, endDate: Date } {
    let baselineDate: Date;
    let endDate: Date;
    if (facilityOrAccount.fiscalYear == 'calendarYear') {
      baselineDate = new Date(facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear, 0, 1);
      endDate = new Date(analysisItem.reportYear + 1, 0, 1);
    } else {
      if (facilityOrAccount.fiscalYearCalendarEnd) {
        baselineDate = new Date(facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear - 1, facilityOrAccount.fiscalYearMonth);
        endDate = new Date(analysisItem.reportYear, facilityOrAccount.fiscalYearMonth);
      } else {
        baselineDate = new Date(facilityOrAccount.sustainabilityQuestions.energyReductionBaselineYear, facilityOrAccount.fiscalYearMonth);
        endDate = new Date(analysisItem.reportYear + 1, facilityOrAccount.fiscalYearMonth);
      }
    }
    return {
      baselineDate: baselineDate,
      endDate: endDate
    }
  }

  getFiscalYear(date: Date, facilityOrAccount: IdbFacility | IdbAccount): number {
    if (facilityOrAccount.fiscalYear == 'calendarYear') {
      return date.getUTCFullYear();
    } else {
      if (facilityOrAccount.fiscalYearCalendarEnd) {
        if (date.getUTCMonth() >= facilityOrAccount.fiscalYearMonth) {
          return date.getUTCFullYear() + 1;
        } else {
          return date.getUTCFullYear();
        }
      } else {
        if (date.getUTCMonth() >= facilityOrAccount.fiscalYearMonth) {
          return date.getUTCFullYear();
        } else {
          return date.getUTCFullYear() - 1;
        }
      }
    }
  }

  getYearOptions(inAccount?: boolean): Array<number> {
    let meterData: Array<IdbUtilityMeterData>
    if (!inAccount) {
      meterData = this.utilityMeterDataDbService.facilityMeterData.getValue();
    } else {
      meterData = this.utilityMeterDataDbService.accountMeterData.getValue();
    }
    if (meterData.length != 0) {
      let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
      let firstBill: IdbUtilityMeterData = orderedMeterData[0];
      let lastBill: IdbUtilityMeterData = orderedMeterData[orderedMeterData.length - 1];
      let yearStart: number = new Date(firstBill.readDate).getUTCFullYear();
      let yearEnd: number = new Date(lastBill.readDate).getUTCFullYear();
      let yearOptions: Array<number> = new Array();
      for (let i = yearStart; i <= yearEnd; i++) {
        yearOptions.push(i);
      }
      return yearOptions;
    } else {
      return
    }
  }

  filterYearPredictorData(predictorData: Array<IdbPredictorEntry>, year: number, facilityOrAccount: IdbFacility | IdbAccount): Array<IdbPredictorEntry> {
    if (facilityOrAccount.fiscalYear == 'calendarYear') {
      return predictorData.filter(predictorData => {
        return new Date(predictorData.date).getUTCFullYear() == year;
      });
    } else {
      let startDate: Date = new Date(year, facilityOrAccount.fiscalYearMonth, 1)
      let endDate: Date = new Date(year + 1, facilityOrAccount.fiscalYearMonth, 1)
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

  checkValue(val: number): number{
    if(Math.abs(val) < .0000001){
      return 0
    }else{
      return val;
    }
  }
}
