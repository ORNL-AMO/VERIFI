import { CalanderizedMeter, LastYearData, MonthlyData } from "src/app/models/calanderization";
import * as _ from 'lodash';
import { IdbUtilityMeter } from "src/app/models/idb";
import { ReportOptions } from "src/app/models/overview-report";

export function getLastBillEntryFromCalanderizedMeterData(calanderizedMeterData: Array<CalanderizedMeter>, monthlyData?: Array<MonthlyData>): MonthlyData {
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


export function getPastYearData(yearEndBill: MonthlyData, calanderizedMeterData: Array<CalanderizedMeter>): {
    yearData: Array<LastYearData>,
    energyUsage: number,
    energyCost: number,
    marketEmissions: number,
    locationEmissions: number
} {
    let energyUsage: number = 0;
    let energyCost: number = 0;
    let marketEmissions: number = 0;
    let locationEmissions: number = 0;
    if (yearEndBill) {
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
            let totalEnergyUse: number = 0;
            let totalEnergyConsumption: number = 0;
            let totalEnergyCost: number = 0;
            let totalLocationEmissions: number = 0;
            let totalMarketEmissions: number = 0;
            let RECs: number = 0;
            let excessRECsEmissions: number = 0;
            let excessRECs: number = 0;
            for (let i = 0; i < combindedCalanderizedMeterData.length; i++) {
                let meterData: MonthlyData = combindedCalanderizedMeterData[i];
                if (meterData.monthNumValue == yearMonth.month && meterData.year == yearMonth.year) {
                    totalEnergyUse += getSumValue(meterData.energyUse);
                    totalEnergyConsumption += getSumValue(meterData.energyConsumption);
                    totalEnergyCost += getSumValue(meterData.energyCost);
                    totalLocationEmissions += getSumValue(meterData.locationEmissions);
                    totalMarketEmissions += getSumValue(meterData.marketEmissions);
                    RECs += getSumValue(meterData.RECs);
                    excessRECsEmissions += getSumValue(meterData.excessRECsEmissions);
                    excessRECs += getSumValue(meterData.excessRECs);
                }
            }
            energyUsage += totalEnergyUse;
            energyCost += totalEnergyCost;
            marketEmissions += totalMarketEmissions;
            locationEmissions += locationEmissions;
            return {
                time: yearMonth.month + ', ' + yearMonth.year,
                energyUse: totalEnergyUse,
                energyCost: totalEnergyCost,
                energyConsumption: totalEnergyConsumption,
                year: yearMonth.year,
                month: yearMonth.month,
                date: new Date(yearMonth.year, yearMonth.month),
                marketEmissions: totalMarketEmissions,
                locationEmissions: totalLocationEmissions,
                RECs: RECs,
                excessRECs: excessRECs,
                excessRECsEmissions: excessRECsEmissions
            }

        });
        return {
            yearData: resultData,
            energyUsage: energyUsage,
            energyCost: energyCost,
            marketEmissions: marketEmissions,
            locationEmissions: locationEmissions
        };
    } else {
        return {
            yearData: new Array(),
            energyUsage: energyUsage,
            energyCost: energyCost,
            marketEmissions: marketEmissions,
            locationEmissions: locationEmissions
        };
    }
}

export function getSumValue(val: number): number {
    if (isNaN(val) == false) {
        return val;
    } else {
        return 0;
    }
}


export function   getYearPriorBillEntryFromCalanderizedMeterData(calanderizedMeterData: Array<CalanderizedMeter>, lastBill: MonthlyData): Array<MonthlyData> {
    let monthlyData: Array<MonthlyData> = calanderizedMeterData.flatMap(data => {
      return data.monthlyData;
    });
    if (lastBill) {
      let yearPrior: number = lastBill.year - 1;
      let yearPriorBill: Array<MonthlyData> = monthlyData.filter(dataItem => {
        return (dataItem.year == yearPrior) && (dataItem.monthNumValue == lastBill.monthNumValue);
      });
      return yearPriorBill;
    } else {
      return undefined;
    }
  }