
import { getIsEnergyMeter, getIsEnergyUnit } from "src/app/shared/sharedHelperFunctions";
import * as _ from 'lodash';
import { FuelTypeOption } from "src/app/shared/fuel-options/fuelTypeOption";
import { StationaryOtherEnergyOptions } from "src/app/shared/fuel-options/stationaryOtherEnergyOptions";
import { IdbAccount } from "src/app/models/idbModels/account";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { getDateFromMeterData, getEarliestMeterData, getLatestMeterData, getLatestMeterDataDate } from "src/app/shared/dateHelperFunctions";
import { CalanderizedMeter, MonthlyData } from "src/app/models/calanderization";
import { ConvertValue } from "../conversions/convertValue";

export function getPreviousMonthsBill(month: number, year: number, meterReadings: Array<IdbUtilityMeterData>): IdbUtilityMeterData {
    let earliestReading: IdbUtilityMeterData = getEarliestMeterData(meterReadings);
    let earliestReadingDate: Date = getDateFromMeterData(earliestReading);
    let prevMonth: number = month === 0 ? 11 : month - 1;
    let prevYear: number = month === 0 ? year - 1 : year;
    let prevMonthDate: Date = new Date(prevYear, prevMonth, 1);
    if (earliestReadingDate && prevMonthDate > earliestReadingDate) {
        let previousMonthReadings: Array<IdbUtilityMeterData> = getCurrentMonthsReadings(prevMonth, prevYear, meterReadings);
        if (previousMonthReadings.length == 0) {
            return getPreviousMonthsBill(prevMonth, prevYear, meterReadings);
        } else if (previousMonthReadings.length == 1) {
            return previousMonthReadings[0]
        } else {
            let latestReading: IdbUtilityMeterData = getLatestMeterData(previousMonthReadings);
            return latestReading;
        }
    } else {
        return earliestReading;
    }
}

export function getCurrentMonthsReadings(month: number, year: number, meterReadings: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    let currentMonthReadings: Array<IdbUtilityMeterData> = _.filter(meterReadings, (reading: IdbUtilityMeterData) => {
        return (month == reading.month - 1 && year == reading.year);
    });
    return _.orderBy(currentMonthReadings, (data: IdbUtilityMeterData) => { return getDateFromMeterData(data).getTime() });
}

export function getNextMonthsBill(month: number, year: number, meterReadings: Array<IdbUtilityMeterData>): IdbUtilityMeterData {
    let lastReading: IdbUtilityMeterData = getLatestMeterData(meterReadings);
    let lastReadingDate: Date = getDateFromMeterData(lastReading);
    let nextMonthNum: number = month === 11 ? 0 : month + 1;
    let nextYear: number = month === 11 ? year + 1 : year;
    let nextMonthDate: Date = new Date(nextYear, nextMonthNum, 1);
    if (lastReadingDate && nextMonthDate < lastReadingDate) {
        let nextMonthReadings: Array<IdbUtilityMeterData> = getCurrentMonthsReadings(nextMonthNum, nextYear, meterReadings);
        if (nextMonthReadings.length == 0) {
            return getNextMonthsBill(nextMonthNum, nextYear, meterReadings);
        } else if (nextMonthReadings.length == 1) {
            return nextMonthReadings[0]
        } else {
            let latestReading: IdbUtilityMeterData = getLatestMeterData(nextMonthReadings);
            return latestReading;
        }
    } else {
        return lastReading;
    }
}


export function getConsumptionUnit(meter: IdbUtilityMeter, accountOrFacility: IdbAccount | IdbFacility): string {
    if (accountOrFacility) {
        let isEnergyMeter: boolean;
        if (meter.source == 'Other') {
            isEnergyMeter = getIsEnergyUnit(meter.startingUnit);
        } else {
            isEnergyMeter = getIsEnergyMeter(meter.source);
        }
        //use meter unit 
        if (isEnergyMeter) {
            return accountOrFacility.energyUnit;
        } else {
            return getUnitFromMeter(meter, accountOrFacility);
        }
    } else {
        return;
    }
}

