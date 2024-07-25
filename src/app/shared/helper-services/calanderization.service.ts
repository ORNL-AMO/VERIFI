import { Injectable } from '@angular/core';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { CalanderizationFilters } from 'src/app/models/calanderization';
import { BehaviorSubject } from 'rxjs';
import { FacilitydbService } from 'src/app/indexedDB/facility-db.service';
import { AccountdbService } from 'src/app/indexedDB/account-db.service';
import { getIsEnergyMeter, getIsEnergyUnit } from '../sharedHelperFuntions';
import { UtilityMeterdbService } from 'src/app/indexedDB/utilityMeter-db.service';
import { daysBetweenDates, getCurrentMonthsReadings, getNextMonthsBill, getPreviousMonthsBill } from 'src/app/calculations/calanderization/calanderizationHelpers';
import { getFiscalYear } from 'src/app/calculations/shared-calculations/calanderizationFunctions';
import { IdbAccount } from 'src/app/models/idbModels/account';

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
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    if (orderedMeterData.length > 3) {
      let startDate: Date = new Date(orderedMeterData[0].readDate);
      startDate.setUTCMonth(startDate.getUTCMonth() + 1);

      let endDate: Date = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth() + 2);
      while (startDate < endDate) {
        let month: number = startDate.getUTCMonth();
        let year: number = startDate.getUTCFullYear();
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
            let previousBillDate: Date = new Date(previousMonthReading.readDate);
            let nextBillDate: Date = new Date(nextMonthsReading.readDate);
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
                readDate: new Date(nextMonthsReading.readDate),
                daysInBill: daysBetween,
                energyUsePerDay: energyUsePerDay,
                daysApplied: daysInMonth,
                totalEnergyFromBill: energyUseForMonth
              }],
              totalEnergyUse: energyUseForMonth
            });
          }
        }
        startDate.setUTCMonth(startDate.getUTCMonth() + 1);
      }
    }
    return calanderizationSummary;
  }

  getCalanderizationSummaryItem(previousReading: IdbUtilityMeterData, currentReading: IdbUtilityMeterData, nextReading: IdbUtilityMeterData, year: number, month: number): CalendarizationSummaryItem {
    let currentDate: Date = new Date(currentReading.readDate);
    let previousReadingDate: Date = new Date(previousReading.readDate)
    //days from previous to current bill reading
    let daysFromPrevious: number = daysBetweenDates(previousReadingDate, currentDate);
    //find per day energy use
    let energyUsePerDayCurrent: number = currentReading.totalEnergyUse / daysFromPrevious;
    //apply number of days of current bill
    let daysFromCurrent: number = currentDate.getUTCDate();
    if (currentDate.getUTCMonth() == previousReadingDate.getUTCMonth()) {
      daysFromCurrent = currentDate.getUTCDate() - previousReadingDate.getUTCDate();
    }
    let energyUseForCurrent: number = energyUsePerDayCurrent * daysFromCurrent;

    //days from next bill to current bill reading
    let nextMonthsDate: Date = new Date(nextReading.readDate);
    let daysFromNext: number = daysBetweenDates(currentDate, nextMonthsDate);
    //find days per energy use
    let energyUsePerDayNext: number = nextReading.totalEnergyUse / daysFromNext;
    //apply number of days of current bill (days left of month or untill next reading)
    if (nextMonthsDate.getUTCMonth() != currentDate.getUTCMonth()) {
      //if next months reading need to find until beginning of that month
      //otherwise just will be untill that day
      nextMonthsDate.setUTCMonth(currentDate.getUTCMonth() + 1);
      nextMonthsDate.setDate(0);
      nextMonthsDate.setUTCFullYear(currentDate.getUTCFullYear());
    }
    let daysTillNext: number = daysBetweenDates(currentDate, nextMonthsDate);
    let energyUseForMonthNext: number = energyUsePerDayNext * daysTillNext;

    return {
      calanderizedMonth: new Date(year, month),
      monthReadingSummaries: [
        {
          readDate: new Date(currentReading.readDate),
          daysInBill: daysFromPrevious,
          energyUsePerDay: energyUsePerDayCurrent,
          daysApplied: daysFromCurrent,
          totalEnergyFromBill: energyUseForCurrent
        },
        {
          readDate: new Date(nextReading.readDate),
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
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    if (orderedMeterData.length != 0) {
      let startDate: Date = new Date(orderedMeterData[0].readDate);
      startDate.setUTCMonth(startDate.getUTCMonth() + 1);

      let endDate: Date = new Date(startDate.getUTCFullYear(), startDate.getUTCMonth() + 2);
      while (startDate < endDate) {
        let month: number = startDate.getUTCMonth();
        let year: number = startDate.getUTCFullYear();
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
          let startOfMonth: Date = new Date(reading.readDate);
          startOfMonth.setDate(1);
          let nextMonth: Date = new Date(startOfMonth.getUTCFullYear(), startOfMonth.getUTCMonth() + 1, 1);
          let daysInMonth: number = daysBetweenDates(startOfMonth, nextMonth);
          monthReadingSummaries.push({
            readDate: new Date(reading.readDate),
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
        startDate.setUTCMonth(startDate.getUTCMonth() + 1);
      }
    }
    return calanderizationSummary;
  }

  getYearOptionsAccount(meterCategory: 'water' | 'energy' | 'all'): Array<number> {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let categoryMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return this.isCategoryMeter(meter, meterCategory) });
    let categoryMeterIds: Array<string> = categoryMeters.map(meter => { return meter.guid });
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let categoryMeterData: Array<IdbUtilityMeterData> = meterData.filter(data => { return categoryMeterIds.includes(data.meterId) });

    let firstReading: IdbUtilityMeterData = _.minBy(categoryMeterData, (data) => { return new Date(data.readDate) });
    let lastReading: IdbUtilityMeterData = _.maxBy(categoryMeterData, (data) => { return new Date(data.readDate) });
    let account: IdbAccount = this.accountDbService.selectedAccount.getValue();
    if (firstReading && lastReading) {
      let start: number = getFiscalYear(firstReading.readDate, account);
      let end: number = getFiscalYear(lastReading.readDate, account);
      let years: Array<number> = [];
      for (let x = start; x <= end; x++) {
        years.push(x);
      }
      return years;
    }
    return [];
  }

  getYearOptionsFacility(facilityId: string, meterCategory: 'water' | 'energy' | 'all'): Array<number> {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let facilityCategoryMeters: Array<IdbUtilityMeter> = accountMeters.filter(meter => { return meter.facilityId == facilityId && this.isCategoryMeter(meter, meterCategory) })
    let categoryMeterIds: Array<string> = facilityCategoryMeters.map(meter => { return meter.guid });
    let meterData: Array<IdbUtilityMeterData> = this.utilityMeterDataDbService.accountMeterData.getValue();
    let facilityData: Array<IdbUtilityMeterData> = meterData.filter(data => { return (data.facilityId == facilityId && categoryMeterIds.includes(data.meterId)) });
    let firstReading: IdbUtilityMeterData = _.minBy(facilityData, (data) => { return new Date(data.readDate) });
    let lastReading: IdbUtilityMeterData = _.maxBy(facilityData, (data) => { return new Date(data.readDate) });
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    let facility: IdbFacility = facilities.find(facility => { return facility.guid == facilityId });
    if (firstReading && lastReading) {
      let start: number = getFiscalYear(firstReading.readDate, facility);
      let end: number = getFiscalYear(lastReading.readDate, facility);
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