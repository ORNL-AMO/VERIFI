import { Injectable } from '@angular/core';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from '../models/idb';
import * as _ from 'lodash';
import { CalanderizationService, CalanderizedMeter, MonthlyData } from '../utility/calanderization/calanderization.service';
import { Summary } from '@angular/compiler';
@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  constructor(private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService,
    private calanderizationService: CalanderizationService) { }

  getAccountFacilitesSummary(): Array<FacilitySummary> {
    let facilitiesSummary: Array<FacilitySummary> = new Array();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    facilities.forEach(facility => {
      let facilityMeterSummary: FacilitySummary = this.getFacilitySummary(facility);
      facilitiesSummary.push(facilityMeterSummary);
    });
    return facilitiesSummary;
  }

  getFacilitySummary(facility: IdbFacility): FacilitySummary {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMetersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.id });
    let facilityMetersDataSummary: Array<{ time: string, energyUse: number, energyCost: number }> = this.getPastYearData(facilityMeters);
    let lastBill: MonthlyData = this.getLastBillEntry(facilityMeters);

    return {
      facility: facility,
      energyUsage: _.sumBy(facilityMetersDataSummary, 'energyUse'),
      energyCost: _.sumBy(facilityMetersDataSummary, 'energyCost'),
      numberOfMeters: facilityMeters.length,
      lastBillDate: new Date(lastBill.year, (lastBill.monthNumValue))
    }
  }

  getPastYearData(meters: Array<IdbUtilityMeter>): Array<{ time: string, energyUse: number, energyCost: number }> {
    //calanderize meters
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.calanderizeFacilityMeters(meters, false);
    //TODO: convert data here?

    //create array of just the meter data
    let combindedCalanderizedMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => {
      return meterData.monthlyData;
    });
    //create array of the uniq months and years
    let yearMonths: Array<{ year: number, month: number }> = combindedCalanderizedMeterData.map(data => { return { year: data.year, month: data.monthNumValue } });
    let resultData: Array<{ time: string, energyUse: number, energyCost: number }> = new Array();
    yearMonths = _.uniqWith(yearMonths, (a, b) => {
      return (a.year == b.year && a.month == b.month)
    });
    //filter year/months over a year old
    let todaysDate: Date = new Date();
    let oneYearAgo: number = todaysDate.getFullYear() - 1;
    let month: number = todaysDate.getMonth();
    yearMonths = _.filter(yearMonths, yearMonth => {
      if (yearMonth.year >= oneYearAgo) {
        let monthTest: number = yearMonth.month - month;
        if (monthTest >= 0) {
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
        energyCost: totalEnergyCost
      }

    });
    return resultData;
  }

  getLastBillEntry(facilityMeters: Array<IdbUtilityMeter>): MonthlyData {
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.calanderizeFacilityMeters(facilityMeters, false);
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

  getLastMonthYear(): { lastMonth: number, lastMonthYear: number } {
    let todaysDate: Date = new Date();
    let lastMonth: number;
    let lastMonthYear: number;
    if (todaysDate.getMonth() == 0) {
      lastMonth = 11;
      lastMonthYear = todaysDate.getFullYear() - 1;
    } else {
      lastMonth = todaysDate.getMonth() - 1;
      lastMonthYear = todaysDate.getFullYear();
    }
    return { lastMonth: lastMonth, lastMonthYear: lastMonthYear };
  }


  getLastMonthsEnergyUseAndCost(facility: IdbFacility): { energyUse: number, energyCost: number } {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMetersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.id });
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.calanderizeFacilityMeters(facilityMeters, false);

    let lastMonthYear: { lastMonth: number, lastMonthYear: number } = this.getLastMonthYear();

    let totalEnergyUse: number = 0;
    let totalEnergyCost: number = 0;
    calanderizedMeterData.forEach(meter => {
      let previousMonthData: MonthlyData = meter.monthlyData.find(data => { return data.monthNumValue == lastMonthYear.lastMonth && data.year == lastMonthYear.lastMonthYear });
      if (previousMonthData) {
        totalEnergyUse += previousMonthData.energyUse;
        totalEnergyCost += previousMonthData.energyCost;
      }
    });
    return { energyUse: totalEnergyUse, energyCost: totalEnergyCost };
  }

  getFacilitiesUtilityUsageSummaryData(facilities: Array<IdbFacility>): UtilityUsageSummaryData {
    let accountUtilitySummaries: Array<SummaryData> = new Array();
    let facilitySummaries: Array<UtilityUsageSummaryData> = new Array();
    facilities.forEach(facility => {
      let utilityUsageSummaryData: UtilityUsageSummaryData = this.getFacilityUtilityUsageSummaryData(facility);
      facilitySummaries.push(utilityUsageSummaryData);
    });
    let utilitySummaries: Array<SummaryData> = facilitySummaries.flatMap(summary => { return summary.utilitySummaries });
    // electricity
    let electricitySummaries: Array<SummaryData> = utilitySummaries.filter(summary => { return summary.utility == 'Electricity' });
    if (electricitySummaries.length != 0) {
      let dates: Array<Date> = electricitySummaries.map(summary => { return summary.lastBillDate });
      let summaryData: SummaryData = {
        lastBillDate: _.max(dates),
        previousMonthEnergyUse: _.sumBy(electricitySummaries, 'previousMonthEnergyUse'),
        previousMonthEnergyCost: _.sumBy(electricitySummaries, 'previousMonthEnergyCost'),
        averageEnergyUse: _.sumBy(electricitySummaries, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(electricitySummaries, 'averageEnergyCost'),
        utility: 'Electricity'
      }
      accountUtilitySummaries.push(summaryData);
    }
    // naturalGas
    let naturalGasSummary: Array<SummaryData> = utilitySummaries.filter(summary => { return summary.utility == 'Natural Gas' });
    if (naturalGasSummary.length != 0) {
      let dates: Array<Date> = naturalGasSummary.map(summary => { return summary.lastBillDate });
      let summaryData: SummaryData = {
        lastBillDate: _.max(dates),
        previousMonthEnergyUse: _.sumBy(naturalGasSummary, 'previousMonthEnergyUse'),
        previousMonthEnergyCost: _.sumBy(naturalGasSummary, 'previousMonthEnergyCost'),
        averageEnergyUse: _.sumBy(naturalGasSummary, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(naturalGasSummary, 'averageEnergyCost'),
        utility: 'Natural Gas'
      }
      accountUtilitySummaries.push(summaryData);
    }
    // otherFuels
    let otherFuelsSummary: Array<SummaryData> = utilitySummaries.filter(summary => { return summary.utility == 'Other Fuels' });
    if (otherFuelsSummary.length != 0) {
      let dates: Array<Date> = utilitySummaries.map(summary => { return summary.lastBillDate });
      let summaryData: SummaryData = {
        lastBillDate: _.max(dates),
        previousMonthEnergyUse: _.sumBy(otherFuelsSummary, 'previousMonthEnergyUse'),
        previousMonthEnergyCost: _.sumBy(otherFuelsSummary, 'previousMonthEnergyCost'),
        averageEnergyUse: _.sumBy(otherFuelsSummary, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(otherFuelsSummary, 'averageEnergyCost'),
        utility: 'Other Fuels'
      }
      accountUtilitySummaries.push(summaryData);
    }
    // otherEnergy
    let otherEnergySummary: Array<SummaryData> = utilitySummaries.filter(summary => { return summary.utility == 'Other Energy' });
    if (otherEnergySummary.length != 0) {
      let dates: Array<Date> = otherEnergySummary.map(summary => { return summary.lastBillDate });
      let summaryData: SummaryData = {
        lastBillDate: _.max(dates),
        previousMonthEnergyUse: _.sumBy(otherEnergySummary, 'previousMonthEnergyUse'),
        previousMonthEnergyCost: _.sumBy(otherEnergySummary, 'previousMonthEnergyCost'),
        averageEnergyUse: _.sumBy(otherEnergySummary, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(otherEnergySummary, 'averageEnergyCost'),
        utility: 'Other Energy'
      }
      accountUtilitySummaries.push(summaryData);
    }
    // water
    let waterSummary: Array<SummaryData> = utilitySummaries.filter(summary => { return summary.utility == 'Water' });
    if (waterSummary.length != 0) {
      let dates: Array<Date> = waterSummary.map(summary => { return summary.lastBillDate });
      let summaryData: SummaryData = {
        lastBillDate: _.max(dates),
        previousMonthEnergyUse: _.sumBy(waterSummary, 'previousMonthEnergyUse'),
        previousMonthEnergyCost: _.sumBy(waterSummary, 'previousMonthEnergyCost'),
        averageEnergyUse: _.sumBy(waterSummary, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(waterSummary, 'averageEnergyCost'),
        utility: 'Water'
      }
      accountUtilitySummaries.push(summaryData);
    }
    // wasteWater
    let wasteWaterSummary: Array<SummaryData> = utilitySummaries.filter(summary => { return summary.utility == 'Waste Water' });
    if (wasteWaterSummary.length != 0) {
      let dates: Array<Date> = wasteWaterSummary.map(summary => { return summary.lastBillDate });
      let summaryData: SummaryData = {
        lastBillDate: _.max(dates),
        previousMonthEnergyUse: _.sumBy(wasteWaterSummary, 'previousMonthEnergyUse'),
        previousMonthEnergyCost: _.sumBy(wasteWaterSummary, 'previousMonthEnergyCost'),
        averageEnergyUse: _.sumBy(wasteWaterSummary, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(wasteWaterSummary, 'averageEnergyCost'),
        utility: 'Waste Water'
      }
      accountUtilitySummaries.push(summaryData);
    }
    // otherUtility
    let otherUtilitySummary: Array<SummaryData> = utilitySummaries.filter(summary => { return summary.utility == 'Other Utility' });
    if (otherUtilitySummary.length != 0) {
      let dates: Array<Date> = otherUtilitySummary.map(summary => { return summary.lastBillDate });
      let summaryData: SummaryData = {
        lastBillDate: _.max(dates),
        previousMonthEnergyUse: _.sumBy(otherUtilitySummary, 'previousMonthEnergyUse'),
        previousMonthEnergyCost: _.sumBy(otherUtilitySummary, 'previousMonthEnergyCost'),
        averageEnergyUse: _.sumBy(otherUtilitySummary, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(otherUtilitySummary, 'averageEnergyCost'),
        utility: 'Other Utility'
      }
      accountUtilitySummaries.push(summaryData);
    }
    return {
      utilitySummaries: utilitySummaries,
      total: {
        lastBillDate: _.maxBy(utilitySummaries, 'lastBillDate'),
        previousMonthEnergyUse: _.sumBy(utilitySummaries, 'previousMonthEnergyUse'),
        previousMonthEnergyCost: _.sumBy(utilitySummaries, 'previousMonthEnergyCost'),
        averageEnergyUse: _.sumBy(utilitySummaries, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(utilitySummaries, 'averageEnergyCost'),
        utility: 'Total'
      }
    }
  }


  //
  getFacilityUtilityUsageSummaryData(facility: IdbFacility): UtilityUsageSummaryData {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMetersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.id });
    let utilitySummaries: Array<SummaryData> = new Array();
    // electricity
    let electricitySummary: SummaryData = this.getMetersSummary(facilityMeters, 'Electricity');
    if (electricitySummary.lastBillDate) {
      utilitySummaries.push(electricitySummary);
    }
    // naturalGas
    let naturalGasSummary: SummaryData = this.getMetersSummary(facilityMeters, 'Natural Gas');
    if (naturalGasSummary.lastBillDate) {
      utilitySummaries.push(naturalGasSummary);
    }
    // otherFuels
    let otherFuelsSummary: SummaryData = this.getMetersSummary(facilityMeters, 'Other Fuels');
    if (otherFuelsSummary.lastBillDate) {
      utilitySummaries.push(otherFuelsSummary);
    }
    // otherEnergy
    let otherEnergySummary: SummaryData = this.getMetersSummary(facilityMeters, 'Other Energy');
    if (otherEnergySummary.lastBillDate) {
      utilitySummaries.push(otherEnergySummary);
    }
    // water
    let waterSummary: SummaryData = this.getMetersSummary(facilityMeters, 'Water');
    if (waterSummary.lastBillDate) {
      utilitySummaries.push(waterSummary);
    }
    // wasteWater
    let wasteWaterSummary: SummaryData = this.getMetersSummary(facilityMeters, 'Waste Water');
    if (wasteWaterSummary.lastBillDate) {
      utilitySummaries.push(wasteWaterSummary);
    }
    // otherUtility
    let otherUtilitySummary: SummaryData = this.getMetersSummary(facilityMeters, 'Other Utility');
    if (otherUtilitySummary.lastBillDate) {
      utilitySummaries.push(otherUtilitySummary);
    }
    return {
      utilitySummaries: utilitySummaries,
      total: {
        lastBillDate: _.maxBy(utilitySummaries, 'lastBillDate'),
        previousMonthEnergyUse: _.sumBy(utilitySummaries, 'previousMonthEnergyUse'),
        previousMonthEnergyCost: _.sumBy(utilitySummaries, 'previousMonthEnergyCost'),
        averageEnergyUse: _.sumBy(utilitySummaries, 'averageEnergyUse'),
        averageEnergyCost: _.sumBy(utilitySummaries, 'averageEnergyCost'),
        utility: 'Total'
      }
    }
  }


  getMetersSummary(facilityMeters: Array<IdbUtilityMeter>, utility: string): SummaryData {
    let utilityMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == utility });
    if (utilityMeters.length != 0) {
      let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.calanderizeFacilityMeters(utilityMeters, false);
      let monthlyData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => { return meterData.monthlyData });
      let totalEnergyUse: number = 0;
      let totalEnergyCost: number = 0;
      //sum totals
      monthlyData.forEach(data => {
        if (data.energyUse) {
          totalEnergyUse += data.energyUse;
        }
        if (data.energyCost) {
          totalEnergyCost += data.energyCost;
        }
      });

      //create array of the uniq months and years
      let yearMonths: Array<{ year: number, month: number }> = monthlyData.map(data => { return { year: data.year, month: data.monthNumValue } });
      yearMonths = _.uniqWith(yearMonths, (a, b) => {
        return (a.year == b.year && a.month == b.month)
      });
      //divide by total uniq months/years for average
      let averageEnergyUse: number = (totalEnergyUse / yearMonths.length);
      let averageEnergyCost: number = (totalEnergyCost / yearMonths.length);

      let lastMonthYear: { lastMonth: number, lastMonthYear: number } = this.getLastMonthYear();

      let previousMonthEnergyUse: number = 0;
      let previousMonthEnergyCost: number = 0;
      calanderizedMeterData.forEach(meter => {
        let previousMonthData: MonthlyData = meter.monthlyData.find(data => { return data.monthNumValue == lastMonthYear.lastMonth && data.year == lastMonthYear.lastMonthYear });
        if (previousMonthData) {
          previousMonthEnergyUse += previousMonthData.energyUse;
          previousMonthEnergyCost += previousMonthData.energyCost;
        }
      });


      let lastBill: MonthlyData = _.maxBy(monthlyData, (data: MonthlyData) => {
        let date = new Date();
        date.setFullYear(data.year, data.monthNumValue);
        return date;
      });

      return {
        lastBillDate: new Date(lastBill.year, lastBill.monthNumValue),
        previousMonthEnergyUse: previousMonthEnergyUse,
        previousMonthEnergyCost: previousMonthEnergyCost,
        averageEnergyUse: averageEnergyUse,
        averageEnergyCost: averageEnergyCost,
        utility: utility
      };
    } else {
      return {
        lastBillDate: undefined,
        previousMonthEnergyUse: 0,
        previousMonthEnergyCost: 0,
        averageEnergyUse: 0,
        averageEnergyCost: 0,
        utility: utility
      }
    }
  }




  getAverageEnergyUseAndCost(facility: IdbFacility): { energyUse: number, energyCost: number } {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMetersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.id });
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.calanderizeFacilityMeters(facilityMeters, false);
    let monthlyData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => { return meterData.monthlyData });
    let totalEnergyUse: number = 0;
    let totalEnergyCost: number = 0;
    //sum totals
    monthlyData.forEach(data => {
      if (data.energyUse) {
        totalEnergyUse += data.energyUse;
      }
      if (data.energyCost) {
        totalEnergyCost += data.energyCost;
      }
    });

    //create array of the uniq months and years
    let yearMonths: Array<{ year: number, month: number }> = monthlyData.map(data => { return { year: data.year, month: data.monthNumValue } });
    yearMonths = _.uniqWith(yearMonths, (a, b) => {
      return (a.year == b.year && a.month == b.month)
    });
    //divide by total uniq months/years for average
    let averageEnergyUse: number = (totalEnergyUse / yearMonths.length);
    let averageEnergyCost: number = (totalEnergyCost / yearMonths.length);
    return { energyUse: averageEnergyUse, energyCost: averageEnergyCost };
  }


  getFacilityMetersSummary(): Array<MeterSummary> {
    let facilityMetersSummary: Array<MeterSummary> = new Array();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    facilityMeters.forEach(meter => {
      let summary: MeterSummary = this.getMeterSummary(meter);
      facilityMetersSummary.push(summary);
    });
    return facilityMetersSummary;
  }

  getMeterSummary(meter: IdbUtilityMeter): MeterSummary {
    let lastYearData: Array<{ time: string, energyUse: number, energyCost: number }> = this.getPastYearData([meter]);
    let lastMonthBill: MonthlyData = this.getLastBillEntry([meter]);
    let lastBillDate: Date;
    if (lastMonthBill) {
      lastBillDate = new Date(lastMonthBill.year, (lastMonthBill.monthNumValue));
    }
    return {
      meter: meter,
      energyUsage: _.sumBy(lastYearData, 'energyUse'),
      energyCost: _.sumBy(lastYearData, 'energyCost'),
      lastBillDate: lastBillDate
    }
  }
}

export interface FacilitySummary {
  facility: IdbFacility,
  energyUsage: number,
  energyCost: number,
  numberOfMeters: number,
  lastBillDate: Date
}


export interface MeterSummary {
  meter: IdbUtilityMeter,
  energyUsage: number,
  energyCost: number,
  lastBillDate: Date
}


export interface UtilityUsageSummaryData {
  utilitySummaries: Array<SummaryData>
  total: SummaryData
}

export interface SummaryData {
  lastBillDate: Date,
  previousMonthEnergyUse: number,
  previousMonthEnergyCost: number,
  averageEnergyUse: number,
  averageEnergyCost: number,
  utility: string
}