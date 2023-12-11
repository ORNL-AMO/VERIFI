import { CalanderizationOptions, CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { IdbAccount, IdbFacility, IdbUtilityMeter, IdbUtilityMeterData } from "src/app/models/idb";
import { getIsEnergyMeter, getIsEnergyUnit } from "src/app/shared/sharedHelperFuntions";
import * as _ from 'lodash';
import { getFiscalYear } from "../shared-calculations/calanderizationFunctions";
import { Months } from "src/app/shared/form-data/months";
import { daysBetweenDates, getConsumptionUnit, getCurrentMonthsReadings, getNextMonthsBill, getPreviousMonthsBill, getUnitFromMeter } from "./calanderizationHelpers";
import { convertMeterData } from "../conversions/convertMeterData";


export function getCalanderizedMeterData(meters: Array<IdbUtilityMeter>, allMeterData: Array<IdbUtilityMeterData>, accountOrFacility: IdbAccount | IdbFacility, monthDisplayShort?: boolean, calanderizationOptions?: CalanderizationOptions): Array<CalanderizedMeter> {
    let calanderizedMeterData: Array<CalanderizedMeter> = new Array();
    meters.forEach(meter => {
        let energyIsSource: boolean = accountOrFacility.energyIsSource;
        let calanderizedenergyUnit: string = getConsumptionUnit(meter, accountOrFacility);
        let meterData: Array<IdbUtilityMeterData> = allMeterData.filter(meterData => { return meterData.meterId == meter.guid });
        let neededUnits: string;
        if (calanderizationOptions) {
            energyIsSource = calanderizationOptions.energyIsSource;
            neededUnits = calanderizationOptions.neededUnits;
        }
        let convertedMeterData: Array<IdbUtilityMeterData> = convertMeterData(meter, meterData, accountOrFacility, energyIsSource, neededUnits);


        let calanderizedMeter: Array<MonthlyData> = calanderizeMeterData(meter, convertedMeterData, energyIsSource, calanderizedenergyUnit, monthDisplayShort, accountOrFacility);
        let showConsumption: boolean;
        if (meter.source != 'Electricity') {
            showConsumption = calanderizedMeter.find(cMeter => { return cMeter.energyConsumption != cMeter.energyUse }) != undefined;
        }
        let consumptionUnit: string = getUnitFromMeter(meter, accountOrFacility);
        let showStandardEmissions: boolean = false;
        let showProcessEmissions: boolean = false;
        let showFugitiveEmissions: boolean = false;
        let showMobileEmissions: boolean = false;

        if (meter.source == "Electricity" || meter.source == "Natural Gas") {
            showStandardEmissions = true;
        } else if (meter.source == 'Other Fuels') {
            if (meter.scope == 2) {
                showMobileEmissions = true;
            } else {
                showStandardEmissions = true;
            }
        } else if (meter.source == 'Other') {
            if (meter.scope == 5) {
                showFugitiveEmissions = true;
            } else if (meter.scope == 6) {
                showProcessEmissions = true;
            }
        }

        let showEnergyUse: boolean;
        if (meter.source == 'Other') {
            showEnergyUse = getIsEnergyUnit(meter.startingUnit);
        } else {
            showEnergyUse = getIsEnergyMeter(meter.source);
        }

        calanderizedMeterData.push({
            consumptionUnit: consumptionUnit,
            meter: meter,
            monthlyData: calanderizedMeter,
            showConsumption: showConsumption,
            showEnergyUse: showEnergyUse,
            energyUnit: calanderizedenergyUnit,
            showStandardEmissions: showStandardEmissions,
            showFugitiveEmissions: showFugitiveEmissions,
            showMobileEmissions: showMobileEmissions,
            showProcessEmissions: showProcessEmissions
        });
    });
    return calanderizedMeterData;
}

function calanderizeMeterData(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, energyIsSource: boolean, calanderizedEnergyUnit: string, monthDisplayShort: boolean, accountOrFacility: IdbAccount | IdbFacility): Array<MonthlyData> {
    if (meter.meterReadingDataApplication == 'fullMonth' || !meter.meterReadingDataApplication) {
        //used as default
        return calanderizeMeterDataFullMonth(meter, meterData, energyIsSource, calanderizedEnergyUnit, monthDisplayShort, accountOrFacility);
    } else if (meter.meterReadingDataApplication == 'backward') {
        return calanderizeMeterDataBackwards(meter, meterData, energyIsSource, calanderizedEnergyUnit, monthDisplayShort, accountOrFacility);
    } else if (meter.meterReadingDataApplication == 'fullYear') {
        return calanderizeFullYear(meter, meterData, energyIsSource, calanderizedEnergyUnit, monthDisplayShort, accountOrFacility);
    }
}


//calanderize backwards
function calanderizeMeterDataBackwards(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, energyIsSource: boolean, calanderizedEnergyUnit: string, monthDisplayShort: boolean, accountOrFacility: IdbAccount | IdbFacility): Array<MonthlyData> {
    let calanderizeData: Array<MonthlyData> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });

    if (orderedMeterData.length > 3) {
        let startDate: Date = new Date(orderedMeterData[0].readDate);
        startDate.setUTCMonth(startDate.getUTCMonth() + 1);
        startDate.setUTCDate(1);
        let endDate: Date = new Date(orderedMeterData[orderedMeterData.length - 1].readDate);
        while (startDate.getUTCMonth() != endDate.getUTCMonth() || startDate.getUTCFullYear() != endDate.getUTCFullYear()) {

            let month: number = startDate.getUTCMonth();
            let year: number = startDate.getUTCFullYear();
            let previousMonthReading: IdbUtilityMeterData = getPreviousMonthsBill(month, year, orderedMeterData);
            let currentMonthsReadings: Array<IdbUtilityMeterData> = getCurrentMonthsReadings(month, year, orderedMeterData);
            let nextMonthsReading: IdbUtilityMeterData = getNextMonthsBill(month, year, orderedMeterData);


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
                    totals = getBillPeriodTotal(previousMonthReading, currentMonthReading, nextMonthsReading, meter);
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
                        }> = getBillPeriodTotal(previousMonthReading, currentMonthReading, nextReading, meter).readingSummaries;
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
                    let daysBetween: number = daysBetweenDates(previousBillDate, nextBillDate);
                    //find per day energy use
                    let energyUsePerDay: number = nextMonthsReading.totalEnergyUse / daysBetween;
                    let energyCostPerDay: number = nextMonthsReading.totalCost / daysBetween;
                    let volumePerDay: number = nextMonthsReading.totalVolume / daysBetween;
                    //find number of days in current month
                    let currentMonthDate1: Date = new Date(year, month);
                    let currentMonthDate2: Date = new Date(year, month + 1);
                    let daysInMonth: number = daysBetweenDates(currentMonthDate1, currentMonthDate2);
                    //multiply per day by number of days in current month
                    let energyUseForMonth: number = energyUsePerDay * daysInMonth;
                    let volumeForMonth: number = volumePerDay * daysInMonth;
                    totals.totalCost = energyCostPerDay * daysInMonth;
                    //energy use
                    let isEnergyMeter: boolean = getIsEnergyMeter(meter.source);
                    if (isEnergyMeter) {
                        totals.totalEnergyUse = energyUseForMonth;
                    }
                    //energy consumption (data input not as energy)
                    let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
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
            if (meter.includeInEnergy == false) {
                totals.totalEnergyUse = 0;
            }

            let readingType: 'mixed' | 'metered' | 'estimated';
            let allUsedReadings: Array<IdbUtilityMeterData> = [previousMonthReading];
            if (nextMonthsReading) {
                allUsedReadings.push(nextMonthsReading);
                currentMonthsReadings.forEach(reading => {
                    allUsedReadings.push(reading);
                });
            }

            let readingsEstimated: Array<boolean> = allUsedReadings.map(reading => { return reading.isEstimated });
            let uniqEstimated: Array<boolean> = _.uniq(readingsEstimated);
            if (uniqEstimated.length > 1) {
                readingType = 'mixed';
            } else if (uniqEstimated[0] == true) {
                readingType = 'estimated';
            } else {
                readingType = 'metered';
            }

            if (isNaN(totals.totalConsumption)) {
                totals.totalConsumption = 0;
            }
            if (isNaN(totals.totalEnergyUse)) {
                totals.totalEnergyUse = 0;
            }
            if (isNaN(totals.totalCost)) {
                totals.totalCost = 0;
            }
            calanderizeData.push({
                month: monthStr,
                monthNumValue: month,
                year: year,
                fiscalYear: getFiscalYear(new Date(year, month), accountOrFacility),
                energyConsumption: totals.totalConsumption,
                energyUse: totals.totalEnergyUse,
                energyCost: totals.totalCost,
                date: new Date(year, month),
                readingType: readingType,
                RECs: 0,
                locationElectricityEmissions: 0,
                marketElectricityEmissions: 0,
                otherScope2Emissions: 0,
                scope2LocationEmissions: 0,
                scope2MarketEmissions: 0,
                excessRECs: 0,
                excessRECsEmissions: 0,
                mobileCarbonEmissions: 0,
                mobileBiogenicEmissions: 0,
                mobileOtherEmissions: 0,
                mobileTotalEmissions: 0,
                fugitiveEmissions: 0,
                processEmissions: 0,
                stationaryEmissions: 0,
                totalScope1Emissions: 0,
                totalWithMarketEmissions: 0,
                totalWithLocationEmissions: 0,
            });
            startDate.setUTCMonth(startDate.getUTCMonth() + 1);
        }
    }
    return calanderizeData;
}

