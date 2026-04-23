import { CalanderizedMeter } from "src/app/models/calanderization";
import * as _ from 'lodash';
import { IdbUtilityMeterData } from "src/app/models/idbModels/utilityMeterData";

export class MeterStatusCheck {

    meterId: string;
    meterName: string;
    lastDateEntry: Date;
    hasDuplicateEntries: boolean;
    status: 'good' | 'warning' | 'error';
    constructor(calanderizedMeter: CalanderizedMeter, meterReadings: Array<IdbUtilityMeterData>) {
        this.meterId = calanderizedMeter.meter.guid;
        this.meterName = calanderizedMeter.meter.name;
        this.setLastDateEntry(meterReadings);
        this.setHasDuplicateEntries(meterReadings);
    }

    setLastDateEntry(meterReadings: Array<IdbUtilityMeterData>) {
        if (meterReadings && meterReadings.length > 0) {
            let lastEntry: IdbUtilityMeterData = _.maxBy(meterReadings, (data: IdbUtilityMeterData) => new Date(data.year, data.month - 1, data.day));
            this.lastDateEntry = new Date(lastEntry.year, lastEntry.month - 1, lastEntry.day);
        }
    }

    setHasDuplicateEntries(meterReadings: Array<IdbUtilityMeterData>) {
        let dayMonthYearCounts = {};
        meterReadings.forEach(reading => {
            let key = `${reading.month}-${reading.year}`;
            if (dayMonthYearCounts[key]) {
                dayMonthYearCounts[key] += 1;
            } else {
                dayMonthYearCounts[key] = 1;
            }
        });
        this.hasDuplicateEntries = _.some(dayMonthYearCounts, count => count > 1);
    }
}