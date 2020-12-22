import { Injectable } from '@angular/core';
import { IdbUtilityMeter } from 'src/app/models/idb';
import { CalanderizationService, CalanderizedMeter, MonthlyData } from '../calanderization/calanderization.service';
import * as _ from 'lodash';
@Injectable({
  providedIn: 'root'
})
export class VisualizationService {

  constructor(private calanderizationService: CalanderizationService) { }

  getFacilityBarChartData(meters: Array<IdbUtilityMeter>, sumByMonth: boolean, removeIncompleteYears: boolean): Array<{ time: string, energyUse: number, energyCost: number }> {
    //calanderize meters
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.calanderizeFacilityMeters(meters, true);
    //TODO: convert data here?

    //create array of just the meter data
    let combindedCalanderizedMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => {
      return meterData.monthlyData;
    });
    //create array of the uniq months and years
    let yearMonths: Array<{ year: number, month: string }> = combindedCalanderizedMeterData.map(data => { return { year: data.year, month: data.month } });
    let resultData: Array<{ time: string, energyUse: number, energyCost: number }> = new Array();
    //iterate array of uniq months and years and sum energy/cost
    if (sumByMonth) {
      yearMonths = _.uniqWith(yearMonths, (a, b) => {
        return (a.year == b.year && a.month == b.month)
      });
      resultData = yearMonths.map(yearMonth => {
        let totalEnergyUse: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.month == yearMonth.month && meterData.year == yearMonth.year) {
            return meterData.energyUse;
          } else {
            return 0;
          }
        });
        let totalEnergyCost: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.month == yearMonth.month && meterData.year == yearMonth.year) {
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
    } else {
      if (removeIncompleteYears) {
        yearMonths = _.uniqWith(yearMonths, (a, b) => {
          return (a.year == b.year && a.month == b.month)
        });
        //remove data without 12 months for the year
        //TODO: Make optional?
        let counts = _.countBy(yearMonths, 'year');
        yearMonths = yearMonths.filter(yearMonthItem => { return counts[yearMonthItem.year] == 12 })
      }
      yearMonths = _.uniqWith(yearMonths, (a, b) => {
        return (a.year == b.year)
      });
      resultData = yearMonths.map(yearMonth => {
        let totalEnergyUse: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.year == yearMonth.year) {
            return meterData.energyUse;
          } else {
            return 0;
          }
        });
        let totalEnergyCost: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.year == yearMonth.year) {
            return meterData.energyCost;
          } else {
            return 0;
          }
        });
        return {
          time: String(yearMonth.year),
          energyUse: totalEnergyUse,
          energyCost: totalEnergyCost
        }
      });
    }
    return resultData;
  }

  getMeterHeatMapData(meters: Array<IdbUtilityMeter>, facilityName: string, removeIncompleteYears: boolean): HeatMapData {
    let months: Array<string> = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    //calanderize meters
    let calanderizedMeterData: Array<CalanderizedMeter> = this.calanderizationService.calanderizeFacilityMeters(meters);
    //TODO: convert data here?

    //create array of just the meter data
    let combindedCalanderizedMeterData: Array<MonthlyData> = calanderizedMeterData.flatMap(meterData => {
      return meterData.monthlyData;
    });
    let yearMonths = combindedCalanderizedMeterData.map(data => { return { year: data.year, month: data.month } });
    if (removeIncompleteYears) {
      yearMonths = _.uniqWith(yearMonths, (a, b) => {
        return (a.year == b.year && a.month == b.month)
      });
      //remove data without 12 months for the year
      //TODO: Make optional?
      let counts = _.countBy(yearMonths, 'year');
      yearMonths = yearMonths.filter(yearMonthItem => { return counts[yearMonthItem.year] == 12 })
    }
    //create array of the uniq months and years
    let years: Array<number> = yearMonths.map(data => { return data.year });
    years = _.uniq(years);
    years = _.orderBy(years, (year) => { return year }, ['asc', 'desc']);
    let resultData: Array<{ monthlyEnergy: Array<number>, monthlyCost: Array<number> }> = new Array();
    years.forEach(year => {
      let yearData: { monthlyEnergy: Array<number>, monthlyCost: Array<number> } = { monthlyEnergy: new Array(), monthlyCost: new Array() };
      months.forEach(month => {
        let totalCost: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.year == year && meterData.month == month) {
            return meterData.energyUse;
          } else {
            return 0;
          }
        });
        let totalEnergy: number = _.sumBy(combindedCalanderizedMeterData, (meterData: MonthlyData) => {
          if (meterData.year == year && meterData.month == month) {
            return meterData.energyUse;
          } else {
            return 0;
          }
        });
        yearData.monthlyCost.push(totalCost)
        yearData.monthlyEnergy.push(totalEnergy);
      });
      resultData.push(yearData);
    });
    return {
      months: months,
      years: years,
      resultData: resultData,
      facilityName: facilityName
    }
  }

  getSackedAreaChartData() {

  }
}


export interface HeatMapData {
  resultData: Array<{ monthlyEnergy: Array<number>, monthlyCost: Array<number> }>,
  months: Array<string>,
  years: Array<number>,
  facilityName: string
}