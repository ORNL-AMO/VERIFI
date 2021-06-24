import { Injectable } from '@angular/core';
import { IdbUtilityMeter, IdbUtilityMeterData } from 'src/app/models/idb';
import * as _ from 'lodash';
import { UtilityMeterDatadbService } from 'src/app/indexedDB/utilityMeterData-db.service';
import { EnergyUnitsHelperService } from 'src/app/shared/helper-services/energy-units-helper.service';
import { CalanderizedMeter, MonthlyData, LastYearData, CalanderizationFilters } from 'src/app/models/calanderization';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CalanderizationService {


  calanderizedDataFilters: BehaviorSubject<CalanderizationFilters>
  displayGraphEnergy: "bar" | "scatter" | null = "bar";
  displayGraphCost: "bar" | "scatter" | null = "bar";
  dataDisplay: "table" | "graph" = 'table';
  constructor(private utilityMeterDataDbService: UtilityMeterDatadbService, private energyUnitsHelperService: EnergyUnitsHelperService) {
    this.calanderizedDataFilters = new BehaviorSubject({
      selectedSources: [],
      showAllSources: true,
      selectedDateMax: undefined,
      selectedDateMin: undefined,
      dataDateRange: undefined
    });
  }

  getCalanderizedMeterData(meters: Array<IdbUtilityMeter>, inAccount: boolean, monthDisplayShort?: boolean): Array<CalanderizedMeter> {
    let calanderizedMeterData: Array<CalanderizedMeter> = new Array();
    meters.forEach(meter => {
      let meterData: Array<IdbUtilityMeterData>
      if (inAccount) {
        meterData = this.utilityMeterDataDbService.getMeterDataForAccount(meter, true);
      } else {
        meterData = this.utilityMeterDataDbService.getMeterDataForFacility(meter, true);
      }
      let calanderizedMeter: Array<MonthlyData> = this.calanderizeMeterData(meter, meterData, monthDisplayShort);
      let showConsumption: boolean = calanderizedMeter.find(meterData => { return meterData.energyConsumption != meterData.energyUse }) != undefined;
      let consumptionUnit: string = meter.startingUnit;

      let energyUnit: string;
      if (inAccount) {
        energyUnit = this.energyUnitsHelperService.getMeterConsumptionUnitInAccount(meter);
      } else {
        energyUnit = this.energyUnitsHelperService.getMeterConsumptionUnitInFacility(meter);
      }
      calanderizedMeterData.push({
        consumptionUnit: consumptionUnit,
        meter: meter,
        monthlyData: calanderizedMeter,
        showConsumption: showConsumption,
        showEnergyUse: this.energyUnitsHelperService.isEnergyMeter(meter.source),
        energyUnit: energyUnit
      });
    });
    return calanderizedMeterData;
  }

  calanderizeMeterData(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, monthDisplayShort?: boolean): Array<MonthlyData> {
    if (meter.meterReadingDataApplication == 'backward') {
      return this.calanderizeMeterDataBackwards(meter, meterData, monthDisplayShort);
    } else if (meter.meterReadingDataApplication == 'fullMonth' || !meter.meterReadingDataApplication) {
      //used as default
      return this.calanderizeMeterDataFullMonth(meter, meterData, monthDisplayShort);
    } else if (meter.meterReadingDataApplication == 'forward') {
      return this.calanderizeMeterDataForwards(meter, meterData, monthDisplayShort);
    }
  }

  //calanderize backwards
  calanderizeMeterDataBackwards(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, monthDisplayShort?: boolean): Array<MonthlyData> {
    let calanderizeData: Array<MonthlyData> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    for (let meterIndex = 1; meterIndex < orderedMeterData.length - 1; meterIndex++) {
      let currentBill: IdbUtilityMeterData = orderedMeterData[meterIndex];
      let previousBill: IdbUtilityMeterData = orderedMeterData[meterIndex - 1];
      let daysFromPrevious: number = this.daysBetweenDates(new Date(previousBill.readDate), new Date(currentBill.readDate));

      let nextBill: IdbUtilityMeterData = orderedMeterData[meterIndex + 1];
      let daysFromNext: number = this.daysBetweenDates(new Date(currentBill.readDate), new Date(nextBill.readDate));
      let totalMonthCost: number;
      let totalMonthEnergyConsumption: number = 0;
      let totalMonthEnergyUse: number;
      if (daysFromPrevious > 20 && daysFromPrevious < 60) {
        let firstDayOfCurrentMonth: Date = new Date(currentBill.readDate);
        firstDayOfCurrentMonth.setDate(0);
        let daysBeforeCurrentBill: number = this.daysBetweenDates(firstDayOfCurrentMonth, new Date(currentBill.readDate));
        let firstDayOfNextMonth: Date = new Date(nextBill.readDate);
        firstDayOfNextMonth.setDate(0);
        let daysAfterCurrentBill: number = this.daysBetweenDates(new Date(currentBill.readDate), firstDayOfNextMonth);
        //energy use
        let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
        if (isEnergyMeter) {
          let energyUsePerDayCurrentBill: number = currentBill.totalEnergyUse / daysFromPrevious;
          let energyUsePerDayNextBill: number = nextBill.totalEnergyUse / daysFromNext;
          totalMonthEnergyUse = (energyUsePerDayCurrentBill * daysBeforeCurrentBill) + (energyUsePerDayNextBill * daysAfterCurrentBill);
        }
        //energy consumption (data input not as energy)
        let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit);
        if (!isEnergyUnit) {
          let energyConsumptionPerDayCurrentBill: number = currentBill.totalVolume / daysFromPrevious;
          let energyConsumptionPerDayNextBill: number = nextBill.totalVolume / daysFromNext;
          totalMonthEnergyConsumption = (energyConsumptionPerDayCurrentBill * daysBeforeCurrentBill) + (energyConsumptionPerDayNextBill * daysAfterCurrentBill)
        } else {
          totalMonthEnergyConsumption = totalMonthEnergyUse;
        }
        //cost
        let costPerDayCurrentBill: number = currentBill.totalCost / daysFromPrevious;
        let costPerDayNextBill: number = nextBill.totalCost / daysFromNext;
        totalMonthCost = (costPerDayCurrentBill * daysBeforeCurrentBill) + (costPerDayNextBill * daysAfterCurrentBill);
      }
      let month: string;
      if (monthDisplayShort) {
        month = new Date(currentBill.readDate).toLocaleString('default', { month: 'short' });
      } else {
        month = new Date(currentBill.readDate).toLocaleString('default', { month: 'long' });
      }
      let monthNumValue: number = new Date(currentBill.readDate).getMonth();
      let year: number = new Date(currentBill.readDate).getFullYear();
      calanderizeData.push({
        month: month,
        monthNumValue: monthNumValue,
        year: year,
        energyConsumption: totalMonthEnergyConsumption,
        energyUse: totalMonthEnergyUse,
        energyCost: totalMonthCost,
        date: new Date(year, monthNumValue)
      });
    }

    return calanderizeData;
  }

  //calanderize fullMonth
  calanderizeMeterDataFullMonth(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, monthDisplayShort?: boolean): Array<MonthlyData> {
    let calanderizeData: Array<MonthlyData> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    for (let meterIndex = 0; meterIndex < orderedMeterData.length; meterIndex++) {
      let currentBill: IdbUtilityMeterData = orderedMeterData[meterIndex];
      let totalMonthEnergyConsumption: number = 0;
      let totalMonthEnergyUse: number;

      //energy use
      let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
      if (isEnergyMeter) {
        totalMonthEnergyUse = currentBill.totalEnergyUse;
      }
      //energy consumption (data input not as energy)
      let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit);
      if (!isEnergyUnit) {
        totalMonthEnergyConsumption = currentBill.totalVolume;
      } else {
        totalMonthEnergyConsumption = totalMonthEnergyUse;
      }
      let month: string;
      if (monthDisplayShort) {
        month = new Date(currentBill.readDate).toLocaleString('default', { month: 'short' });
      } else {
        month = new Date(currentBill.readDate).toLocaleString('default', { month: 'long' });
      }
      let monthNumValue: number = new Date(currentBill.readDate).getMonth();
      let year: number = new Date(currentBill.readDate).getFullYear();
      calanderizeData.push({
        month: month,
        monthNumValue: monthNumValue,
        year: year,
        energyConsumption: totalMonthEnergyConsumption,
        energyUse: totalMonthEnergyUse,
        energyCost: currentBill.totalCost,
        date: new Date(year, monthNumValue)
      });
    }
    return calanderizeData;
  }

  //calanderize forwards
  calanderizeMeterDataForwards(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, monthDisplayShort?: boolean): Array<MonthlyData> {
    let calanderizeData: Array<MonthlyData> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    for (let meterIndex = 1; meterIndex < orderedMeterData.length - 1; meterIndex++) {
      let currentBill: IdbUtilityMeterData = orderedMeterData[meterIndex];
      let previousBill: IdbUtilityMeterData = orderedMeterData[meterIndex - 1];
      let daysFromPrevious: number = this.daysBetweenDates(new Date(previousBill.readDate), new Date(currentBill.readDate));

      let nextBill: IdbUtilityMeterData = orderedMeterData[meterIndex + 1];
      let daysFromNext: number = this.daysBetweenDates(new Date(currentBill.readDate), new Date(nextBill.readDate));
      let totalMonthCost: number;
      let totalMonthEnergyConsumption: number = 0;
      let totalMonthEnergyUse: number;
      if (daysFromNext > 20 && daysFromNext < 60) {
        let firstDayOfCurrentMonth: Date = new Date(currentBill.readDate);
        firstDayOfCurrentMonth.setDate(0);
        let daysBeforeCurrentBill: number = this.daysBetweenDates(firstDayOfCurrentMonth, new Date(currentBill.readDate));
        let firstDayOfNextMonth: Date = new Date(nextBill.readDate);
        firstDayOfNextMonth.setDate(0);
        let daysAfterCurrentBill: number = this.daysBetweenDates(new Date(currentBill.readDate), firstDayOfNextMonth);
        //energy use
        let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
        if (isEnergyMeter) {
          let energyUsePerDayCurrentBill: number = currentBill.totalEnergyUse / daysFromNext;
          let energyUsePerDayPreviousBill: number = previousBill.totalEnergyUse / daysFromPrevious;
          totalMonthEnergyUse = (energyUsePerDayCurrentBill * daysAfterCurrentBill) + (energyUsePerDayPreviousBill * daysBeforeCurrentBill);
        }
        //energy consumption (data input not as energy)
        let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit);
        if (!isEnergyUnit) {
          let energyConsumptionPerDayCurrentBill: number = currentBill.totalVolume / daysFromNext;
          let energyConsumptionPerDayPreviousBill: number = previousBill.totalVolume / daysFromPrevious;
          totalMonthEnergyConsumption = (energyConsumptionPerDayCurrentBill * daysAfterCurrentBill) + (energyConsumptionPerDayPreviousBill * daysBeforeCurrentBill)
        } else {
          totalMonthEnergyConsumption = totalMonthEnergyUse;
        }
        //cost
        let costPerDayCurrentBill: number = currentBill.totalCost / daysFromNext;
        let costPerDayPreviousBill: number = previousBill.totalCost / daysFromPrevious;
        totalMonthCost = (costPerDayCurrentBill * daysAfterCurrentBill) + (costPerDayPreviousBill * daysBeforeCurrentBill);
      }
      let month: string;
      if (monthDisplayShort) {
        month = new Date(currentBill.readDate).toLocaleString('default', { month: 'short' });
      } else {
        month = new Date(currentBill.readDate).toLocaleString('default', { month: 'long' });
      }
      let monthNumValue: number = new Date(currentBill.readDate).getMonth();
      let year: number = new Date(currentBill.readDate).getFullYear();
      calanderizeData.push({
        month: month,
        monthNumValue: monthNumValue,
        year: year,
        energyConsumption: totalMonthEnergyConsumption,
        energyUse: totalMonthEnergyUse,
        energyCost: totalMonthCost,
        date: new Date(year, monthNumValue)
      });
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

  getPastYearData(meters: Array<IdbUtilityMeter>, inAccount: boolean, lastBill: MonthlyData): Array<LastYearData> {
    if (lastBill) {
      //calanderize meters
      let calanderizedMeterData: Array<CalanderizedMeter> = this.getCalanderizedMeterData(meters, inAccount);
      //create array of just the meter data
      let combindedCalanderizedMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => {
        return meterData.monthlyData;
      });
      //create array of the uniq months and years
      let yearMonths: Array<{ year: number, month: number }> = combindedCalanderizedMeterData.map(data => { return { year: data.year, month: data.monthNumValue } });
      let resultData: Array<LastYearData> = new Array();
      yearMonths = _.uniqWith(yearMonths, (a, b) => {
        return (a.year == b.year && a.month == b.month)
      });
      //filter year/months over a year old
      let todaysDate: Date = new Date(lastBill.year - 1, lastBill.monthNumValue + 1);
      let oneYearAgo: number = todaysDate.getFullYear();
      let month: number = todaysDate.getMonth();
      yearMonths = _.filter(yearMonths, yearMonth => {
        if (yearMonth.year >= oneYearAgo) {
          let monthTest: number = yearMonth.month - month;
          if (monthTest >= 0 || yearMonth.year == (oneYearAgo + 1)) {
            return true;
          }
        }
      });

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
        return {
          time: yearMonth.month + ', ' + yearMonth.year,
          energyUse: totalEnergyUse,
          energyCost: totalEnergyCost,
          energyConsumption: totalEnergyConsumption,
          year: yearMonth.year,
          month: yearMonth.month,
          date: new Date(yearMonth.year, yearMonth.month)
        }

      });
      return resultData;
    } else {
      return [];
    }
  }


  getLastBillEntry(facilityMeters: Array<IdbUtilityMeter>, inAccount: boolean): MonthlyData {
    let calanderizedMeterData: Array<CalanderizedMeter> = this.getCalanderizedMeterData(facilityMeters, inAccount, false);
    let lastBill: MonthlyData = this.getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData);
    return lastBill;
  }

  getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData: Array<CalanderizedMeter>): MonthlyData {
    let monthlyData: Array<MonthlyData> = calanderizedMeterData.flatMap(data => {
      return data.monthlyData;
    })
    let lastBill: MonthlyData = _.maxBy(monthlyData, (data: MonthlyData) => {
      let date = new Date();
      date.setFullYear(data.year, data.monthNumValue);
      return date;
    });
    return lastBill;
  }

  getFirstBillEntryFromCalanderizedMeterData(calanderizedMeterData: Array<CalanderizedMeter>): MonthlyData {
    let monthlyData: Array<MonthlyData> = calanderizedMeterData.flatMap(data => {
      return data.monthlyData;
    })
    let firstBill: MonthlyData = _.minBy(monthlyData, (data: MonthlyData) => {
      let date = new Date();
      date.setFullYear(data.year, data.monthNumValue);
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
        date: undefined
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
    if (meter.meterReadingDataApplication == 'backward') {
      return this.calanderizationSummaryBackwards(meter, meterData);
    } else if (meter.meterReadingDataApplication == 'fullMonth' || !meter.meterReadingDataApplication) {
      //used as default
      return this.calanderizationSummaryFullMonth(meter, meterData);
    } else if (meter.meterReadingDataApplication == 'forward') {
      return this.calanderizationSummaryForwards(meter, meterData);
    }
  }

  calanderizationSummaryBackwards(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>): Array<CalendarizationSummaryItem> {
    let calanderizationSummary: Array<CalendarizationSummaryItem> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    for (let meterIndex = 0; meterIndex < orderedMeterData.length; meterIndex++) {
      let currentBill: IdbUtilityMeterData = orderedMeterData[meterIndex];
      let previousBill: IdbUtilityMeterData;
      let daysFromPrevious: number;
      if (meterIndex != 0) {
        previousBill = orderedMeterData[meterIndex - 1];
        daysFromPrevious = this.daysBetweenDates(new Date(previousBill.readDate), new Date(currentBill.readDate));
      }
      let nextBill: IdbUtilityMeterData;
      let daysFromNext: number = 0;
      if (meterIndex < orderedMeterData.length - 1) {
        nextBill = orderedMeterData[meterIndex + 1];
        daysFromNext = this.daysBetweenDates(new Date(currentBill.readDate), new Date(nextBill.readDate));
      }
     
      let daysBeforeCurrentBill: number = 0;
      let firstDayOfCurrentMonth: Date = new Date();
      let energyUsePerDayCurrentBill: number = 0;
     
      let daysAfterCurrentBill: number = 0;
      if (daysFromPrevious > 20 && daysFromPrevious < 60 && meterIndex != 0) {
        firstDayOfCurrentMonth = new Date(currentBill.readDate);
        firstDayOfCurrentMonth.setDate(0);
        daysBeforeCurrentBill = this.daysBetweenDates(firstDayOfCurrentMonth, new Date(currentBill.readDate));
        if (nextBill) {
          let firstDayOfNextMonth: Date = new Date(nextBill.readDate);
          firstDayOfNextMonth.setDate(0);
          daysAfterCurrentBill = this.daysBetweenDates(new Date(currentBill.readDate), firstDayOfNextMonth);
        }
        //energy use
        let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
        if (isEnergyMeter) {
          energyUsePerDayCurrentBill = currentBill.totalEnergyUse / daysFromPrevious;
      }
        //energy consumption (data input not as energy)
        let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit);
        if (!isEnergyUnit && !energyUsePerDayCurrentBill) {
          energyUsePerDayCurrentBill = currentBill.totalVolume / daysFromPrevious;
        }
      }
      if (previousBill) {
        let prevBillDate: Date = new Date(previousBill.readDate);
        let endOfMonthPrevBill: Date = new Date(currentBill.readDate);
        endOfMonthPrevBill.setDate(0)
        let numberOfDaysPreviousBill: number = this.daysBetweenDates(prevBillDate, endOfMonthPrevBill);

        calanderizationSummary.push({
          readDate: new Date(currentBill.readDate),
          energyUsePerDay: energyUsePerDayCurrentBill,
          calanderizationMonthOne: new Date(previousBill.readDate),
          calanderizationMonthTwo: new Date(currentBill.readDate),
          monthOneReading: (energyUsePerDayCurrentBill * numberOfDaysPreviousBill),
          monthTwoReading: (energyUsePerDayCurrentBill * daysBeforeCurrentBill),
          monthOneDaysUsed: numberOfDaysPreviousBill,
          monthTwoDaysUsed: daysBeforeCurrentBill
        });
      } else {
        calanderizationSummary.push({
          readDate: new Date(currentBill.readDate),
          energyUsePerDay: energyUsePerDayCurrentBill,
          calanderizationMonthOne: undefined,
          calanderizationMonthTwo: undefined,
          monthOneReading: undefined,
          monthTwoReading: undefined,
          monthOneDaysUsed: undefined,
          monthTwoDaysUsed: undefined
        });
      }
    }
    return calanderizationSummary;
  }

  calanderizationSummaryForwards(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>): Array<CalendarizationSummaryItem> {
    let calanderizationSummary: Array<CalendarizationSummaryItem> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    for (let meterIndex = 0; meterIndex < orderedMeterData.length; meterIndex++) {
      let currentBill: IdbUtilityMeterData = orderedMeterData[meterIndex];
      let nextBill: IdbUtilityMeterData;
      let daysFromNext: number = 0;
      if (meterIndex < orderedMeterData.length - 1) {
        nextBill = orderedMeterData[meterIndex + 1];
        daysFromNext = this.daysBetweenDates(new Date(currentBill.readDate), new Date(nextBill.readDate));
      }
     
      let energyUsePerDayCurrentBill: number = 0;
     
      let daysAfterCurrentBill: number = 0;
      if (daysFromNext > 20 && daysFromNext < 60) {
        if (nextBill) {
          let firstDayOfNextMonth: Date = new Date(nextBill.readDate);
          firstDayOfNextMonth.setDate(0);
          daysAfterCurrentBill = this.daysBetweenDates(new Date(currentBill.readDate), firstDayOfNextMonth);
        }
        //energy use
        let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
        if (isEnergyMeter) {
          energyUsePerDayCurrentBill = currentBill.totalEnergyUse / daysFromNext;
      }
        //energy consumption (data input not as energy)
        let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit);
        if (!isEnergyUnit && !energyUsePerDayCurrentBill) {
          energyUsePerDayCurrentBill = currentBill.totalVolume / daysFromNext;
        }
      }
      if (nextBill) {
        let startOfNextBillMonth: Date = new Date(nextBill.readDate);
        startOfNextBillMonth.setDate(0)
        let endOfMonthCurrentBill: Date = new Date(nextBill.readDate);
        // endOfMonthCurrentBill.setDate(0)
        let numberOfDaysNextBill: number = this.daysBetweenDates(startOfNextBillMonth, endOfMonthCurrentBill);

        calanderizationSummary.push({
          readDate: new Date(currentBill.readDate),
          energyUsePerDay: energyUsePerDayCurrentBill,
          calanderizationMonthOne: new Date(currentBill.readDate),
          calanderizationMonthTwo: new Date(nextBill.readDate),
          monthOneReading: (energyUsePerDayCurrentBill * daysAfterCurrentBill),
          monthTwoReading: (energyUsePerDayCurrentBill * numberOfDaysNextBill),
          monthOneDaysUsed: daysAfterCurrentBill,
          monthTwoDaysUsed: numberOfDaysNextBill
        });
      } else {
        calanderizationSummary.push({
          readDate: new Date(currentBill.readDate),
          energyUsePerDay: energyUsePerDayCurrentBill,
          calanderizationMonthOne: undefined,
          calanderizationMonthTwo: undefined,
          monthOneReading: undefined,
          monthTwoReading: undefined,
          monthOneDaysUsed: undefined,
          monthTwoDaysUsed: undefined
        });
      }
    }
    return calanderizationSummary;
    return;
  }

  calanderizationSummaryFullMonth(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>): Array<CalendarizationSummaryItem> {
    let calanderizationSummary: Array<CalendarizationSummaryItem> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    for (let meterIndex = 0; meterIndex < orderedMeterData.length; meterIndex++) {
      let currentBill: IdbUtilityMeterData = orderedMeterData[meterIndex];
      let totalMonthEnergyConsumption: number = 0;
      let totalMonthEnergyUse: number;

      //energy use
      let isEnergyMeter: boolean = this.energyUnitsHelperService.isEnergyMeter(meter.source);
      if (isEnergyMeter) {
        totalMonthEnergyUse = currentBill.totalEnergyUse;
      }
      //energy consumption (data input not as energy)
      let isEnergyUnit: boolean = this.energyUnitsHelperService.isEnergyUnit(meter.startingUnit);
      if (!isEnergyUnit) {
        totalMonthEnergyConsumption = currentBill.totalVolume;
      } else {
        totalMonthEnergyConsumption = totalMonthEnergyUse;
      }
      let startOfMonth: Date = new Date(currentBill.readDate);
      startOfMonth.setDate(1);
      let nextMonth: Date = new Date(startOfMonth.getUTCFullYear(), startOfMonth.getUTCMonth() + 1, 1);
      let daysInMonth: number = this.daysBetweenDates(startOfMonth, nextMonth);

      calanderizationSummary.push({
        readDate: new Date(currentBill.readDate),
        energyUsePerDay: totalMonthEnergyConsumption / daysInMonth,
        calanderizationMonthOne: new Date(currentBill.readDate),
        calanderizationMonthTwo: undefined,
        monthOneReading: totalMonthEnergyConsumption,
        monthTwoReading: undefined,
        monthOneDaysUsed: daysInMonth,
        monthTwoDaysUsed: undefined
      });
    }
    return calanderizationSummary;
  }
}


export interface CalendarizationSummaryItem {
  readDate: Date,
  energyUsePerDay: number,
  calanderizationMonthOne: Date,
  calanderizationMonthTwo: Date,
  monthOneReading: number,
  monthTwoReading: number,
  monthOneDaysUsed: number,
  monthTwoDaysUsed: number
}