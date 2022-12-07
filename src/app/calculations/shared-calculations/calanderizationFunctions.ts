import { CalanderizedMeter, LastYearData, MonthlyData } from "src/app/models/calanderization";
import * as _ from 'lodash';
import { SummaryData, UtilityUsageSummaryData, YearMonthData } from "src/app/models/dashboard";
import { IdbAccount, IdbFacility, MeterSource } from "src/app/models/idb";

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


export function getPastYearData(yearEndBill: MonthlyData, calanderizedMeterData: Array<CalanderizedMeter>): LastYearDataResult {
    let energyUsage: number = 0;
    let energyCost: number = 0;
    let marketEmissions: number = 0;
    let locationEmissions: number = 0;
    let consumption: number = 0;
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
            locationEmissions += totalLocationEmissions;
            consumption += totalEnergyConsumption;
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
            locationEmissions: locationEmissions,
            consumption: consumption
        };
    } else {
        return {
            yearData: new Array(),
            energyUsage: energyUsage,
            energyCost: energyCost,
            marketEmissions: marketEmissions,
            locationEmissions: locationEmissions,
            consumption: consumption
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


export function getYearPriorBillEntryFromCalanderizedMeterData(calanderizedMeterData: Array<CalanderizedMeter>, lastBill: MonthlyData): Array<MonthlyData> {
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



export function getUtilityUsageSummaryData(calanderizedMeters: Array<CalanderizedMeter>, allMetersLastBill: MonthlyData, sources: Array<MeterSource>): UtilityUsageSummaryData {
    let utilitiesSummary: Array<SummaryData> = new Array();

    sources.forEach(source => {
        let sourceMeters: Array<CalanderizedMeter> = calanderizedMeters.filter(cMeter => { return cMeter.meter.source == source });
        if (sourceMeters.length != 0) {
            let pastYearData: {
                yearData: Array<LastYearData>,
                energyUsage: number,
                energyCost: number,
                marketEmissions: number,
                locationEmissions: number
            } = getPastYearData(allMetersLastBill, sourceMeters);
            let yearPriorBill: Array<MonthlyData> = getYearPriorBillEntryFromCalanderizedMeterData(sourceMeters, allMetersLastBill);
            let lastBill: MonthlyData = getLastBillEntryFromCalanderizedMeterData(sourceMeters)
            if (lastBill) {
                let previousMonthData: LastYearData = _.maxBy(pastYearData.yearData, 'date');
                let totalEnergyUseFromLastYear: number = 0;
                let totalEnergyCostFromLastYear: number = 0;
                let totalMarketEmissionsFromLastYear: number = 0;
                let totalLocationEmissionsFromLastYear: number = 0;
                let totalConsumptionFromLastYear: number = 0;
                for (let i = 0; i < pastYearData.yearData.length; i++) {
                    totalEnergyUseFromLastYear += getSumValue(pastYearData.yearData[i].energyUse);
                    totalEnergyCostFromLastYear += getSumValue(pastYearData.yearData[i].energyCost);
                    totalMarketEmissionsFromLastYear += getSumValue(pastYearData.yearData[i].marketEmissions);
                    totalLocationEmissionsFromLastYear += getSumValue(pastYearData.yearData[i].locationEmissions);
                    totalConsumptionFromLastYear += getSumValue(pastYearData.yearData[i].energyConsumption);
                }
                let yearPriorEnergyCost: number = 0;
                let yearPriorEnergyUse: number = 0;
                let yearPriorMarketEmissions: number = 0;
                let yearPriorLocationEmissions: number = 0;
                let yearPriorConsumption: number = 0;
                for (let i = 0; i < yearPriorBill.length; i++) {
                    yearPriorEnergyCost += getSumValue(yearPriorBill[i].energyCost);
                    yearPriorEnergyUse += getSumValue(yearPriorBill[i].energyUse);
                    yearPriorMarketEmissions += getSumValue(yearPriorBill[i].marketEmissions);
                    yearPriorLocationEmissions += getSumValue(yearPriorBill[i].locationEmissions);
                    yearPriorConsumption += getSumValue(yearPriorBill[i].energyConsumption);
                }


                let previousMonthMarketEmissions: number = previousMonthData.marketEmissions;
                let marketEmissionsChangeSinceLastYear: number = previousMonthData.marketEmissions - yearPriorMarketEmissions;

                let previousMonthLocationEmissions: number = previousMonthData.locationEmissions;
                let locationEmissionsChangeSinceLastYear: number = previousMonthData.locationEmissions - yearPriorLocationEmissions;


                let previousMonthConsumption: number = previousMonthData.energyConsumption;
                let consumptionChangeSinceLastYear: number = previousMonthData.energyConsumption - yearPriorConsumption;
                utilitiesSummary.push({
                    lastBillDate: new Date(lastBill.date),
                    previousMonthEnergyUse: previousMonthData.energyUse,
                    previousMonthEnergyCost: previousMonthData.energyCost,
                    previousMonthConsumption: previousMonthConsumption,
                    previousMonthMarketEmissions: previousMonthMarketEmissions,
                    previousMonthLocationEmissions: previousMonthLocationEmissions,
                    averageEnergyUse: (totalEnergyUseFromLastYear / pastYearData.yearData.length),
                    averageEnergyCost: (totalEnergyCostFromLastYear / pastYearData.yearData.length),
                    averageConsumption: (totalConsumptionFromLastYear / pastYearData.yearData.length),
                    averageLocationEmissions: (totalLocationEmissionsFromLastYear / pastYearData.yearData.length),
                    averageMarketEmissions: (totalMarketEmissionsFromLastYear / pastYearData.yearData.length),
                    yearPriorEnergyCost: yearPriorEnergyCost,
                    yearPriorEnergyUse: yearPriorEnergyUse,
                    yearPriorConsumption: yearPriorConsumption,
                    yearPriorMarketEmissions: yearPriorMarketEmissions,
                    yearPriorLocationEmissions: yearPriorLocationEmissions,
                    energyCostChangeSinceLastYear: previousMonthData.energyCost - yearPriorEnergyCost,
                    energyUseChangeSinceLastYear: previousMonthData.energyUse - yearPriorEnergyUse,
                    locationEmissionsChangeSinceLastYear: locationEmissionsChangeSinceLastYear,
                    marketEmissionsChangeSinceLastYear: marketEmissionsChangeSinceLastYear,
                    consumptionChangeSinceLastYear: consumptionChangeSinceLastYear,
                    utility: source
                });
            }
        }
    });


    let previousMonthEnergyUse: number = 0;
    let previousMonthEnergyCost: number = 0;
    let previousMonthMarketEmissions: number = 0;
    let previousMonthLocationEmissions: number = 0;
    let previousMonthConsumption: number = 0;
    let yearPriorEnergyUse: number = 0;
    let yearPriorEnergyCost: number = 0;
    let yearPriorMarketEmissions: number = 0;
    let yearPriorLocationEmissions: number = 0;
    let yearPriorConsumption: number = 0;
    let averageEnergyUse: number = 0;
    let averageEnergyCost: number = 0;
    let averageLocationEmissions: number = 0;
    let averageMarketEmissions: number = 0;
    let averageConsumption: number = 0;
    for (let i = 0; i < utilitiesSummary.length; i++) {
        previousMonthEnergyUse += getSumValue(utilitiesSummary[i].previousMonthEnergyUse);
        previousMonthEnergyCost += getSumValue(utilitiesSummary[i].previousMonthEnergyCost);
        previousMonthMarketEmissions += getSumValue(utilitiesSummary[i].previousMonthMarketEmissions);
        previousMonthLocationEmissions += getSumValue(utilitiesSummary[i].previousMonthLocationEmissions);
        previousMonthConsumption += getSumValue(utilitiesSummary[i].previousMonthConsumption);
        yearPriorEnergyUse += getSumValue(utilitiesSummary[i].yearPriorEnergyUse);
        yearPriorEnergyCost += getSumValue(utilitiesSummary[i].yearPriorEnergyCost);
        yearPriorMarketEmissions += getSumValue(utilitiesSummary[i].yearPriorMarketEmissions);
        yearPriorLocationEmissions += getSumValue(utilitiesSummary[i].yearPriorLocationEmissions);
        yearPriorConsumption += getSumValue(utilitiesSummary[i].yearPriorConsumption);
        averageEnergyUse += getSumValue(utilitiesSummary[i].averageEnergyUse);
        averageEnergyCost += getSumValue(utilitiesSummary[i].averageEnergyCost);
        averageLocationEmissions += getSumValue(utilitiesSummary[i].averageLocationEmissions);
        averageMarketEmissions += getSumValue(utilitiesSummary[i].averageMarketEmissions);
        averageConsumption += getSumValue(utilitiesSummary[i].averageConsumption);
    }

    return {
        utilitySummaries: utilitiesSummary,
        total: {
            lastBillDate: _.maxBy(utilitiesSummary, 'lastBillDate'),
            previousMonthEnergyUse: previousMonthEnergyUse,
            previousMonthEnergyCost: previousMonthEnergyCost,
            previousMonthLocationEmissions: previousMonthLocationEmissions,
            previousMonthMarketEmissions: previousMonthMarketEmissions,
            previousMonthConsumption: previousMonthConsumption,
            averageEnergyUse: averageEnergyUse,
            averageEnergyCost: averageEnergyCost,
            averageLocationEmissions: averageLocationEmissions,
            averageMarketEmissions: averageMarketEmissions,
            averageConsumption: averageConsumption,
            yearPriorEnergyUse: yearPriorEnergyUse,
            yearPriorEnergyCost: yearPriorEnergyCost,
            yearPriorLocationEmissions: yearPriorLocationEmissions,
            yearPriorMarketEmissions: yearPriorMarketEmissions,
            yearPriorConsumption: yearPriorConsumption,
            energyCostChangeSinceLastYear: previousMonthEnergyCost - yearPriorEnergyCost,
            energyUseChangeSinceLastYear: previousMonthEnergyUse - yearPriorEnergyUse,
            locationEmissionsChangeSinceLastYear: previousMonthLocationEmissions - yearPriorLocationEmissions,
            marketEmissionsChangeSinceLastYear: previousMonthMarketEmissions - yearPriorMarketEmissions,
            consumptionChangeSinceLastYear: previousMonthConsumption - yearPriorConsumption,
            utility: 'Total'
        },
        allMetersLastBill: allMetersLastBill
    }
}

export function getYearlyUsageNumbers(calanderizedMeters: Array<CalanderizedMeter>, facilityOrAccount: IdbFacility | IdbAccount): Array<YearMonthData> {
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
    })
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

export interface LastYearDataResult {
    yearData: Array<LastYearData>,
    energyUsage: number,
    energyCost: number,
    marketEmissions: number,
    locationEmissions: number,
    consumption: number
}