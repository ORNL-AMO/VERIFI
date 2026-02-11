import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizationFilters } from 'src/app/models/calanderization';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { getIsEnergyMeter, getIsEnergyUnit } from '../sharedHelperFunctions';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { daysBetweenDates, getCurrentMonthsReadings, getNextMonthsBill, getPreviousMonthsBill } from 'src/app/calculations/calanderization/calanderizationHelpers';
import { getFiscalYear } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { IdbAccount } from 'src/app/models/idbModels/account';
import { IdbFacility } from 'src/app/models/idbModels/facility';
import { IdbUtilityMeterData } from 'src/app/models/idbModels/utilityMeterData';
import { IdbUtilityMeter } from 'src/app/models/idbModels/utilityMeter';
import { getDateFromMeterData, getEarliestMeterData, getLatestMeterData } from '../dateHelperFunctions';

@Injectable({
  providedIn: 'root'
})
export class CalanderizationService {


  calanderizedDataFilters: BehaviorSubject<CalanderizationFilters>;
  displayGraphEnergy: "bar" | "scatter" | null = "bar";
  displayGraphCost: "bar" | "scatter" | null = "bar";
  dataDisplay: "table" | "graph" = 'table';
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService,
    private facilityDbService: FacilitydbService,
    private accountDbService: AccountdbService,
    private utilityMeterDbService: UtilityMeterdbService) {
    this.calanderizedDataFilters = new BehaviorSubject({
      selectedSources: [],
      showAllSources: true,
      selectedDateMax: undefined,
      selectedDateMin: undefined,
      dataDateRange: undefined
    });
  }

  getCalendarizationSummary(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>): Array<CalendarizationSummaryItem> {
    if (meter.meterReadingDataApplication == 'fullMonth' || !meter.meterReadingDataApplication) {
      //used as default
      return this.calanderizationSummaryFullMonth(meter, meterData);
    } else if (meter.meterReadingDataApplication == 'backward') {
      return this.calanderizationSummaryBackwards(meter, meterData);
    }
  }

  calanderizationSummaryBackwards(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>): Array<CalendarizationSummaryItem> {
    let calanderizationSummary: Array<CalendarizationSummaryItem> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data: IdbUtilityMeterData) => { return getDateFromMeterData(data).getTime() });
    if (orderedMeterData.length > 3) {
      let startDate: Date = getDateFromMeterData(orderedMeterData[0]);
      startDate.setMonth(startDate.getMonth() + 1);

      let endDate: Date = new Date(startDate.getFullYear(), startDate.getMonth() + 2);
      while (startDate < endDate) {
        let month: number = startDate.getMonth();
        let year: number = startDate.getFullYear();
        let previousMonthReading: IdbUtilityMeterData = getPreviousMonthsBill(month, year, orderedMeterData);
        let currentMonthsReadings: Array<IdbUtilityMeterData> = getCurrentMonthsReadings(month, year, orderedMeterData);
        let nextMonthsReading: IdbUtilityMeterData = getNextMonthsBill(month, year, orderedMeterData);
        if (nextMonthsReading) {
          if (currentMonthsReadings.length == 1) {
            //1. current month has 1 bill
            let currentMonthReading: IdbUtilityMeterData = currentMonthsReadings[0];
            let calanderizationSummaryItem: CalendarizationSummaryItem = this.getCalanderizationSummaryItem(previousMonthReading, currentMonthReading, nextMonthsReading, year, month);
            calanderizationSummary.push(calanderizationSummaryItem);

          } else if (currentMonthsReadings.length > 1) {
            //2. current month has multiple bills
            let calanderizationSummaryItem: CalendarizationSummaryItem = {
              calanderizedMonth: new Date(year, month),
              monthReadingSummaries: [],
              totalEnergyUse: 0
            }
            for (let readingIndex = 0; readingIndex < currentMonthsReadings.length; readingIndex++) {
              let currentMonthReading: IdbUtilityMeterData;
              let nextReading: IdbUtilityMeterData;
              if (readingIndex == 0) {
                currentMonthReading = currentMonthsReadings[readingIndex];
                nextReading = currentMonthsReadings[readingIndex + 1];
              } else if (readingIndex == (currentMonthsReadings.length - 1)) {
                previousMonthReading = currentMonthsReadings[readingIndex - 1];
                currentMonthReading = currentMonthsReadings[readingIndex];
                nextReading = nextMonthsReading;
              } else {
                previousMonthReading = currentMonthsReadings[readingIndex - 1];
                currentMonthReading = currentMonthsReadings[readingIndex];
                nextReading = currentMonthsReadings[readingIndex + 1];
              }
              let tmpSummary: CalendarizationSummaryItem = this.getCalanderizationSummaryItem(previousMonthReading, currentMonthReading, nextReading, year, month);
              calanderizationSummaryItem.monthReadingSummaries = calanderizationSummaryItem.monthReadingSummaries.concat(tmpSummary.monthReadingSummaries);
            }
            calanderizationSummaryItem.monthReadingSummaries = _.uniqWith(calanderizationSummaryItem.monthReadingSummaries, _.isEqual)
            calanderizationSummaryItem.totalEnergyUse = _.sumBy(calanderizationSummaryItem.monthReadingSummaries, (summary) => { return summary.totalEnergyFromBill })
            calanderizationSummary.push(calanderizationSummaryItem);
          } else if (currentMonthsReadings.length == 0) {
            //3. current month has 0 bills
            //find number of days between next month and previous month
            let previousBillDate: Date = getDateFromMeterData(previousMonthReading);
            let nextBillDate: Date = getDateFromMeterData(nextMonthsReading);
            let daysBetween: number = daysBetweenDates(previousBillDate, nextBillDate);
            //find per day energy use
            let energyUsePerDay: number = nextMonthsReading.totalEnergyUse / daysBetween;
            //find number of days in current month
            let currentMonthDate1: Date = new Date(year, month);
            let currentMonthDate2: Date = new Date(year, month + 1);
            let daysInMonth: number = daysBetweenDates(currentMonthDate1, currentMonthDate2);
            //multiply per day by number of days in current month
            let energyUseForMonth: number = energyUsePerDay * daysInMonth;
            calanderizationSummary.push({
              calanderizedMonth: new Date(year, month),
              monthReadingSummaries: [{
                readDate: getDateFromMeterData(nextMonthsReading),
                daysInBill: daysBetween,
                energyUsePerDay: energyUsePerDay,
                daysApplied: daysInMonth,
                totalEnergyFromBill: energyUseForMonth
              }],
              totalEnergyUse: energyUseForMonth
            });
          }
        }
        startDate.setMonth(startDate.getMonth() + 1);
      }
    }
    return calanderizationSummary;
  }

  getCalanderizationSummaryItem(previousReading: IdbUtilityMeterData, currentReading: IdbUtilityMeterData, nextReading: IdbUtilityMeterData, year: number, month: number): CalendarizationSummaryItem {
    let currentDate: Date = getDateFromMeterData(currentReading);
    let previousReadingDate: Date = getDateFromMeterData(previousReading);
    //days from previous to current bill reading
    let daysFromPrevious: number = daysBetweenDates(previousReadingDate, currentDate);
    //find per day energy use
    let energyUsePerDayCurrent: number = currentReading.totalEnergyUse / daysFromPrevious;
    //apply number of days of current bill
    let daysFromCurrent: number = currentDate.getDate();
    if (currentDate.getMonth() == previousReadingDate.getMonth()) {
      daysFromCurrent = currentDate.getDate() - previousReadingDate.getDate();
    }
    let energyUseForCurrent: number = energyUsePerDayCurrent * daysFromCurrent;

    //days from next bill to current bill reading
    let nextMonthsDate: Date = getDateFromMeterData(nextReading);
    let daysFromNext: number = daysBetweenDates(currentDate, nextMonthsDate);
    //find days per energy use
    let energyUsePerDayNext: number = nextReading.totalEnergyUse / daysFromNext;
    //apply number of days of current bill (days left of month or untill next reading)
    if (nextMonthsDate.getMonth() != currentDate.getMonth()) {
      //if next months reading need to find until beginning of that month
      //otherwise just will be untill that day
      nextMonthsDate.setMonth(currentDate.getMonth() + 1);
      nextMonthsDate.setDate(0);
      nextMonthsDate.setFullYear(currentDate.getFullYear());
    }
    let daysTillNext: number = daysBetweenDates(currentDate, nextMonthsDate);
    let energyUseForMonthNext: number = energyUsePerDayNext * daysTillNext;

    return {
      calanderizedMonth: new Date(year, month),
      monthReadingSummaries: [
        {
          readDate: getDateFromMeterData(currentReading),
          daysInBill: daysFromPrevious,
          energyUsePerDay: energyUsePerDayCurrent,
          daysApplied: daysFromCurrent,
          totalEnergyFromBill: energyUseForCurrent
        },
        {
          readDate: getDateFromMeterData(nextReading),
          daysInBill: daysFromNext,
          energyUsePerDay: energyUsePerDayNext,
          daysApplied: daysTillNext,
          totalEnergyFromBill: energyUseForMonthNext
        }
      ],
      totalEnergyUse: energyUseForCurrent + energyUseForMonthNext
    };
  }


  calanderizationSummaryFullMonth(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>): Array<CalendarizationSummaryItem> {
    let calanderizationSummary: Array<CalendarizationSummaryItem> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data: IdbUtilityMeterData) => { return getDateFromMeterData(data) });
    if (orderedMeterData.length != 0) {
      let startDate: Date = getDateFromMeterData(orderedMeterData[0]);
      startDate.setMonth(startDate.getMonth() + 1);

      let endDate: Date = new Date(startDate.getFullYear(), startDate.getMonth() + 2);
      while (startDate < endDate) {
        let month: number = startDate.getMonth();
        let year: number = startDate.getFullYear();
        let monthReadingSummaries: Array<{
          readDate: Date,
          daysInBill: number,
          energyUsePerDay: number,
          daysApplied: number,
          totalEnergyFromBill: number
        }> = new Array();
        let currentMonthsReadings: Array<IdbUtilityMeterData> = getCurrentMonthsReadings(month, year, orderedMeterData);
        currentMonthsReadings.forEach(reading => {
          let totalMonthEnergyConsumption: number = 0;
          let totalMonthEnergyUse: number = 0;

          //energy use
          let isEnergyMeter: boolean = getIsEnergyMeter(meter.source);
          if (isEnergyMeter) {
            totalMonthEnergyUse = reading.totalEnergyUse;
          }
          //energy consumption (data input not as energy)
          let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
          if (!isEnergyUnit) {
            totalMonthEnergyConsumption = reading.totalVolume;
          } else {
            totalMonthEnergyConsumption = totalMonthEnergyUse;
          }
          let startOfMonth: Date = getDateFromMeterData(reading);
          startOfMonth.setDate(1);
          let nextMonth: Date = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 1);
          let daysInMonth: number = daysBetweenDates(startOfMonth, nextMonth);
          monthReadingSummaries.push({
            readDate: getDateFromMeterData(reading),
            energyUsePerDay: totalMonthEnergyConsumption / daysInMonth,
            daysApplied: daysInMonth,
            totalEnergyFromBill: totalMonthEnergyConsumption,
            daysInBill: daysInMonth
          })

        })
        calanderizationSummary.push({
          calanderizedMonth: new Date(year, month),
          monthReadingSummaries: monthReadingSummaries,
          totalEnergyUse: _.sumBy(monthReadingSummaries, 'totalEnergyFromBill')
        });
        startDate.setMonth(startDate.getMonth() + 1);
      }
    }
    return calanderizationSummary;
  }

  getYearOptionsAccount(meterCategory: 'water' | 'energy' | 'all', facilityId?: string): Array<number> {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if (facilityId) {
      meters = meters.filter(meter => {
        return meter.facilityId == facilityId
      });
    }
    let categoryMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return this.isCategoryMeter(meter, meterCategory) });
    let categoryMeterIds: Array<string> = categoryMeters.map(meter => { return meter.guid });
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let categoryMeterData: Array<IdbUtilityMeterData> = meterData.filter(data => { return categoryMeterIds.includes(data.meterId) });

    let firstReading: IdbUtilityMeterData = getEarliestMeterData(categoryMeterData);
    let lastReading: IdbUtilityMeterData = getLatestMeterData(categoryMeterData);
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (firstReading && lastReading) {
      let firstReadingDate: Date = getDateFromMeterData(firstReading);
      let lastReadingDate: Date = getDateFromMeterData(lastReading);
      let start: number = getFiscalYear(firstReadingDate, account);
      let end: number = getFiscalYear(lastReadingDate, account);
      let years: Array<number> = [];
      for (let x = start; x <= end; x++) {
        years.push(x);
      }
      return years;
    }
    return [];
  }

  checkReportYearSelection(meterCategory: 'water' | 'energy' | 'all', reportYear: number, accountOrFacility: IdbAccount | IdbFacility): boolean {
    let meters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    if ((accountOrFacility as IdbFacility).accountId !== undefined) {
      meters = meters.filter(meter => {
        return meter.facilityId == accountOrFacility.guid
      });
    }
    let categoryMeters: Array<IdbUtilityMeter> = meters.filter(meter => { return this.isCategoryMeter(meter, meterCategory) });
    let categoryMeterIds: Array<string> = categoryMeters.map(meter => { return meter.guid });
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let categoryMeterData: Array<IdbUtilityMeterData> = meterData.filter(data => { return categoryMeterIds.includes(data.meterId) });
    let yearData: Array<IdbUtilityMeterData> = categoryMeterData.filter(data => {
      let readDate: Date = getDateFromMeterData(data);
      return getFiscalYear(readDate, accountOrFacility) == reportYear;
    });
    let months: Array<number> =  yearData.map(data => {
      return data.month - 1;
    });
    months = _.uniq(months);
    return months.length != 12;
  }

  getYearOptionsFacility(facilityId: string, meterCategory: 'water' | 'energy' | 'all'): Array<number> {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityCategoryMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == facilityId && this.isCategoryMeter(meter, meterCategory) })
    let categoryMeterIds: Array<string> = facilityCategoryMeters.map(meter => { return meter.guid });
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let facilityData: Array<IdbUtilityMeterData> = meterData.filter(data => { return (data.facilityId == facilityId && categoryMeterIds.includes(data.meterId)) });
    let firstReading: IdbUtilityMeterData = getEarliestMeterData(facilityData);
    let lastReading: IdbUtilityMeterData = getLatestMeterData(facilityData);
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let facility: IdbFacility = facilities.find(facility => { return facility.guid == facilityId });
    if (firstReading && lastReading) {
      let firstReadingDate: Date = getDateFromMeterData(firstReading);
      let lastReadingDate: Date = getDateFromMeterData(lastReading);
      let start: number = getFiscalYear(firstReadingDate, facility);
      let end: number = getFiscalYear(lastReadingDate, facility);
      let years: Array<number> = [];
      for (let x = start; x <= end; x++) {
        years.push(x);
      }
      return years;
    }
    return [];
  }

  isCategoryMeter(meter: IdbUtilityMeter, meterCategory: 'water' | 'energy' | 'all'): boolean {
    if (meterCategory == 'water') {
      if (meter.source == 'Water Intake') {
        return true;
      }
      return false;
    } else if (meterCategory == 'energy') {
      return getIsEnergyMeter(meter.source);
    } else if (meterCategory == 'all') {
      return true;
    }
  }
}

//CalanderizationSummaryItem used in modal to show calanderization method
export interface CalendarizationSummaryItem {
  calanderizedMonth: Date,
  monthReadingSummaries: Array<{
    readDate: Date,
    daysInBill: number,
    energyUsePerDay: number,
    daysApplied: number,
    totalEnergyFromBill: number
  }>
  totalEnergyUse: number
}