import { Injectable } from '@angular/core';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter, IdbUtilityMeterGroup } from '../models/idb';
import * as _ from 'lodash';
import { CalanderizationService } from '../shared/helper-services/calanderization.service';
import { UtilityMeterGroupdbService } from '../indexedDB/utilityMeterGroup-db.service';
import { FacilitySummary, MeterSummary, SummaryData, UtilityUsageSummaryData } from '../models/dashboard';
import { CalanderizedMeter, MonthlyData } from '../models/calanderization';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  constructor(private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService,
    private calanderizationService: CalanderizationService, private utilityMeterGroupDbService: UtilityMeterGroupdbService) { }

  getAccountFacilitesSummary(): Array<FacilitySummary> {
    let facilitiesSummary: Array<FacilitySummary> = new Array();
    let facilities: Array<IdbFacility> = this.facilityDbService.accountFacilities.getValue();
    facilities.forEach(facility => {
      let facilityMeterSummary: FacilitySummary = this.getFacilitySummary(facility, true);
      facilitiesSummary.push(facilityMeterSummary);
    });
    return facilitiesSummary;
  }

  getFacilitySummary(facility: IdbFacility, inAccount: boolean): FacilitySummary {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMetersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.id });
    if (facilityMeters.length != 0) {
      let lastBill: MonthlyData = this.calanderizationService.getLastBillEntry(facilityMeters, inAccount);
      let facilityMetersDataSummary: Array<{ time: string, energyUse: number, energyCost: number }> = this.calanderizationService.getPastYearData(facilityMeters, inAccount, lastBill);
      return {
        facility: facility,
        energyUsage: _.sumBy(facilityMetersDataSummary, 'energyUse'),
        energyCost: _.sumBy(facilityMetersDataSummary, 'energyCost'),
        numberOfMeters: facilityMeters.length,
        lastBillDate: new Date(lastBill.year, (lastBill.monthNumValue))
      }
    } else {
      return {
        facility: facility,
        energyCost: 0,
        energyUsage: 0,
        numberOfMeters: 0,
        lastBillDate: undefined
      }
    }
  }

  // getLastBillEntry(facilityMeters: Array<IdbUtilityMeter>, inAccount: boolean): MonthlyData {
  //   let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(facilityMeters, inAccount, false);
  //   let lastBill: MonthlyData = this.getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData);
  //   return lastBill;
  // }

  // getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData: Array<CalanderizedMeter>): MonthlyData {
  //   let monthlyData: Array<MonthlyData> = calanderizedMeterData.flatMap(data => {
  //     return data.monthlyData;
  //   })
  //   let lastBill: MonthlyData = _.maxBy(monthlyData, (data: MonthlyData) => {
  //     let date = new Date();
  //     date.setFullYear(data.year, data.monthNumValue);
  //     return date;
  //   });
  //   return lastBill;
  // }

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


  getLastMonthsEnergyUseAndCost(facility: IdbFacility, inAccount: boolean): { energyUse: number, energyCost: number } {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMetersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.id });
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(facilityMeters, inAccount, false);
    let lastMonthYear: { lastMonth: number, lastMonthYear: number } = this.getLastMonthYear();
    let totalEnergyUse: number = 0;
    let totalEnergyCost: number = 0;
    calanderizedMeterData.forEach(meter => {
      let previousMonthData: MonthlyData = meter.monthlyData.find(data => { return data.monthNumValue == lastMonthYear.lastMonth && data.year == lastMonthYear.lastMonthYear });
      if (previousMonthData) {
        totalEnergyUse += previousMonthData.energyConsumption;
        totalEnergyCost += previousMonthData.energyCost;
      }
    });
    return { energyUse: totalEnergyUse, energyCost: totalEnergyCost };
  }

  getFacilitiesUtilityUsageSummaryData(facilities: Array<IdbFacility>, inAccount: boolean): UtilityUsageSummaryData {
    let accountUtilitySummaries: Array<SummaryData> = new Array();
    let facilitySummaries: Array<UtilityUsageSummaryData> = new Array();
    facilities.forEach(facility => {
      let utilityUsageSummaryData: UtilityUsageSummaryData = this.getFacilityUtilityUsageSummaryData(facility, inAccount);
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

  //get utility usage summaries for facility
  getFacilityUtilityUsageSummaryData(facility: IdbFacility, inAccount: boolean): UtilityUsageSummaryData {
    let accountMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.accountMeters.getValue();
    let accountMetersCopy: Array<IdbUtilityMeter> = JSON.parse(JSON.stringify(accountMeters));
    let facilityMeters: Array<IdbUtilityMeter> = accountMetersCopy.filter(meter => { return meter.facilityId == facility.id });
    let utilitySummaries: Array<SummaryData> = new Array();
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Electricity', facilityMeters, inAccount);
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Natural Gas', facilityMeters, inAccount);
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Other Fuels', facilityMeters, inAccount);
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Other Energy', facilityMeters, inAccount);
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Water', facilityMeters, inAccount);
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Waste Water', facilityMeters, inAccount);
    utilitySummaries = this.getMetersSummaryByUtility(utilitySummaries, 'Other Utility', facilityMeters, inAccount);
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

  getMetersSummaryByUtility(utilitySummaries: Array<SummaryData>, utilityType: string, facilityMeters: Array<IdbUtilityMeter>, inAccount: boolean): Array<SummaryData>{
    let utilitySummary: SummaryData = this.getMetersSummary(facilityMeters, utilityType, inAccount);
    if (utilitySummary.lastBillDate) {
      utilitySummaries.push(utilitySummary);
    }
    return utilitySummaries;
  }


  getMetersSummary(facilityMeters: Array<IdbUtilityMeter>, utility: string, inAccount: boolean): SummaryData {
    let utilityMeters: Array<IdbUtilityMeter> = facilityMeters.filter(meter => { return meter.source == utility });
    if (utilityMeters.length != 0) {
      let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.getCalanderizedMeterData(facilityMeters, inAccount, false);
      let monthlyData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => { return meterData.monthlyData });
      let totalEnergyUse: number = 0;
      let totalEnergyCost: number = 0;
      //sum totals
      monthlyData.forEach(data => {
        if (data.energyConsumption) {
          totalEnergyUse += data.energyConsumption;
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
          previousMonthEnergyUse += previousMonthData.energyConsumption;
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

  getFacilityMetersSummary(inAccount: boolean): Array<MeterSummary> {
    let facilityMetersSummary: Array<MeterSummary> = new Array();
    let facilityMeters: Array<IdbUtilityMeter> = this.utilityMeterDbService.facilityMeters.getValue();
    facilityMeters.forEach(meter => {
      let summary: MeterSummary = this.getMeterSummary(meter, inAccount);
      facilityMetersSummary.push(summary);
    });
    return facilityMetersSummary;
  }

  getMeterSummary(meter: IdbUtilityMeter, inAccount: boolean): MeterSummary {
    let lastBill: MonthlyData = this.calanderizationService.getLastBillEntry([meter], inAccount);
    let lastYearData: Array<{ time: string, energyUse: number, energyCost: number }> = this.calanderizationService.getPastYearData([meter], inAccount, lastBill);
    let lastBillDate: Date;
    if (lastBill) {
      lastBillDate = new Date(lastBill.year, (lastBill.monthNumValue));
    }

    let group: IdbUtilityMeterGroup = this.utilityMeterGroupDbService.getGroupById(meter.groupId);
    let groupName: string = 'Ungrouped';
    if (group) {
      groupName = group.name;
    }

    return {
      meter: meter,
      energyUsage: _.sumBy(lastYearData, 'energyUse'),
      energyCost: _.sumBy(lastYearData, 'energyCost'),
      lastBillDate: lastBillDate,
      groupName: groupName
    }
  }
}