function getBillPeriodTotal(previousReading: IdbUtilityMeterData, currentReading: IdbUtilityMeterData, nextReading: IdbUtilityMeterData, meter: IdbUtilityMeter): {
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
    let daysFromPrevious: number = daysBetweenDates(previousReadingDate, currentDate);
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
    let daysFromNext: number = daysBetweenDates(currentDate, nextMonthsDate);
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
    let daysTillNext: number = daysBetweenDates(currentDate, nextMonthsDate);
    let energyUseForNext: number = energyUsePerDayNext * daysTillNext;
    let costForNext: number = (nextReading.totalCost / daysFromNext) * daysTillNext;
    let volumeForNext: number = volumePerDayNext * daysTillNext;
    //energy use
    let isEnergyMeter: boolean = getIsEnergyMeter(meter.source);
    if (isEnergyMeter) {
        totalEnergyUse = energyUseForCurrent + energyUseForNext;
    }
    //energy consumption (data input not as energy)
    let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
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

// //calanderize fullMonth
function calanderizeMeterDataFullMonth(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, energyIsSource: boolean, calanderizedEnergyUnit: string, monthDisplayShort: boolean, accountOrFacility: IdbAccount | IdbFacility): Array<MonthlyData> {
    let calanderizeData: Array<MonthlyData> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    if (orderedMeterData.length != 0) {
        let startDate: Date = new Date(orderedMeterData[0].readDate);
        startDate.setDate(15);
        let endDate: Date = new Date(orderedMeterData[orderedMeterData.length - 1].readDate);
        endDate.setUTCMonth(endDate.getUTCMonth() + 1);
        while (startDate.getUTCMonth() != endDate.getUTCMonth() || startDate.getUTCFullYear() != endDate.getUTCFullYear()) {
            let month: number = startDate.getUTCMonth();
            let year: number = startDate.getUTCFullYear();
            let currentMonthsReadings: Array<IdbUtilityMeterData> = getCurrentMonthsReadings(month, year, orderedMeterData);
            let readingSummaries: Array<{
                energyUse: number,
                energyConsumption: number,
                cost: number
            }> = new Array();
            currentMonthsReadings.forEach(reading => {
                let totalMonthEnergyUse: number = 0;
                let totalMonthEnergyConsumption: number = 0;
                let totalMonthCost: number = Number(reading.totalCost);
                //energy use
                let isEnergyMeter: boolean = getIsEnergyMeter(meter.source);
                if (isEnergyMeter) {
                    totalMonthEnergyUse = Number(reading.totalEnergyUse);
                }
                //energy consumption (data input not as energy)
                let isEnergyUnit: boolean = getIsEnergyUnit(meter.startingUnit);
                if (!isEnergyUnit) {
                    totalMonthEnergyConsumption = Number(reading.totalVolume);
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

            let readingType: 'mixed' | 'metered' | 'estimated';
            let readingsEstimated: Array<boolean> = currentMonthsReadings.map(reading => { return reading.isEstimated });
            let uniqEstimated: Array<boolean> = _.uniq(readingsEstimated);
            if (uniqEstimated.length > 1) {
                readingType = 'mixed';
            } else if (uniqEstimated[0] == true) {
                readingType = 'estimated';
            } else {
                readingType = 'metered';
            }
            calanderizeData.push({
                month: monthStr,
                monthNumValue: month,
                year: year,
                fiscalYear: getFiscalYear(new Date(year, month), accountOrFacility),
                energyConsumption: totalConsumption,
                energyUse: totalEnergyUse,
                energyCost: totalCost,
                date: new Date(year, month),
                readingType: readingType,
                RECs: 0,
                locationElectricityEmissions: 0,
                marketElectricityEmissions: 0,
                otherScope2Emissions: 0,
                scope2LocationEmissions: 0,
                scope2MarketEmissions: 0,
                excessRECs: 0,
                excessRECsEmissions: 0,
                mobileCarbonEmissions: 0,
                mobileBiogenicEmissions: 0,
                mobileOtherEmissions: 0,
                mobileTotalEmissions: 0,
                fugitiveEmissions: 0,
                processEmissions: 0,
                stationaryEmissions: 0,
                totalScope1Emissions: 0,
                totalWithMarketEmissions: 0,
                totalWithLocationEmissions: 0,
            });
            startDate.setUTCMonth(startDate.getUTCMonth() + 1);
        }
    }
    return calanderizeData;
}


function calanderizeFullYear(meter: IdbUtilityMeter, meterData: Array<IdbUtilityMeterData>, energyIsSource: boolean, calanderizedEnergyUnit: string, monthDisplayShort: boolean, accountOrFacility: IdbAccount | IdbFacility): Array<MonthlyData> {
    let calanderizeData: Array<MonthlyData> = new Array();
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data) => { return new Date(data.readDate) });
    let years: Array<number> = orderedMeterData.map(mData => { return new Date(mData.readDate).getFullYear() })
    years = _.uniq(years);
    years.forEach(year => {
        let currentYearData: Array<IdbUtilityMeterData> = orderedMeterData.filter(mData => {
            return new Date(mData.readDate).getFullYear() == year
        });

        let monthlyEnergyUse: number = _.sumBy(currentYearData, (yearData: IdbUtilityMeterData) => { return yearData.totalEnergyUse }) / 12;
        let monthlyCost: number = _.sumBy(currentYearData, (yearData: IdbUtilityMeterData) => { return yearData.totalCost }) / 12;
        let monthlyConsumption: number = _.sumBy(currentYearData, (yearData: IdbUtilityMeterData) => { return yearData.totalVolume }) / 12;
        if(isNaN(monthlyConsumption)){
            monthlyConsumption = 0;
        }
        let readingType: 'mixed' | 'metered' | 'estimated';
        let readingsEstimated: Array<boolean> = currentYearData.map(reading => { return reading.isEstimated });
        let uniqEstimated: Array<boolean> = _.uniq(readingsEstimated);
        if (uniqEstimated.length > 1) {
            readingType = 'mixed';
        } else if (uniqEstimated[0] == true) {
            readingType = 'estimated';
        } else {
            readingType = 'metered';
        }
        Months.forEach(month => {
            let monthStr: string;
            if (monthDisplayShort) {
                monthStr = new Date(year, month.monthNumValue).toLocaleString('default', { month: 'short' });
            } else {
                monthStr = new Date(year, month.monthNumValue).toLocaleString('default', { month: 'long' });
            }
            calanderizeData.push({
                month: monthStr,
                monthNumValue: month.monthNumValue,
                year: year,
                fiscalYear: getFiscalYear(new Date(year, month.monthNumValue), accountOrFacility),
                energyConsumption: monthlyConsumption,
                energyUse: monthlyEnergyUse,
                energyCost: monthlyCost,
                date: new Date(year, month.monthNumValue),
                readingType: readingType,
                RECs: 0,
                locationElectricityEmissions: 0,
                marketElectricityEmissions: 0,
                otherScope2Emissions: 0,
                scope2LocationEmissions: 0,
                scope2MarketEmissions: 0,
                excessRECs: 0,
                excessRECsEmissions: 0,
                mobileCarbonEmissions: 0,
                mobileBiogenicEmissions: 0,
                mobileOtherEmissions: 0,
                mobileTotalEmissions: 0,
                fugitiveEmissions: 0,
                processEmissions: 0,
                stationaryEmissions: 0,
                totalScope1Emissions: 0,
                totalWithMarketEmissions: 0,
                totalWithLocationEmissions: 0,
            });
        });
    });
    return calanderizeData;
}
