import { Injectable } from '@angular/core';
import { FacilitydbService } from '../indexedDB/facility-db.service';
import { UtilityMeterdbService } from '../indexedDB/utilityMeter-db.service';
import { IdbFacility, IdbUtilityMeter } from '../models/idb';
import { VisualizationService } from '../utility/visualization/visualization.service';
import * as _ from 'lodash';
import { CalanderizationService, CalanderizedMeter, MonthlyData } from '../utility/calanderization/calanderization.service';
@Injectable({
  providedIn: 'root'
})
export class DashboardService {

  constructor(private facilityDbService: FacilitydbService, private utilityMeterDbService: UtilityMeterdbService, private visualizationService: VisualizationService,
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
      lastMonth = 12;
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
      if(data.energyUse){
        totalEnergyUse += data.energyUse;
      }
      if(data.energyCost){
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
}

export interface FacilitySummary {
  facility: IdbFacility,
  energyUsage: number,
  energyCost: number,
  numberOfMeters: number,
  lastBillDate: Date
}