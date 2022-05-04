import { Injectable } from '@angular/core';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { CalanderizedMeter, MonthlyData, LastYearData, CalanderizationFilters, CalanderizationOptions } from 'src/app/models/calanderization';
import { BehaviorSubject } from 'rxjs';
import { ConvertUnitsService } from '../convert-units/convert-units.service';
import { ReportOptions } from 'src/app/models/overview-report';

@Injectable({
  providedIn: 'root'
})
export class CalanderizationService {


  calanderizedDataFilters: BehaviorSubject<CalanderizationFilters>;
  displayGraphEnergy: "bar" | "scatter" | null = "bar";
  displayGraphCost: "bar" | "scatter" | null = "bar";
  dataDisplay: "table" | "graph" = 'table';
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private energyUnitsHelperService: EnergyUnitsHelperService,
    private convertUnitsService: ConvertUnitsService) {
    this.calanderizedDataFilters = new BehaviorSubject({
      selectedSources: [],
      showAllSources: true,
      selectedDateMax: undefined,
      selectedDateMin: undefined,
      dataDateRange: undefined
    });
  }

  getCalanderizedMeterData(meters: Array<IdbUtilityMeter>, inAccount: boolean, monthDisplayShort?: boolean, calanderizationOptions?: CalanderizationOptions): Array<CalanderizedMeter> {
    console.log('calanderize');
    let calanderizedMeterData: Array<CalanderizedMeter> = new Array();
    meters.forEach(meter => {
      let energyIsSource: boolean;
      let calanderizedenergyUnit: string;
      let meterData: Array<IdbUtilityMeterData>
      if (inAccount) {
        meterData = this.utilityMeterDataDbService.getMeterDataForAccount(meter, true, calanderizationOptions);
        calanderizedenergyUnit = this.energyUnitsHelperService.getMeterConsumptionUnitInAccount(meter);
        energyIsSource = this.energyUnitsHelperService.getEnergyIsSourceInAccount();
      } else {
        meterData = this.utilityMeterDataDbService.getMeterDataForFacility(meter, true, undefined, calanderizationOptions);
        calanderizedenergyUnit = this.energyUnitsHelperService.getMeterConsumptionUnitInFacility(meter);
        energyIsSource = this.energyUnitsHelperService.getEnergyIsSourceInFacility();
      }

      if (calanderizationOptions) {
        energyIsSource = calanderizationOptions.energyIsSource;
      }

      let calanderizedMeter: Array<MonthlyData> = this.calanderizeMeterData(meter, meterData, energyIsSource, calanderizedenergyUnit, monthDisplayShort);
      let showConsumption: boolean = calanderizedMeter.find(meterData => { return meterData.energyConsumption != meterData.energyUse }) != undefined;
      let consumptionUnit: string = meter.startingUnit;
      let showEmissions: boolean = (meter.source == "Electricity" || meter.source == "Natural Gas" || meter.source == "Other Fuels");

      calanderizedMeterData.push({
        consumptionUnit: consumptionUnit,
        meter: meter,
        monthlyData: calanderizedMeter,
        showConsumption: showConsumption,
        showEnergyUse: this.energyUnitsHelperService.isEnergyMeter(meter.source),
        energyUnit: calanderizedenergyUnit,
        showEmissions: showEmissions
      });
    });
    return calanderizedMeterData;
  }

  calanderizeMeterData(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, energyIsSource: boolean, calanderizedEnergyUnit: string, monthDisplayShort?: boolean): Array<MonthlyData> {
    if (meter.meterReadingDataApplication == 'fullMonth' || !meter.meterReadingDataApplication) {
      //used as default
      return this.calanderizeMeterDataFullMonth(meter, meterData, energyIsSource, calanderizedEnergyUnit, monthDisplayShort);
    } else if (meter.meterReadingDataApplication == 'backward') {
      return this.calanderizeMeterDataBackwards(meter, meterData, energyIsSource, calanderizedEnergyUnit, monthDisplayShort);
    }
  }

  //calanderize backwards
  calanderizeMeterDataBackwards(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, energyIsSource: boolean, calanderizedEnergyUnit: string, monthDisplayShort?: boolean): Array<MonthlyData> {
    let calanderizeData: Array<MonthlyData> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    if (orderedMeterData.length > 3) {
      let startDate: Date = new Date(orderedMeterData[0].readDate);
      startDate.setUTCMonth(startDate.getUTCMonth() + 1);
      let endDate: Date = new Date(orderedMeterData[orderedMeterData.length - 1].readDate);
      while (startDate.getUTCMonth() != endDate.getUTCMonth() || startDate.getUTCFullYear() != endDate.getUTCFullYear()) {
        let month: number = startDate.getUTCMonth();
        let year: number = startDate.getUTCFullYear();
        let previousMonthReading: IdbUtilityMeterData = this.getPreviousMonthsBill(month, year, orderedMeterData);
        let currentMonthsReadings: Array<IdbUtilityMeterData> = this.getCurrentMonthsReadings(month, year, orderedMeterData);
        let nextMonthsReading: IdbUtilityMeterData = this.getNextMonthsBill(month, year, orderedMeterData);
        let totals: {
          totalConsumption: number,
          totalEnergyUse: number,
          totalCost: number
        } = {
          totalConsumption: 0,
          totalEnergyUse: 0,
          totalCost: 0
        }

        if (nextMonthsReading) {
          if (currentMonthsReadings.length == 1) {
            //1. current month has 1 bill
            let currentMonthReading: IdbUtilityMeterData = currentMonthsReadings[0];
            totals = this.getBillPeriodTotal(previousMonthReading, currentMonthReading, nextMonthsReading, meter);
          } else if (currentMonthsReadings.length > 1) {
            //2. current month has multiple bills
            let readingSummaries: Array<{
              readDate: Date,
              consumption: number,
              energyUse: number,
              cost: number
            }> = new Array();
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
              let tmpReadingSummaries: Array<{
                readDate: Date,
                consumption: number,
                energyUse: number,
                cost: number
              }> = this.getBillPeriodTotal(previousMonthReading, currentMonthReading, nextReading, meter).readingSummaries;
              readingSummaries = readingSummaries.concat(tmpReadingSummaries);
            }
            readingSummaries = _.uniqWith(readingSummaries, _.isEqual)
            let summaryConsumption: number = _.sumBy(readingSummaries, (summary) => { return summary.consumption })
            let summaryCost: number = _.sumBy(readingSummaries, (summary) => { return summary.cost })
            let summaryEnergyUse: number = _.sumBy(readingSummaries, (summary) => { return summary.energyUse })
            totals.totalConsumption += summaryConsumption;
            totals.totalEnergyUse += summaryEnergyUse;
            totals.totalCost += summaryCost;
          } else if (currentMonthsReadings.length == 0) {
            //3. current month has 0 bills
            //find number of days between next month and previous month
            let previousBillDate: Date = new Date(previousMonthReading.readDate);
            let nextBillDate: Date = new Date(nextMonthsReading.readDate);
            let daysBetween: number = this.daysBetweenDates(previousBillDate, nextBillDate);
            //find per day energy use
            let energyUsePerDay: number = nextMonthsReading.totalEnergyUse / daysBetween;
            let energyCostPerDay: number = nextMonthsReading.totalCost / daysBetween;
            let volumePerDay: number = nextMonthsReading.totalVolume / daysBetween;
            //find number of days in current month
            let currentMonthDate1: Date = new Date(year, month);
            let currentMonthDate2: Date = new Date(year, month + 1);
            let daysInMonth: number = this.daysBetweenDates(currentMonthDate1, currentMonthDate2);
            //multiply per day by number of days in current month
            let energyUseForMonth: number = energyUsePerDay * daysInMonth;
            let volumeForMonth: number = volumePerDay * daysInMonth;
            totals.totalCost = energyCostPerDay * daysInMonth;
            //energy use
            let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
            if (isEnergyMeter) {
              totals.totalEnergyUse = energyUseForMonth;
            }
            //energy consumption (data input not as energy)
            let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit);
            if (!isEnergyUnit) {
              totals.totalConsumption = volumeForMonth;
            } else {
              totals.totalConsumption = energyUseForMonth;
            }
          }
        }

        let monthStr: string;
        if (monthDisplayShort) {
          monthStr = new Date(year, month).toLocaleString('default', { month: 'short' });
        } else {
          monthStr = new Date(year, month).toLocaleString('default', { month: 'long' });
        }
        calanderizeData.push({
          month: monthStr,
          monthNumValue: month,
          year: year,
          energyConsumption: totals.totalConsumption,
          energyUse: totals.totalEnergyUse,
          energyCost: totals.totalCost,
          date: new Date(year, month),
          emissions: this.getEmissions(meter, totals.totalEnergyUse, calanderizedEnergyUnit, energyIsSource)
        });
        startDate.setUTCMonth(startDate.getUTCMonth() + 1);
      }
    }
    return calanderizeData;
  }

  getBillPeriodTotal(previousReading: IdbUtilityMeterData, currentReading: IdbUtilityMeterData, nextReading: IdbUtilityMeterData, meter: IdbUtilityMeter): {
    totalConsumption: number,
    totalEnergyUse: number,
    totalCost: number,
    readingSummaries: Array<{
      readDate: Date,
      consumption: number,
      energyUse: number,
      cost: number
    }>
  } {
    let totalEnergyUse: number = 0;
    let totalConsumption: number = 0;
    let totalCost: number = 0;


    let currentDate: Date = new Date(currentReading.readDate);
    let previousReadingDate: Date = new Date(previousReading.readDate)
    //days from previous to current bill reading
    let daysFromPrevious: number = this.daysBetweenDates(previousReadingDate, currentDate);
    //find per day energy use
    let energyUsePerDayCurrent: number = currentReading.totalEnergyUse / daysFromPrevious;
    let volumePerDayCurrent: number = currentReading.totalVolume / daysFromPrevious;
    //apply number of days of current bill
    let daysFromCurrent: number = currentDate.getUTCDate();
    if (currentDate.getUTCMonth() == previousReadingDate.getUTCMonth()) {
      daysFromCurrent = currentDate.getUTCDate() - previousReadingDate.getUTCDate();
    }
    let energyUseForCurrent: number = energyUsePerDayCurrent * daysFromCurrent;
    let volumeForCurrent: number = volumePerDayCurrent * daysFromCurrent;
    let costForCurrent: number = (currentReading.totalCost / daysFromPrevious) * daysFromCurrent;

    //days from next bill to current bill reading
    let nextMonthsDate: Date = new Date(nextReading.readDate);
    let daysFromNext: number = this.daysBetweenDates(currentDate, nextMonthsDate);
    //find days per energy use
    let energyUsePerDayNext: number = nextReading.totalEnergyUse / daysFromNext;
    let volumePerDayNext: number = nextReading.totalVolume / daysFromNext;
    //apply number of days of current bill (days left of month or untill next reading)
    if (nextMonthsDate.getUTCMonth() != currentDate.getUTCMonth()) {
      //if next months reading need to find until beginning of that month
      //otherwise just will be untill that day
      nextMonthsDate.setUTCFullYear(currentDate.getUTCFullYear());
      nextMonthsDate.setUTCMonth(currentDate.getUTCMonth() + 1);
      nextMonthsDate.setDate(0);
    }
    let daysTillNext: number = this.daysBetweenDates(currentDate, nextMonthsDate);
    let energyUseForNext: number = energyUsePerDayNext * daysTillNext;
    let costForNext: number = (nextReading.totalCost / daysFromNext) * daysTillNext;
    let volumeForNext: number = volumePerDayNext * daysTillNext;
    //energy use
    let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
    if (isEnergyMeter) {
      totalEnergyUse = energyUseForCurrent + energyUseForNext;
    }
    //energy consumption (data input not as energy)
    let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit);
    if (!isEnergyUnit) {
      totalConsumption = volumeForCurrent + volumeForNext;
    } else {
      volumeForCurrent = energyUseForCurrent;
      totalConsumption = totalEnergyUse;
      volumeForNext = energyUseForNext;
    }
    //cost
    totalCost = costForCurrent + costForNext;
    return {
      totalConsumption: totalConsumption,
      totalCost: totalCost,
      totalEnergyUse: totalEnergyUse,
      readingSummaries: [
        {
          readDate: new Date(currentReading.readDate),
          consumption: volumeForCurrent,
          energyUse: energyUseForCurrent,
          cost: costForCurrent
        },
        {
          readDate: new Date(nextReading.readDate),
          consumption: volumeForNext,
          energyUse: energyUseForNext,
          cost: costForNext
        }
      ]
    }
  }

  //calanderize fullMonth
  calanderizeMeterDataFullMonth(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, energyIsSource: boolean, calanderizedEnergyUnit: string, monthDisplayShort?: boolean): Array<MonthlyData> {
    let calanderizeData: Array<MonthlyData> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    if (orderedMeterData.length > 3) {
      let startDate: Date = new Date(orderedMeterData[0].readDate);
      let endDate: Date = new Date(orderedMeterData[orderedMeterData.length - 1].readDate);
      endDate.setUTCMonth(endDate.getUTCMonth() + 1);
      while (startDate < endDate) {
        let month: number = startDate.getUTCMonth();
        let year: number = startDate.getUTCFullYear();
        let currentMonthsReadings: Array<IdbUtilityMeterData> = this.getCurrentMonthsReadings(month, year, orderedMeterData);
        let readingSummaries: Array<{
          energyUse: number,
          energyConsumption: number,
          cost: number
        }> = new Array();
        currentMonthsReadings.forEach(reading => {
          let totalMonthEnergyUse: number = 0;
          let totalMonthEnergyConsumption: number = 0;
          let totalMonthCost: number = reading.totalCost;
          //energy use
          let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
          if (isEnergyMeter) {
            totalMonthEnergyUse = reading.totalEnergyUse;
          }
          //energy consumption (data input not as energy)
          let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit);
          if (!isEnergyUnit) {
            totalMonthEnergyConsumption = reading.totalVolume;
          } else {
            totalMonthEnergyConsumption = totalMonthEnergyUse;
          }
          readingSummaries.push({
            energyConsumption: totalMonthEnergyConsumption,
            energyUse: totalMonthEnergyUse,
            cost: totalMonthCost
          });
        });
        let totalEnergyUse: number = _.sumBy(readingSummaries, 'energyUse');
        let totalCost: number = _.sumBy(readingSummaries, 'cost');
        let totalConsumption: number = _.sumBy(readingSummaries, 'energyConsumption');
        let monthStr: string;
        if (monthDisplayShort) {
          monthStr = new Date(year, month).toLocaleString('default', { month: 'short' });
        } else {
          monthStr = new Date(year, month).toLocaleString('default', { month: 'long' });
        }
        calanderizeData.push({
          month: monthStr,
          monthNumValue: month,
          year: year,
          energyConsumption: totalConsumption,
          energyUse: totalEnergyUse,
          energyCost: totalCost,
          date: new Date(year, month),
          emissions: this.getEmissions(meter, totalEnergyUse, calanderizedEnergyUnit, energyIsSource)
        });
        startDate.setUTCMonth(startDate.getUTCMonth() + 1);
      }
    }
    return calanderizeData;
  }

  daysBetweenDates(firstDate: Date, secondDate: Date) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
    const utc2 = Date.UTC(secondDate.getFullYear(), secondDate.getMonth(), secondDate.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
  }

  getPastYearData(meters: Array<IdbUtilityMeter>, inAccount: boolean, yearEndBill: MonthlyData, calanderizedMeterData?: Array<CalanderizedMeter>, reportOptions?: ReportOptions): Array<LastYearData> {
    if (yearEndBill) {
      //calanderize meters
      if (!calanderizedMeterData) {
        calanderizedMeterData = this.getCalanderizedMeterData(meters, inAccount, undefined, reportOptions);
      }
      //array of year/month combos needed
      let yearMonths: Array<{ year: number, month: number }> = new Array();
      let startDate: Date = new Date(yearEndBill.year - 1, yearEndBill.monthNumValue + 1);
      let endDate: Date = new Date(yearEndBill.date);
      while (startDate <= endDate) {
        yearMonths.push({ year: startDate.getUTCFullYear(), month: startDate.getUTCMonth() });
        startDate.setUTCMonth(startDate.getUTCMonth() + 1);
      }
      //create array of just the meter data
      let combindedCalanderizedMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => {
        return meterData.monthlyData;
      });
      let resultData: Array<LastYearData> = new Array();
      resultData = yearMonths.map(yearMonth => {
        let totalEnergyUse: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.monthNumValue == yearMonth.month && meterData.year == yearMonth.year) {
            return meterData.energyUse;
          } else {
            return 0;
          }
        });
        let totalEnergyConsumption: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.monthNumValue == yearMonth.month && meterData.year == yearMonth.year) {
            return meterData.energyConsumption;
          } else {
            return 0;
          }
        });
        let totalEnergyCost: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.monthNumValue == yearMonth.month && meterData.year == yearMonth.year) {
            return meterData.energyCost;
          } else {
            return 0;
          }
        });
        let totalEmissions: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.monthNumValue == yearMonth.month && meterData.year == yearMonth.year) {
            return meterData.emissions;
          } else {
            return 0;
          }
        });
        return {
          time: yearMonth.month + ', ' + yearMonth.year,
          energyUse: totalEnergyUse,
          energyCost: totalEnergyCost,
          energyConsumption: totalEnergyConsumption,
          year: yearMonth.year,
          month: yearMonth.month,
          date: new Date(yearMonth.year, yearMonth.month),
          emissions: totalEmissions
        }

      });
      return resultData;
    } else {
      return [];
    }
  }


  getLastBillEntry(facilityMeters: Array<IdbUtilityMeter>, inAccount: boolean, reportOptions?: ReportOptions): MonthlyData {
    let calanderizedMeterData: Array<CalanderizedMeter> = this.getCalanderizedMeterData(facilityMeters, inAccount, false, reportOptions);
    let lastBill: MonthlyData = this.getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData);
    return lastBill;
  }

  getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData: Array<CalanderizedMeter>, monthlyData?: Array<MonthlyData>): MonthlyData {
    if (!monthlyData) {
      monthlyData = calanderizedMeterData.flatMap(data => {
        return data.monthlyData;
      });
    }
    let lastBill: MonthlyData = _.maxBy(monthlyData, (data: MonthlyData) => {
      let date = new Date(data.date);
      // date.setFullYear(data.year, data.monthNumValue);
      return date;
    });
    return lastBill;
  }

  getFirstBillEntryFromCalanderizedMeterData(calanderizedMeterData: Array<CalanderizedMeter>, monthlyData?: Array<MonthlyData>): MonthlyData {
    if (!monthlyData) {
      monthlyData = calanderizedMeterData.flatMap(data => {
        return data.monthlyData;
      });
    }
    let firstBill: MonthlyData = _.minBy(monthlyData, (data: MonthlyData) => {
      let date = new Date(data.date);
      // date.setFullYear(data.year, data.monthNumValue);
      return date;
    });
    return firstBill;
  }
  getYearPriorBillEntry(facilityMeters: Array<IdbUtilityMeter>, inAccount: boolean, lastBill: MonthlyData): Array<MonthlyData> {
    let calanderizedMeterData: Array<CalanderizedMeter> = this.getCalanderizedMeterData(facilityMeters, inAccount, false);
    let yearPriorBill: Array<MonthlyData> = this.getYearPriorBillEntryFromCalanderizedMeterData(calanderizedMeterData, lastBill);
    if (yearPriorBill) {
      return yearPriorBill;
    } else {
      return [{
        month: undefined,
        monthNumValue: undefined,
        year: undefined,
        energyConsumption: 0,
        energyUse: 0,
        energyCost: 0,
        date: undefined,
        emissions: 0
      }]
    }
  }

  getYearPriorBillEntryFromCalanderizedMeterData(calanderizedMeterData: Array<CalanderizedMeter>, lastBill: MonthlyData): Array<MonthlyData> {
    let monthlyData: Array<MonthlyData> = calanderizedMeterData.flatMap(data => {
      return data.monthlyData;
    });
    let yearPrior: number = lastBill.year - 1;
    let yearPriorBill: Array<MonthlyData> = monthlyData.filter(dataItem => {
      return (dataItem.year == yearPrior) && (dataItem.monthNumValue == lastBill.monthNumValue);
    });
    return yearPriorBill;
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
        let previousMonthReading: IdbUtilityMeterData = this.getPreviousMonthsBill(month, year, orderedMeterData);
        let currentMonthsReadings: Array<IdbUtilityMeterData> = this.getCurrentMonthsReadings(month, year, orderedMeterData);
        let nextMonthsReading: IdbUtilityMeterData = this.getNextMonthsBill(month, year, orderedMeterData);
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
            let daysBetween: number = this.daysBetweenDates(previousBillDate, nextBillDate);
            //find per day energy use
            let energyUsePerDay: number = nextMonthsReading.totalEnergyUse / daysBetween;
            //find number of days in current month
            let currentMonthDate1: Date = new Date(year, month);
            let currentMonthDate2: Date = new Date(year, month + 1);
            let daysInMonth: number = this.daysBetweenDates(currentMonthDate1, currentMonthDate2);
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

  getPreviousMonthsBill(month: number, year: number, meterReadings: Array<IdbUtilityMeterData>): IdbUtilityMeterData {
    //set to the 5th to not conflict
    let previousMonth: Date = new Date();
    previousMonth.setUTCFullYear(year, month - 1, 5);
    let previousMonthReadings: Array<IdbUtilityMeterData> = this.getCurrentMonthsReadings(previousMonth.getUTCMonth(), previousMonth.getUTCFullYear(), meterReadings);
    if (previousMonthReadings.length == 0) {
      return this.getPreviousMonthsBill(previousMonth.getUTCMonth(), previousMonth.getUTCFullYear(), meterReadings);
    } else if (previousMonthReadings.length == 1) {
      return previousMonthReadings[0]
    } else {
      let latestReading: IdbUtilityMeterData = _.maxBy(previousMonthReadings, (reading) => { return new Date(reading.readDate) });
      return latestReading;
    }
  }

  getCurrentMonthsReadings(month: number, year: number, meterReadings: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    let currentMonthReadings: Array<IdbUtilityMeterData> = _.filter(meterReadings, (reading) => {
      let readingDate: Date = new Date(reading.readDate);
      return (month == readingDate.getUTCMonth() && year == readingDate.getUTCFullYear());
    });
    return _.orderBy(currentMonthReadings, (data) => { return new Date(data.readDate) });
  }

  getNextMonthsBill(month: number, year: number, meterReadings: Array<IdbUtilityMeterData>): IdbUtilityMeterData {
    let nextMonth: Date = new Date();
    nextMonth.setFullYear(year, month + 1, 5);
    let nextMonthReadings: Array<IdbUtilityMeterData> = this.getCurrentMonthsReadings(nextMonth.getUTCMonth(), nextMonth.getUTCFullYear(), meterReadings);
    if (nextMonthReadings.length == 0) {
      return this.getNextMonthsBill(nextMonth.getUTCMonth(), nextMonth.getUTCFullYear(), meterReadings);
    } else if (nextMonthReadings.length == 1) {
      return nextMonthReadings[0]
    } else {
      let latestReading: IdbUtilityMeterData = _.minBy(nextMonthReadings, (reading) => { return new Date(reading.readDate) });
      return latestReading;
    }
  }

  getCalanderizationSummaryItem(previousReading: IdbUtilityMeterData, currentReading: IdbUtilityMeterData, nextReading: IdbUtilityMeterData, year: number, month: number): CalendarizationSummaryItem {
    let currentDate: Date = new Date(currentReading.readDate);
    let previousReadingDate: Date = new Date(previousReading.readDate)
    //days from previous to current bill reading
    let daysFromPrevious: number = this.daysBetweenDates(previousReadingDate, currentDate);
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
    let daysFromNext: number = this.daysBetweenDates(currentDate, nextMonthsDate);
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
    let daysTillNext: number = this.daysBetweenDates(currentDate, nextMonthsDate);
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
    if (orderedMeterData.length > 3) {
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
        let currentMonthsReadings: Array<IdbUtilityMeterData> = this.getCurrentMonthsReadings(month, year, orderedMeterData);
        currentMonthsReadings.forEach(reading => {
          let totalMonthEnergyConsumption: number = 0;
          let totalMonthEnergyUse: number = 0;

          //energy use
          let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
          if (isEnergyMeter) {
            totalMonthEnergyUse = reading.totalEnergyUse;
          }
          //energy consumption (data input not as energy)
          let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit);
          if (!isEnergyUnit) {
            totalMonthEnergyConsumption = reading.totalVolume;
          } else {
            totalMonthEnergyConsumption = totalMonthEnergyUse;
          }
          let startOfMonth: Date = new Date(reading.readDate);
          startOfMonth.setDate(1);
          let nextMonth: Date = new Date(startOfMonth.getUTCFullYear(), startOfMonth.getUTCMonth() + 1, 1);
          let daysInMonth: number = this.daysBetweenDates(startOfMonth, nextMonth);
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

  getEmissions(meter: IdbUtilityMeter, energyUse: number, energyUnit: string, energyIsSource: boolean): number {
    if (meter.source == 'Electricity' || meter.source == 'Natural Gas' || meter.source == 'Other Fuels') {
      if (energyIsSource) {
        energyUse = energyUse / meter.siteToSource;
      }
      if (meter.source != 'Electricity') {
        let convertedEnergyUse: number = this.convertUnitsService.value(energyUse).from(energyUnit).to(meter.energyUnit);
        return convertedEnergyUse * meter.emissionsOutputRate
      } else {
        let convertedEnergyUse: number = this.convertUnitsService.value(energyUse).from(energyUnit).to('kWh');
        return convertedEnergyUse * meter.emissionsOutputRate
      }
    }
    return 0;
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