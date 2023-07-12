import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import * as _ from 'lodash';
import { YearMonthData } from "src/app/models/dashboard";
import { IdbAccount, IdbFacility } from "src/app/models/idb";

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

export function getFirstBillEntryFromCalanderizedMeterData(calanderizedMeterData: Array<CalanderizedMeter>, monthlyData?: Array<MonthlyData>): MonthlyData {
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


export function getSumValue(val: number): number {
    if (isNaN(val) == false) {
        return val;
    } else {
        return 0;
    }
}

export function getYearlyUsageNumbers(calanderizedMeters: Array<CalanderizedMeter>): Array<YearMonthData> {
    let monthlyData: Array<MonthlyData> = calanderizedMeters.flatMap(cMeter => {
        return cMeter.monthlyData;
    });
    let years: Array<number> = monthlyData.map(data => { return data.fiscalYear });
    years = _.uniq(years);

    let yearMonthData: Array<YearMonthData> = new Array();
    years.forEach(year => {
        let yearData: Array<MonthlyData> = monthlyData.filter(data => {
            return data.fiscalYear == year;
        });
        let months: Array<string> = yearData.map(data => { return data.month });
        months = _.uniq(months)
        months.forEach(month => {
            let energyUse: number = 0;
            let energyCost: number = 0;
            let marketEmissions: number = 0;
            let locationEmissions: number = 0;
            let consumption: number = 0;
            for (let i = 0; i < yearData.length; i++) {
                if (yearData[i].month == month) {
                    energyUse += yearData[i].energyUse;
                    energyCost += yearData[i].energyCost;
                    marketEmissions += yearData[i].marketEmissions;
                    locationEmissions += yearData[i].locationEmissions;
                    consumption += yearData[i].energyConsumption;
                }
            }
            yearMonthData.push({
                yearMonth: { year: year, month: month, fiscalYear: year },
                energyUse: energyUse,
                energyCost: energyCost,
                marketEmissions: marketEmissions,
                locationEmissions: locationEmissions,
                consumption: consumption
            })
        })
    });
    return yearMonthData;
}


export function getFiscalYear(date: Date, facilityOrAccount: IdbFacility | IdbAccount): number {
    if (facilityOrAccount.fiscalYear == 'calendarYear') {
        return date.getUTCFullYear();
    } else {
        if (facilityOrAccount.fiscalYearCalendarEnd) {
            if (date.getUTCMonth() >= facilityOrAccount.fiscalYearMonth) {
                return date.getUTCFullYear() + 1;
            } else {
                return date.getUTCFullYear();
            }
        } else {
            if (date.getUTCMonth() >= facilityOrAccount.fiscalYearMonth) {
                return date.getUTCFullYear();
            } else {
                return date.getUTCFullYear() - 1;
            }
        }
    }
}