export function getUnitFromMeter(accountMeter: IdbUtilityMeter, accountOrFacility: IdbAccount | IdbFacility): string {
    if (accountMeter.source == 'Electricity' || (getIsEnergyUnit(accountMeter.startingUnit) && accountMeter.scope != 2)) {
        return accountOrFacility.energyUnit;
    } else if (accountMeter.source == 'Natural Gas') {
        return accountOrFacility.volumeGasUnit;
    } else if (accountMeter.source == 'Other Fuels') {
        if (accountMeter.scope != 2) {
            if (accountMeter.phase == 'Gas') {
                return accountOrFacility.volumeGasUnit;
            } else if (accountMeter.phase == 'Liquid') {
                return accountOrFacility.volumeLiquidUnit;
            } else if (accountMeter.phase == 'Solid') {
                return accountOrFacility.massUnit;
            }
        } else {
            //Fuel Usage
            if (accountMeter.vehicleCollectionType == 1) {
                return accountOrFacility.volumeLiquidUnit;
            } else {
                return accountMeter.vehicleDistanceUnit;
            }
        }
    } else if (accountMeter.source == 'Water Intake' || accountMeter.source == 'Water Discharge') {
        return accountOrFacility.volumeLiquidUnit;
    } else if (accountMeter.source == 'Other Energy') {
        let selectedEnergyOption: FuelTypeOption = StationaryOtherEnergyOptions.find(option => { return option.value == accountMeter.fuel });
        if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Steam') {
            return accountOrFacility.massUnit;
        } else if (selectedEnergyOption.otherEnergyType && (selectedEnergyOption.otherEnergyType == 'Chilled Water' || selectedEnergyOption.otherEnergyType == 'Hot Water')) {
            return accountOrFacility.energyUnit;
        } else if (selectedEnergyOption.otherEnergyType && selectedEnergyOption.otherEnergyType == 'Compressed Air') {
            return accountOrFacility.volumeGasUnit;
        }
    } else if (accountMeter.source == 'Other') {
        return accountMeter.startingUnit;
    }
}
export function daysBetweenDates(firstDate: Date, secondDate: Date) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time information, use local time (midnight)
    const local1 = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
    const local2 = new Date(secondDate.getFullYear(), secondDate.getMonth(), secondDate.getDate());
    return Math.round((local2.getTime() - local1.getTime()) / _MS_PER_DAY);
}

export function getMonthsArray(meterData: Array<IdbUtilityMeterData>): Array<{ month: number, year: number }> {
    let orderedMeterData: Array<IdbUtilityMeterData> = _.orderBy(meterData, (data: IdbUtilityMeterData) => { return getDateFromMeterData(data).getTime() });
    let yearMonths: Array<{ year: number, month: number }> = orderedMeterData.map(reading => { return { year: reading.year, month: reading.month - 1 } });
    //unique year months
    let uniqYearMonths: Array<{ year: number, month: number }> = _.uniqWith(yearMonths, _.isEqual);
    //fill missing months
    uniqYearMonths.forEach((yearMonth, index) => {
        if (index > 0) {
            let previousYearMonth = uniqYearMonths[index - 1];
            let currentYearMonth = yearMonth;
            //check if there are missing months between previous and current
            let monthsBetween = (currentYearMonth.year - previousYearMonth.year) * 12 + (currentYearMonth.month - previousYearMonth.month);
            if (monthsBetween > 1) {
                //add missing months to uniqYearMonths
                for (let i = 1; i < monthsBetween; i++) {
                    let missingMonth = (previousYearMonth.month + i) % 12;
                    let missingYear = previousYearMonth.year + Math.floor((previousYearMonth.month + i) / 12);
                    uniqYearMonths.splice(index, 0, { year: missingYear, month: missingMonth });
                }
            }
        };
    });
    return uniqYearMonths;
}

export function convertMeterDataToSite(calanderizedMeterData: Array<CalanderizedMeter>, neededUnits: string): Array<CalanderizedMeter> {
    let convertedData: Array<CalanderizedMeter> = new Array();
    calanderizedMeterData.forEach(cMeter => {
        let cMeterCopy: CalanderizedMeter = _.cloneDeep(cMeter);
        if (cMeterCopy.energyIsSource) {
            cMeterCopy.monthlyData.forEach(monthData => {
                monthData.energyUse = monthData.energyUse / cMeterCopy.meter.siteToSource;
                return monthData;
            });
            cMeterCopy.energyIsSource = false;
        }

        if (cMeterCopy.energyUnit != neededUnits) {
            cMeterCopy.monthlyData.forEach(monthData => {
                monthData.energyUse = new ConvertValue(monthData.energyUse, cMeterCopy.energyUnit, neededUnits).convertedValue;
                return monthData;
            });
            cMeterCopy.energyUnit = neededUnits;
        }
        convertedData.push(cMeterCopy);
    });
    return convertedData;
}