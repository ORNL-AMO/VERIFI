
import { getIsEnergyMeter, getIsEnergyUnit } from "src/app/shared/sharedHelperFunctions";
import * as _ from 'lodash';
import { FuelTypeOption } from "src/app/shared/fuel-options/fuelTypeOption";
import { StationaryOtherEnergyOptions } from "src/app/shared/fuel-options/stationaryOtherEnergyOptions";
import { IdbAccount } from "src/app/models/idbModels/account";
import { IdbFacility } from "src/app/models/idbModels/facility";
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";
import { IdbUtilityMeter } from "src/app/models/idbModels/utilityMeter";
import { getDateFromMeterData, getLatestMeterData } from "src/app/shared/dateHelperFunctions";

export function getPreviousMonthsBill(month: number, year: number, meterReadings: Array<IdbUtilityMeterData>): IdbUtilityMeterData {
    //set to the 5th to not conflict
    let previousMonth: Date = new Date();
    previousMonth.setFullYear(year, month - 1, 5);
    let previousMonthReadings: Array<IdbUtilityMeterData> = getCurrentMonthsReadings(previousMonth.getMonth(), previousMonth.getFullYear(), meterReadings);
    if (previousMonthReadings.length == 0) {
        return getPreviousMonthsBill(previousMonth.getMonth(), previousMonth.getFullYear(), meterReadings);
    } else if (previousMonthReadings.length == 1) {
        return previousMonthReadings[0]
    } else {
        let latestReading: IdbUtilityMeterData = getLatestMeterData(meterReadings);
        return latestReading;
    }
}

export function getCurrentMonthsReadings(month: number, year: number, meterReadings: Array<IdbUtilityMeterData>): Array<IdbUtilityMeterData> {
    let currentMonthReadings: Array<IdbUtilityMeterData> = _.filter(meterReadings, (reading: IdbUtilityMeterData) => {
        return (month == reading.month - 1 && year == reading.year);
    });
    return _.orderBy(currentMonthReadings, (data: IdbUtilityMeterData) => { return getDateFromMeterData(data) });
}

export function getNextMonthsBill(month: number, year: number, meterReadings: Array<IdbUtilityMeterData>): IdbUtilityMeterData {
    let nextMonth: Date = new Date();
    nextMonth.setFullYear(year, month + 1, 5);
    let nextMonthReadings: Array<IdbUtilityMeterData> = getCurrentMonthsReadings(nextMonth.getMonth(), nextMonth.getFullYear(), meterReadings);
    if (nextMonthReadings.length == 0) {
        return getNextMonthsBill(nextMonth.getMonth(), nextMonth.getFullYear(), meterReadings);
    } else if (nextMonthReadings.length == 1) {
        return nextMonthReadings[0]
    } else {
        let latestReading: IdbUtilityMeterData = _.minBy(nextMonthReadings, (reading: IdbUtilityMeterData) => { return getDateFromMeterData(reading) });
        return latestReading;
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
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate());
    const utc2 = Date.UTC(secondDate.getFullYear(), secondDate.getMonth(), secondDate.getDate());
    return Math.round((utc2 - utc1) / _MS_PER_DAY);
}