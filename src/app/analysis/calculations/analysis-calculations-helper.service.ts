import { Injectable } from '@angular/core';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { IdbAnalysisItem, IdbFacility, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';

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
}
